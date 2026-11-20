use std::sync::OnceLock;

use super::{deal, known, shuffle};
use crate::{
    content::{optional, rows},
    lexicon::UPPER_ALPHABET,
    Level,
};

pub const WORDS_PER_ROUND: usize = 5;

#[derive(Debug, Eq, PartialEq)]
pub struct Card {
    pub word: &'static str,
    pub clue: &'static str,
    pub art: Option<&'static str>,
}

pub fn deck(level: Level) -> &'static [Card] {
    static BANKS: [OnceLock<Vec<Card>>; 3] = [const { OnceLock::new() }; 3];
    let (min, max) = [(3, 5), (4, 8), (7, 14)][level.index()];
    BANKS[level.index()].get_or_init(|| {
        rows(include_str!("../../content/letters.tsv"))
            .filter(|[word, _, _]| (min..=max).contains(&word.chars().count()))
            .map(|[word, clue, art]| Card {
                word,
                clue,
                art: optional(art),
            })
            .collect()
    })
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Catch {
    Letter(char),
    Word(&'static Card),
    Wrong,
    Timeout,
}

pub struct Round {
    level: Level,
    words: Vec<&'static Card>,
    seen: Vec<&'static str>,
    position: usize,
    solved: usize,
    lives: u8,
    lanes: Vec<char>,
}

impl Round {
    pub fn new(level: Level, history: &[&str], draw: &mut impl FnMut(usize) -> usize) -> Self {
        let mut round = Self {
            level,
            words: Vec::new(),
            seen: known(history, deck(level), |item| item.word),
            position: 0,
            solved: 0,
            lives: [5, 3, 2][level.index()],
            lanes: Vec::new(),
        };
        round.deal_word(draw);
        round
    }

    pub fn word(&self) -> &'static Card {
        self.words
            .last()
            .copied()
            .expect("at least one word is dealt")
    }

    pub fn letter(&self) -> Option<char> {
        (!self.finished()).then(|| {
            self.word()
                .word
                .chars()
                .nth(self.position)
                .expect("valid position")
        })
    }

    pub fn lanes(&self) -> &[char] {
        &self.lanes
    }

    pub fn position(&self) -> usize {
        self.position
    }

    pub fn solved(&self) -> usize {
        self.solved
    }

    pub fn lives(&self) -> u8 {
        self.lives
    }

    pub fn seen(&self) -> &[&'static str] {
        &self.seen
    }

    pub fn finished(&self) -> bool {
        self.lives == 0 || self.solved == WORDS_PER_ROUND
    }

    pub fn duration_ms(&self) -> u32 {
        let (duration, step) = [(6200, 350), (4300, 260), (3600, 250)][self.level.index()];
        duration - self.solved as u32 * step
    }

    /// A missing lane means the period expired; an out-of-range lane is ignored.
    pub fn catch(
        &mut self,
        lane: Option<usize>,
        draw: &mut impl FnMut(usize) -> usize,
    ) -> Option<Catch> {
        let letter = self.letter()?;
        let caught = match lane {
            Some(index) => Some(*self.lanes.get(index)?),
            None => None,
        };
        if caught != Some(letter) {
            self.lives -= 1;
            if !self.finished() {
                self.deal_letters(draw);
            }
            return Some(if lane.is_none() {
                Catch::Timeout
            } else {
                Catch::Wrong
            });
        }
        let word = self.word();
        if self.position + 1 < word.word.chars().count() {
            self.position += 1;
            self.deal_letters(draw);
            Some(Catch::Letter(letter))
        } else {
            self.solved += 1;
            self.position = 0;
            if !self.finished() {
                self.deal_word(draw);
            }
            Some(Catch::Word(word))
        }
    }

    fn deal_word(&mut self, draw: &mut impl FnMut(usize) -> usize) {
        let next = deal(
            deck(self.level),
            &mut self.seen,
            self.words.iter().map(|item| item.word),
            |item| item.word,
            |_| true,
            draw,
        );
        self.words.push(next);
        self.deal_letters(draw);
    }

    fn deal_letters(&mut self, draw: &mut impl FnMut(usize) -> usize) {
        let word = self.word().word;
        let letter = self.letter().expect("deal only during play");
        let mut candidates: Vec<_> = UPPER_ALPHABET
            .iter()
            .copied()
            .filter(|&ch| !word.contains(ch))
            .collect();
        shuffle(&mut candidates, draw);
        let distractors = [1, 2, 3][self.level.index()];
        self.lanes = std::iter::once(letter)
            .chain(candidates.into_iter().take(distractors))
            .collect();
        shuffle(&mut self.lanes, draw);
    }
}
