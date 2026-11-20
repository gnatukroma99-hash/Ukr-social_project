use std::{
    collections::{BTreeMap, HashMap, HashSet},
    sync::OnceLock,
};

use crate::{
    lexicon::{known_word, typed_letter},
    Level,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub enum Mark {
    Absent,
    Present,
    Exact,
}

impl Mark {
    pub const fn id(self) -> &'static str {
        match self {
            Self::Absent => "absent",
            Self::Present => "present",
            Self::Exact => "exact",
        }
    }
}

pub fn marks_for(guess: &str, target: &str) -> Vec<Mark> {
    let guess: Vec<_> = guess.chars().collect();
    let mut marks = vec![Mark::Absent; guess.len()];
    let mut available = HashMap::<_, usize>::new();

    // Spend letters on exact matches first, then on displaced characters.
    for (i, ch) in target.chars().enumerate() {
        if guess.get(i) == Some(&ch) {
            marks[i] = Mark::Exact;
        } else {
            *available.entry(ch).or_default() += 1;
        }
    }
    for (ch, mark) in guess.into_iter().zip(&mut marks) {
        if *mark != Mark::Exact {
            if let Some(count) = available.get_mut(&ch).filter(|count| **count > 0) {
                *mark = Mark::Present;
                *count -= 1;
            }
        }
    }
    marks
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Guess {
    pub word: String,
    pub marks: Vec<Mark>,
}

pub fn key_marks(rows: &[Guess]) -> BTreeMap<char, Mark> {
    let mut result = BTreeMap::new();
    for row in rows {
        for (ch, &mark) in row.word.chars().zip(&row.marks) {
            result
                .entry(ch)
                .and_modify(|best| *best = mark.max(*best))
                .or_insert(mark);
        }
    }
    result
}

pub fn answers(level: Level) -> &'static [&'static str] {
    static POOLS: [OnceLock<Vec<&str>>; 3] = [OnceLock::new(), OnceLock::new(), OnceLock::new()];
    let length = level.word_length();
    POOLS[length - 4].get_or_init(|| {
        let mut seen = HashSet::new();
        include_str!(concat!(env!("OUT_DIR"), "/answers.txt"))
            .split_whitespace()
            .filter(|word| word.chars().count() == length && seen.insert(*word))
            .collect()
    })
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Snapshot {
    pub target: String,
    pub draft: String,
    pub guesses: Vec<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Status {
    Playing,
    Won,
    Lost,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GuessError {
    Finished,
    WrongLength { expected: usize, actual: usize },
    UnknownWord,
    Repeated,
}

pub struct Round {
    level: Level,
    target: &'static str,
    seen: Vec<&'static str>,
    draft: String,
    rows: Vec<Guess>,
}

impl Round {
    /// `draw` selects an index in the unseen answer pool. Inject randomness here
    /// so the same code runs in WebAssembly, in the desktop host and in tests.
    pub fn new(
        level: Level,
        history: &[&str],
        saved: Option<&Snapshot>,
        draw: impl FnOnce(usize) -> usize,
    ) -> Self {
        let pool = answers(level);
        let names: HashSet<_> = pool.iter().copied().collect();
        let mut unique = HashSet::new();
        let mut seen: Vec<_> = history
            .iter()
            .filter_map(|word| names.get(*word).copied())
            .filter(|&word| unique.insert(word))
            .collect();
        let mut draft = String::new();
        let mut rows = Vec::new();

        let saved = saved.filter(|state| valid_snapshot(level, state, &names));
        let target = if let Some(state) = saved {
            if state.draft.chars().count() <= level.word_length() {
                draft = state
                    .draft
                    .chars()
                    .map(typed_letter)
                    .collect::<Option<_>>()
                    .unwrap_or_default();
            }
            let target = *names.get(state.target.as_str()).expect("validated target");
            rows = state
                .guesses
                .iter()
                .map(|word| Guess {
                    word: word.clone(),
                    marks: marks_for(word, target),
                })
                .collect();
            target
        } else {
            let mut choices: Vec<_> = pool
                .iter()
                .copied()
                .filter(|word| !unique.contains(word))
                .collect();
            if choices.is_empty() {
                choices = pool
                    .iter()
                    .copied()
                    .filter(|word| !seen.iter().rev().take(5).any(|recent| recent == word))
                    .collect();
                seen.clear();
            }
            choices[draw(choices.len()) % choices.len()]
        };
        if !seen.contains(&target) {
            seen.push(target);
        }
        Self {
            level,
            target,
            seen,
            draft,
            rows,
        }
    }

    pub fn draft(&self) -> &str {
        &self.draft
    }

    pub fn history(&self) -> &[&'static str] {
        &self.seen
    }

    pub fn guesses(&self) -> &[Guess] {
        &self.rows
    }

    pub fn status(&self) -> Status {
        if self.rows.last().is_some_and(|row| row.word == self.target) {
            Status::Won
        } else if self.rows.len() == self.level.guesses() {
            Status::Lost
        } else {
            Status::Playing
        }
    }

    pub fn solution(&self) -> Option<&'static str> {
        (self.status() != Status::Playing).then_some(self.target)
    }

    pub fn snapshot(&self) -> Option<Snapshot> {
        (self.status() == Status::Playing).then(|| Snapshot {
            target: self.target.to_owned(),
            draft: self.draft.clone(),
            guesses: self.rows.iter().map(|row| row.word.clone()).collect(),
        })
    }

    pub fn type_letter(&mut self, ch: char) -> bool {
        if self.status() != Status::Playing
            || self.draft.chars().count() >= self.level.word_length()
        {
            return false;
        }
        let Some(letter) = typed_letter(ch) else {
            return false;
        };
        self.draft.push(letter);
        true
    }

    pub fn erase(&mut self) -> bool {
        self.status() == Status::Playing && self.draft.pop().is_some()
    }

    pub fn submit(&mut self) -> Result<&Guess, GuessError> {
        if self.status() != Status::Playing {
            return Err(GuessError::Finished);
        }
        let actual = self.draft.chars().count();
        let expected = self.level.word_length();
        if actual != expected {
            return Err(GuessError::WrongLength { expected, actual });
        }
        if !known_word(&self.draft) {
            return Err(GuessError::UnknownWord);
        }
        if self.rows.iter().any(|row| row.word == self.draft) {
            return Err(GuessError::Repeated);
        }
        self.rows.push(Guess {
            marks: marks_for(&self.draft, self.target),
            word: std::mem::take(&mut self.draft),
        });
        Ok(self.rows.last().expect("the submitted guess"))
    }
}

fn valid_snapshot(level: Level, state: &Snapshot, pool: &HashSet<&str>) -> bool {
    let mut unique = HashSet::new();
    pool.contains(state.target.as_str())
        && state.guesses.len() < level.guesses()
        && state.guesses.iter().all(|word| {
            word.chars().count() == level.word_length()
                && *word != state.target
                && known_word(word)
                && unique.insert(word)
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use Mark::{Absent, Exact, Present};

    fn type_word(round: &mut Round, word: &str) {
        assert!(word.chars().all(|ch| round.type_letter(ch)));
    }

    #[test]
    fn repeats_get_credit_once_and_keyboard_marks_do_not_downgrade() {
        assert_eq!(
            marks_for("маска", "корма"),
            [Present, Absent, Absent, Present, Exact]
        );
        assert_eq!(
            marks_for("касса", "маска"),
            [Present, Exact, Exact, Absent, Exact]
        );
        let rows = [
            Guess {
                word: "маска".into(),
                marks: marks_for("маска", "корма"),
            },
            Guess {
                word: "арена".into(),
                marks: marks_for("арена", "корма"),
            },
        ];
        assert_eq!(key_marks(&rows)[&'а'], Exact);
    }

    #[test]
    fn invalid_guesses_cost_no_turn_and_a_draft_can_resume() {
        let saved = Snapshot {
            target: "казка".into(),
            draft: String::new(),
            guesses: vec![],
        };
        let mut round = Round::new(Level::Normal, &[], Some(&saved), |_| {
            panic!("already started")
        });
        assert_eq!(round.solution(), None);
        assert!(!round.type_letter('X'));
        assert!(round.type_letter('Ї'));
        assert_eq!(
            round.submit(),
            Err(GuessError::WrongLength {
                expected: 5,
                actual: 1
            })
        );
        assert!(round.erase());
        type_word(&mut round, "ґґґґґ");
        assert_eq!(round.submit(), Err(GuessError::UnknownWord));
        while round.erase() {}
        type_word(&mut round, "вішка");
        round.submit().unwrap();
        type_word(&mut round, "вішка");
        assert_eq!(round.submit(), Err(GuessError::Repeated));
        while round.erase() {}
        type_word(&mut round, "к");
        let state = round.snapshot().unwrap();
        let mut restored = Round::new(Level::Normal, round.history(), Some(&state), |_| 0);
        assert_eq!(restored.guesses(), round.guesses());
        assert_eq!(restored.draft(), "к");
        type_word(&mut restored, "азка");
        restored.submit().unwrap();
        assert_eq!(restored.status(), Status::Won);
        assert_eq!(restored.solution(), Some("казка"));
        assert_eq!(restored.snapshot(), None);
    }

    #[test]
    fn answer_pools_keep_their_order_and_wait_until_exhaustion_to_repeat() {
        for (level, count) in [(Level::Easy, 184), (Level::Normal, 259), (Level::Hard, 139)] {
            let pool = answers(level);
            assert_eq!(pool.len(), count);
            assert!(pool.iter().all(|word| known_word(word)));
            let mut seen = Vec::new();
            for expected in pool {
                let round = Round::new(level, &seen, None, |_| 0);
                assert_eq!(round.snapshot().unwrap().target, *expected);
                seen = round.history().to_vec();
            }
            let mut round = Round::new(level, &seen, None, |_| 0);
            assert_eq!(round.history(), &pool[..1]);
            for &word in pool.iter().skip(1).take(level.guesses()) {
                type_word(&mut round, word);
                round.submit().unwrap();
            }
            assert_eq!(round.status(), Status::Lost);
            assert_eq!(round.solution(), Some(pool[0]));
            assert_eq!(round.submit(), Err(GuessError::Finished));
        }
    }
}
