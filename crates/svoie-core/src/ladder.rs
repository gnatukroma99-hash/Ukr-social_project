use std::{
    collections::{HashMap, HashSet},
    sync::OnceLock,
};

use crate::{
    lexicon::{typed_letter, Word},
    Level,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Puzzle {
    pub level: Level,
    pub start: &'static str,
    pub target: &'static str,
    pub minimum: usize,
}

impl Puzzle {
    pub fn id(self) -> String {
        format!("{}-{}", self.start, self.target)
    }
}

pub fn puzzles(level: Level) -> &'static [Puzzle] {
    static EASY: OnceLock<Vec<Puzzle>> = OnceLock::new();
    static NORMAL: OnceLock<Vec<Puzzle>> = OnceLock::new();
    static HARD: OnceLock<Vec<Puzzle>> = OnceLock::new();
    let (cache, source) = match level {
        Level::Easy => (
            &EASY,
            include_str!(concat!(env!("OUT_DIR"), "/ladders-easy.txt")),
        ),
        Level::Normal => (
            &NORMAL,
            include_str!(concat!(env!("OUT_DIR"), "/ladders-normal.txt")),
        ),
        Level::Hard => (
            &HARD,
            include_str!(concat!(env!("OUT_DIR"), "/ladders-hard.txt")),
        ),
    };
    cache.get_or_init(|| {
        source
            .lines()
            .filter(|line| !line.trim().is_empty())
            .map(|line| {
                let mut fields = line.split_whitespace();
                Puzzle {
                    level,
                    start: fields.next().expect("start word"),
                    target: fields.next().expect("target word"),
                    minimum: fields
                        .next()
                        .and_then(|field| field.parse().ok())
                        .expect("minimum number of moves"),
                }
            })
            .collect()
    })
}

/// Exact shortest path, including both endpoints. Words in `excluded`
/// cannot be revisited. The current word may itself appear in `excluded`.
pub fn shortest_path(start: &str, target: &str, excluded: &[&str]) -> Option<Vec<String>> {
    let excluded = excluded
        .iter()
        .filter_map(|word| Word::parse(word))
        .collect();
    search(Word::parse(start)?, Word::parse(target)?, &excluded)
        .map(|words| words.into_iter().map(|word| word.to_string()).collect())
}

type Parents = HashMap<Word, Option<Word>>;

fn track(parents: &Parents, start: Word) -> impl Iterator<Item = Word> + '_ {
    std::iter::successors(Some(start), |word| parents[word])
}

fn search(start: Word, target: Word, blocked: &HashSet<Word>) -> Option<Vec<Word>> {
    if start.len() != target.len()
        || !start.is_known()
        || !target.is_known()
        || blocked.contains(&target)
    {
        return None;
    }
    if start == target {
        return Some(vec![start]);
    }
    let mut here = vec![start];
    let mut other = vec![target];
    let mut parents = HashMap::from([(start, None)]);
    let mut reverse = HashMap::from([(target, None)]);
    let mut forward = true;

    while !here.is_empty() && !other.is_empty() {
        if here.len() > other.len() {
            std::mem::swap(&mut here, &mut other);
            std::mem::swap(&mut parents, &mut reverse);
            forward = !forward;
        }
        let mut next_layer = Vec::new();
        for word in here {
            for next in word.adjacent() {
                if blocked.contains(&next) || parents.contains_key(&next) {
                    continue;
                }
                if reverse.contains_key(&next) {
                    let mut result: Vec<_> = track(&parents, word).collect();
                    result.reverse();
                    result.extend(track(&reverse, next));
                    if !forward {
                        result.reverse();
                    }
                    return Some(result);
                }
                parents.insert(next, Some(word));
                next_layer.push(next);
            }
        }
        here = next_layer;
    }
    None
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MoveError {
    Finished,
    InvalidLetter,
    SameLetter,
    UnknownWord(String),
    AlreadyUsed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Hint {
    pub slot: usize,
    pub from: char,
    pub to: char,
}

pub struct Round {
    puzzle: Puzzle,
    slot: usize,
    path: Vec<Word>,
}

impl Round {
    pub fn new(puzzle: Puzzle) -> Option<Self> {
        let start = Word::parse(puzzle.start)?;
        let target = Word::parse(puzzle.target)?;
        if !start.is_known() || !target.is_known() || start.len() != target.len() || start == target
        {
            return None;
        }
        Some(Self {
            puzzle,
            slot: 0,
            path: vec![start],
        })
    }

    fn word(&self) -> Word {
        *self
            .path
            .last()
            .expect("the starting word is never removed")
    }

    pub fn current(&self) -> String {
        self.word().to_string()
    }

    pub fn moves(&self) -> usize {
        self.path.len() - 1
    }

    pub fn slot(&self) -> usize {
        self.slot
    }

    pub fn finished(&self) -> bool {
        Some(self.word()) == Word::parse(self.puzzle.target)
    }

    pub fn select(&mut self, slot: usize) -> bool {
        if self.finished() || slot >= self.word().len() || slot == self.slot {
            return false;
        }
        self.slot = slot;
        true
    }

    pub fn replace(&mut self, ch: char) -> Result<(), MoveError> {
        if self.finished() {
            return Err(MoveError::Finished);
        }
        let letter = typed_letter(ch).ok_or(MoveError::InvalidLetter)?;
        let word = self.word();
        let next = word
            .replace(self.slot, letter)
            .ok_or(MoveError::InvalidLetter)?;
        if next == word {
            return Err(MoveError::SameLetter);
        }
        if !next.is_known() {
            return Err(MoveError::UnknownWord(next.to_string()));
        }
        if self.path.contains(&next) {
            return Err(MoveError::AlreadyUsed);
        }
        self.path.push(next);
        Ok(())
    }

    pub fn undo(&mut self) -> bool {
        if self.finished() || self.path.len() < 2 {
            return false;
        }
        self.path.pop();
        true
    }

    pub fn hint(&mut self) -> Option<Hint> {
        let current = self.word();
        let target = Word::parse(self.puzzle.target)?;
        let blocked = self.path[..self.path.len() - 1].iter().copied().collect();
        let path = search(current, target, &blocked)?;
        let next = *path.get(1)?;
        let slot = (0..current.len()).find(|&i| current.at(i) != next.at(i))?;
        self.slot = slot;
        Some(Hint {
            slot,
            from: current.at(slot),
            to: next.at(slot),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_600_existing_ladders_keep_their_ids_and_minimum_moves() {
        let mut ids = HashSet::new();
        for (level, count) in [(Level::Easy, 180), (Level::Normal, 200), (Level::Hard, 220)] {
            assert_eq!(puzzles(level).len(), count);
            for &puzzle in puzzles(level) {
                assert!(ids.insert(puzzle.id()), "duplicate {}", puzzle.id());
                let start = Word::parse(puzzle.start).unwrap();
                let target = Word::parse(puzzle.target).unwrap();
                let path = search(start, target, &HashSet::new()).expect("connected puzzle");
                assert_eq!(path.len() - 1, puzzle.minimum, "{}", puzzle.id());
                assert_eq!(path.first(), Some(&start));
                assert_eq!(path.last(), Some(&target));
            }
        }
        assert_eq!(puzzles(Level::Normal)[0].id(), "кіт-тут");
        assert_eq!(puzzles(Level::Hard)[2].id(), "кішка-варта");
    }

    #[test]
    fn supports_vishka_and_does_not_repeat_words_on_the_path() {
        let puzzle = puzzles(Level::Hard)[2];
        let mut round = Round::new(puzzle).unwrap();
        round.replace('В').unwrap();
        assert_eq!(round.current(), "вішка");
        assert_eq!(round.moves(), 1);
        assert_eq!(round.replace('к'), Err(MoveError::AlreadyUsed));
        assert_eq!(round.replace('W'), Err(MoveError::InvalidLetter));
        let route = shortest_path("вішка", "варта", &["кішка"]).unwrap();
        assert!(route.iter().all(|word| word != "кішка"));
        assert_eq!(round.hint().unwrap().slot, round.slot());
        assert!(round.undo());
        assert_eq!(round.current(), "кішка");
    }

    #[test]
    fn hints_reach_the_target_in_the_minimum_number_of_moves() {
        let mut round = Round::new(puzzles(Level::Normal)[0]).unwrap();
        assert_eq!(
            round.replace('ї'),
            Err(MoveError::UnknownWord("їіт".into()))
        );
        assert_eq!(
            round.hint(),
            Some(Hint {
                slot: 1,
                from: 'і',
                to: 'у'
            })
        );
        round.replace('у').unwrap();
        let hint = round.hint().unwrap();
        round.replace(hint.to).unwrap();
        assert!(round.finished());
        assert_eq!(round.moves(), 2);
        assert!(!round.undo());
        assert!(round.hint().is_none());
        assert!(shortest_path("кіт", "тут", &["тут"]).is_none());
    }
}
