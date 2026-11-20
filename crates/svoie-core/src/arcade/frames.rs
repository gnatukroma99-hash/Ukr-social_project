use std::sync::OnceLock;

use super::{deal, known, shuffle};
use crate::{
    content::{optional, rows},
    Level,
};

pub const ROUNDS: usize = 5;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum Album {
    #[default]
    Catalog,
    Art,
}

impl Album {
    pub const ALL: [Self; 2] = [Self::Catalog, Self::Art];

    pub const fn id(self) -> &'static str {
        match self {
            Self::Catalog => "catalog",
            Self::Art => "art",
        }
    }
}

#[derive(Debug, Eq, PartialEq)]
pub struct Card {
    pub id: &'static str,
    pub category: &'static str,
    pub src: &'static str,
    pub title: &'static str,
    pub cue: &'static str,
    pub author: Option<&'static str>,
    pub meta: Option<&'static str>,
    pub url: Option<&'static str>,
    pub action: Option<&'static str>,
}

pub fn deck(album: Album) -> &'static [Card] {
    static CATALOG: OnceLock<Vec<Card>> = OnceLock::new();
    static ART: OnceLock<Vec<Card>> = OnceLock::new();
    let (cache, text) = match album {
        Album::Catalog => (&CATALOG, include_str!("../../content/frames-catalog.tsv")),
        Album::Art => (&ART, include_str!("../../content/frames-art.tsv")),
    };
    cache.get_or_init(|| {
        rows(text)
            .map(
                |[id, category, src, title, cue, author, meta, url, action]| Card {
                    id,
                    category,
                    src,
                    title,
                    cue,
                    author: optional(author),
                    meta: optional(meta),
                    url: optional(url),
                    action: optional(action),
                },
            )
            .collect()
    })
}

pub fn tile_count(level: Level) -> usize {
    [4, 9, 16][level.index()]
}

fn initially_open(level: Level) -> &'static [usize] {
    [&[0, 3][..], &[4], &[5]][level.index()]
}

pub fn max_points(level: Level) -> usize {
    ROUNDS * (tile_count(level) + 1 - initially_open(level).len())
}

pub struct Turn {
    pub item: &'static Card,
    pub choices: Vec<&'static Card>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Answer {
    pub item: &'static Card,
    pub index: usize,
    pub correct: bool,
    pub points: usize,
}

pub struct Round {
    level: Level,
    album: Album,
    seen: Vec<&'static str>,
    turns: Vec<Turn>,
    opened: Vec<usize>,
    answers: Vec<Answer>,
    score: usize,
    finished: bool,
}

impl Round {
    pub fn new(
        level: Level,
        album: Album,
        history: &[&str],
        draw: &mut impl FnMut(usize) -> usize,
    ) -> Self {
        let mut round = Self {
            level,
            album,
            seen: known(history, deck(album), |item| item.id),
            turns: Vec::new(),
            opened: Vec::new(),
            answers: Vec::new(),
            score: 0,
            finished: false,
        };
        round.deal_frame(draw);
        round
    }

    pub fn turn(&self) -> &Turn {
        self.turns.last().expect("at least one frame is dealt")
    }

    pub fn round_index(&self) -> usize {
        self.turns.len() - 1
    }

    pub fn opened(&self) -> &[usize] {
        &self.opened
    }

    pub fn seen(&self) -> &[&'static str] {
        &self.seen
    }

    pub fn answers(&self) -> &[Answer] {
        &self.answers
    }

    pub fn score(&self) -> usize {
        self.score
    }

    pub fn finished(&self) -> bool {
        self.finished
    }

    pub fn value(&self) -> usize {
        tile_count(self.level) + 1 - self.opened.len()
    }

    pub fn uncover(&mut self, tile: usize) -> bool {
        if self.finished
            || self.answered()
            || tile >= tile_count(self.level)
            || self.opened.contains(&tile)
        {
            return false;
        }
        self.opened.push(tile);
        true
    }

    pub fn guess(&mut self, index: usize) -> Option<Answer> {
        if self.finished || self.answered() {
            return None;
        }
        let turn = self.turn();
        let correct = turn.choices.get(index)?.id == turn.item.id;
        let points = if correct { self.value() } else { 0 };
        let answer = Answer {
            item: turn.item,
            index,
            correct,
            points,
        };
        self.answers.push(answer);
        self.score += points;
        Some(answer)
    }

    pub fn advance(&mut self, draw: &mut impl FnMut(usize) -> usize) -> bool {
        if self.finished || !self.answered() {
            return false;
        }
        if self.turns.len() == ROUNDS {
            self.finished = true;
        } else {
            self.deal_frame(draw);
        }
        true
    }

    fn answered(&self) -> bool {
        self.answers.len() == self.turns.len()
    }

    fn deal_frame(&mut self, draw: &mut impl FnMut(usize) -> usize) {
        let pool = deck(self.album);
        let item = deal(
            pool,
            &mut self.seen,
            self.turns.iter().map(|turn| turn.item.id),
            |item| item.id,
            |item| {
                !self
                    .turns
                    .iter()
                    .any(|turn| turn.item.category == item.category)
            },
            draw,
        );
        let mut candidates: Vec<_> = pool
            .iter()
            .filter(|card| card.category == item.category && card.id != item.id)
            .collect();
        shuffle(&mut candidates, draw);
        let count = [2, 3, 4][self.level.index()];
        let mut choices: Vec<_> = std::iter::once(item)
            .chain(candidates.into_iter().take(count - 1))
            .collect();
        shuffle(&mut choices, draw);
        self.turns.push(Turn { item, choices });
        self.opened = initially_open(self.level).to_vec();
    }
}
