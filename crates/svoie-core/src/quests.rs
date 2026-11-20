//! Daily quest schedule and scoring. Only the server is allowed to award
//! tournament points; hosts supply the timestamp and completion history.

use std::{collections::HashSet, sync::OnceLock};

pub use jiff::civil::Date;
use jiff::{tz::TimeZone, SignedDuration, Timestamp};

use crate::content::{optional, rows};

pub const DAILY_LIMIT: usize = 5;
pub const KYIV: &str = "Europe/Kyiv";

pub fn day_at(unix_ms: i64) -> Result<Date, jiff::Error> {
    static ZONE: OnceLock<TimeZone> = OnceLock::new();
    let tz = ZONE.get_or_init(|| TimeZone::get(KYIV).expect("bundled IANA Europe/Kyiv timezone"));
    Ok(Timestamp::from_millisecond(unix_ms)?
        .to_zoned(tz.clone())
        .date())
}

pub fn shift_day(day: Date, days: i32) -> Result<Date, jiff::Error> {
    day.checked_add(SignedDuration::from_hours(i64::from(days) * 24))
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Kind {
    Translate,
    Context,
    Riddle,
}

impl Kind {
    pub const fn id(self) -> &'static str {
        match self {
            Self::Translate => "translate",
            Self::Context => "context",
            Self::Riddle => "riddle",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Question {
    pub id: &'static str,
    pub kind: Kind,
    pub clue: Option<&'static str>,
    pub prompt: &'static str,
    pub choices: [&'static str; 4],
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Quest {
    pub question: Question,
    pub correct: &'static str,
    pub explanation: &'static str,
}

struct Bank {
    pack_count: i32,
    translations: Vec<Quest>,
    contexts: Vec<Quest>,
    riddles: Vec<Quest>,
}

fn bank() -> &'static Bank {
    static BANK: OnceLock<Bank> = OnceLock::new();
    BANK.get_or_init(|| {
        let mut bank = Bank {
            pack_count: 0,
            translations: Vec::new(),
            contexts: Vec::new(),
            riddles: Vec::new(),
        };
        for [id, kind, clue, prompt, correct, explanation, a, b, c] in
            rows(include_str!("../content/quests.tsv"))
        {
            let (kind, group) = match kind {
                "translate" => (Kind::Translate, &mut bank.translations),
                "context" => (Kind::Context, &mut bank.contexts),
                "riddle" => (Kind::Riddle, &mut bank.riddles),
                _ => panic!("invalid quest kind"),
            };
            group.push(Quest {
                question: Question {
                    id,
                    kind,
                    clue: optional(clue),
                    prompt,
                    choices: [correct, a, b, c],
                },
                correct,
                explanation,
            });
        }
        bank.pack_count = i32::try_from(bank.contexts.len()).expect("pack count");
        assert!(
            bank.pack_count > 0
                && bank.translations.len() == bank.contexts.len() * 2
                && bank.riddles.len() == bank.translations.len(),
            "invalid daily packs"
        );
        bank
    })
}

fn hash(seed: u32, value: &str) -> u32 {
    // Hash code points, not UTF-8 bytes, as the installed client does.
    value.chars().fold(seed, |hash, ch| {
        (hash ^ u32::from(ch)).wrapping_mul(16_777_619)
    })
}

/// Return the same five cards and answer order as the installed app. A host
/// serving a live quest sends `quest.question`, not the whole `Quest`.
pub fn deck_for(date: Date) -> [Quest; DAILY_LIMIT] {
    const EPOCH: Date = Date::constant(2026, 1, 1);
    let distance = date
        .since(EPOCH)
        .expect("difference between valid dates")
        .get_days();
    let bank = bank();
    let cycle = distance.div_euclid(bank.pack_count);
    let pick = |group: &[Quest], index: i32| group[index.rem_euclid(group.len() as i32) as usize];
    [
        pick(&bank.translations, distance * 2),
        pick(&bank.contexts, distance + cycle),
        pick(&bank.riddles, distance * 2 + cycle * 3),
        pick(&bank.translations, distance * 2 + 1),
        pick(&bank.riddles, distance * 2 + cycle * 3 + 1),
    ]
    .map(|mut entry| {
        let seed = hash(2_166_136_261, &format!("{date}/{}/", entry.question.id));
        entry
            .question
            .choices
            .sort_by_key(|choice| hash(seed, choice));
        entry
    })
}

pub fn streak_ending(day: Date, completed: &HashSet<Date>) -> usize {
    let mut count = 0;
    let mut current = day;
    while completed.contains(&current) {
        count += 1;
        let Ok(previous) = current.yesterday() else {
            break;
        };
        current = previous;
    }
    count
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Score {
    pub correct: bool,
    pub speed: u8,
    pub bonus: u8,
    pub points: u16,
}

pub fn score(kind: Kind, expected: &str, choice: &str, elapsed_ms: u64, bonus: u8) -> Score {
    let correct = choice == expected;
    let speed = if correct && kind == Kind::Riddle {
        match elapsed_ms {
            0..=8_000 => 5,
            8_001..=15_000 => 3,
            _ => 0,
        }
    } else {
        0
    };
    Score {
        correct,
        speed,
        bonus,
        points: (if correct { 20 } else { 0 }) + u16::from(speed) + u16::from(bonus),
    }
}

pub fn streak_bonus(days: usize) -> u8 {
    days.min(7) as u8 * 5
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kyiv_midnight_uses_iana_offsets_not_the_hosts_local_zone() {
        for (instant, date) in [
            ("2026-03-28T21:59:59.999Z", "2026-03-28"),
            ("2026-03-28T22:00:00Z", "2026-03-29"),
            ("2026-03-29T21:00:00Z", "2026-03-30"),
            ("2026-10-24T21:00:00Z", "2026-10-25"),
            ("2026-10-25T21:00:00Z", "2026-10-25"),
            ("2026-10-25T22:00:00Z", "2026-10-26"),
            ("2026-11-24T21:59:59.999Z", "2026-11-24"),
            ("2026-11-24T22:00:00Z", "2026-11-25"),
        ] {
            let time: Timestamp = instant.parse().unwrap();
            assert_eq!(day_at(time.as_millisecond()).unwrap().to_string(), date);
        }
        assert!(day_at(i64::MAX).is_err());
    }

    #[test]
    fn streaks_cross_months_leap_days_and_years_without_skipping_dates() {
        let done = HashSet::from([
            Date::constant(2024, 2, 27),
            Date::constant(2024, 2, 29),
            Date::constant(2024, 3, 1),
            Date::constant(2023, 12, 31),
            Date::constant(2024, 1, 1),
        ]);
        assert_eq!(streak_ending(Date::constant(2024, 3, 1), &done), 2);
        assert_eq!(streak_ending(Date::constant(2024, 1, 1), &done), 2);
        assert_eq!(streak_ending(Date::constant(2024, 1, 2), &done), 0);
        assert_eq!(
            shift_day(Date::constant(2024, 3, 1), -1).unwrap(),
            Date::constant(2024, 2, 29)
        );
    }

    #[test]
    fn every_day_keeps_five_distinct_slots_and_contains_each_answer_once() {
        let mut day = Date::constant(2025, 11, 1);
        for _ in 0..500 {
            let deck = deck_for(day);
            let kinds = deck.map(|quest| quest.question.kind);
            assert_eq!(
                kinds,
                [
                    Kind::Translate,
                    Kind::Context,
                    Kind::Riddle,
                    Kind::Translate,
                    Kind::Riddle
                ]
            );
            assert_eq!(
                deck.iter()
                    .map(|q| q.question.id)
                    .collect::<HashSet<_>>()
                    .len(),
                DAILY_LIMIT
            );
            for entry in deck {
                assert_eq!(
                    entry
                        .question
                        .choices
                        .iter()
                        .filter(|&&choice| choice == entry.correct)
                        .count(),
                    1
                );
                assert_eq!(
                    entry.question.clue.is_some(),
                    entry.question.kind == Kind::Riddle
                );
            }
            day = shift_day(day, 1).unwrap();
        }
    }

    #[test]
    fn riddle_boundaries_are_inclusive_and_other_kinds_have_no_speed_bonus() {
        for (t, speed) in [(0, 5), (8000, 5), (8001, 3), (15000, 3), (15001, 0)] {
            assert_eq!(score(Kind::Riddle, "кіт", "кіт", t, 0).speed, speed);
            assert_eq!(
                score(Kind::Riddle, "кіт", "кіт", t, 0).points,
                20 + u16::from(speed)
            );
            assert_eq!(score(Kind::Context, "кіт", "кіт", t, 0).points, 20);
            assert_eq!(score(Kind::Translate, "кіт", "кіт", t, 0).points, 20);
        }
    }

    #[test]
    fn applies_the_same_streak_bonus_and_caps_it_at_35() {
        assert_eq!(DAILY_LIMIT, 5);
        for (days, bonus) in [(0, 0), (1, 5), (7, 35), (90, 35)] {
            assert_eq!(streak_bonus(days), bonus);
            assert_eq!(
                score(Kind::Riddle, "обрій", "світанок", 0, bonus).points,
                u16::from(bonus)
            );
            assert_eq!(
                score(Kind::Riddle, "обрій", "обрій", 0, bonus).points,
                25 + u16::from(bonus)
            );
        }
    }
}
