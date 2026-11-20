//! Scoring shared by the eventual Rust client and server. Only the server
//! will be allowed to award tournament points.

pub const DAILY_LIMIT: usize = 5;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Kind {
    Translate,
    Context,
    Riddle,
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
