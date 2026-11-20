use std::{
    collections::{HashMap, HashSet},
    sync::OnceLock,
};

use super::{prefer, unique};
use crate::{content::rows, Level};

pub const ROUND_SIZE: usize = 10;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Language {
    Ua,
    Ru,
}

impl Language {
    pub const fn id(self) -> &'static str {
        match self {
            Self::Ua => "ua",
            Self::Ru => "ru",
        }
    }

    pub const fn other(self) -> Self {
        match self {
            Self::Ua => Self::Ru,
            Self::Ru => Self::Ua,
        }
    }
}

#[derive(Debug)]
pub struct Card {
    pub word: &'static str,
    pub language: Language,
    pub hint: &'static str,
    concept: &'static str,
}

struct Bank {
    cards: Vec<Card>,
    indices: HashMap<&'static str, usize>,
}

fn bank(level: Level) -> &'static Bank {
    static BANKS: [OnceLock<Bank>; 3] = [const { OnceLock::new() }; 3];
    const DATA: [&str; 3] = [
        include_str!("../../content/side-easy.tsv"),
        include_str!("../../content/side-normal.tsv"),
        include_str!("../../content/side-hard.tsv"),
    ];
    BANKS[level.index()].get_or_init(|| {
        let cards: Vec<_> = rows(DATA[level.index()])
            .map(|[word, lang, hint, concept]| Card {
                word,
                language: match lang {
                    "ua" => Language::Ua,
                    "ru" => Language::Ru,
                    _ => panic!("invalid side language"),
                },
                hint,
                concept,
            })
            .collect();
        let indices = cards
            .iter()
            .enumerate()
            .map(|(i, card)| (card.word, i))
            .collect();
        Bank { cards, indices }
    })
}

pub fn deck(level: Level) -> &'static [Card] {
    &bank(level).cards
}

pub fn duration_ms(level: Level, index: usize) -> u32 {
    let (duration, step) = [(9000, 300), (6500, 360), (5400, 330)][level.index()];
    duration - index.min(8) as u32 * step
}

#[derive(Debug, Default, Eq, PartialEq)]
pub struct Rotation {
    pub seen: Vec<&'static str>,
    pub recent: Vec<&'static str>,
}

pub fn next_card(
    level: Level,
    seen: &[&str],
    recent: &[&str],
    draw: &mut impl FnMut(usize) -> usize,
) -> (&'static Card, Rotation) {
    let bank = bank(level);
    let lookup = |word: &&str| bank.indices.get(*word).map(|&i| bank.cards[i].word);
    let mut rotation = Rotation {
        seen: unique(seen.iter().filter_map(lookup)),
        recent: recent.iter().filter_map(lookup).collect(),
    };
    if rotation.seen.len() == bank.cards.len() {
        rotation.seen.clear();
    }
    let keep = rotation.recent.len().saturating_sub(20);
    rotation.recent.drain(..keep);

    let seen: HashSet<_> = rotation.seen.iter().copied().collect();
    let mut pool: Vec<_> = bank
        .cards
        .iter()
        .filter(|card| !seen.contains(card.word))
        .collect();
    prefer(&mut pool, |card| !rotation.recent.contains(&card.word));

    let partial = rotation.seen.len() % ROUND_SIZE;
    let ua = rotation
        .seen
        .iter()
        .rev()
        .take(partial)
        .filter(|word| bank.cards[bank.indices[**word]].language == Language::Ua)
        .count();
    let language = if ua >= ROUND_SIZE / 2 {
        Some(Language::Ru)
    } else if partial - ua >= ROUND_SIZE / 2 {
        Some(Language::Ua)
    } else {
        None
    };
    if let Some(lang) = language {
        prefer(&mut pool, |card| card.language == lang);
    }

    let explained: HashSet<_> = rotation
        .recent
        .iter()
        .rev()
        .take(5)
        .map(|word| bank.cards[bank.indices[*word]].concept)
        .collect();
    prefer(&mut pool, |card| !explained.contains(card.concept));
    let card = pool[draw(pool.len())];
    rotation.seen.push(card.word);
    if rotation.recent.len() == 20 {
        rotation.recent.remove(0);
    }
    rotation.recent.push(card.word);
    (card, rotation)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ResultKind {
    Correct,
    Wrong,
    Timeout,
}

#[derive(Debug)]
pub struct Attempt {
    pub card: &'static Card,
    pub result: ResultKind,
}

pub struct Round {
    level: Level,
    card: Option<&'static Card>,
    rotation: Rotation,
    attempts: Vec<Attempt>,
    score: usize,
    lives: u8,
}

impl Round {
    pub fn new(
        level: Level,
        seen: &[&str],
        recent: &[&str],
        draw: &mut impl FnMut(usize) -> usize,
    ) -> Self {
        let (card, rotation) = next_card(level, seen, recent, draw);
        Self {
            level,
            card: Some(card),
            rotation,
            attempts: Vec::new(),
            score: 0,
            lives: [5, 3, 2][level.index()],
        }
    }

    pub fn card(&self) -> Option<&'static Card> {
        self.card
    }

    pub fn rotation(&self) -> &Rotation {
        &self.rotation
    }

    pub fn attempts(&self) -> &[Attempt] {
        &self.attempts
    }

    pub fn score(&self) -> usize {
        self.score
    }

    pub fn lives(&self) -> u8 {
        self.lives
    }

    pub fn duration_ms(&self) -> Option<u32> {
        self.card
            .map(|_| duration_ms(self.level, self.attempts.len()))
    }

    /// `None` represents a timeout. No additional card is dealt on the last turn.
    pub fn pick(
        &mut self,
        choice: Option<Language>,
        draw: &mut impl FnMut(usize) -> usize,
    ) -> Option<ResultKind> {
        let card = self.card.take()?;
        let result = match choice {
            Some(lang) if lang == card.language => ResultKind::Correct,
            Some(_) => ResultKind::Wrong,
            None => ResultKind::Timeout,
        };
        if result == ResultKind::Correct {
            self.score += 1;
        } else {
            self.lives -= 1;
        }
        self.attempts.push(Attempt { card, result });
        if self.lives > 0 && self.attempts.len() < ROUND_SIZE {
            let (next, rotation) =
                next_card(self.level, &self.rotation.seen, &self.rotation.recent, draw);
            self.card = Some(next);
            self.rotation = rotation;
        }
        Some(result)
    }
}
