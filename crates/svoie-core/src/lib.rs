//! Pure Rust rules used by a future native host and WebAssembly UI.
//! No filesystem, OS APIs, networking or timers are needed at runtime.

pub mod arcade;
mod content;
pub mod ladder;
pub mod lexicon;
pub mod quests;
pub mod wordle;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum Level {
    Easy,
    #[default]
    Normal,
    Hard,
}

impl Level {
    pub const ALL: [Self; 3] = [Self::Easy, Self::Normal, Self::Hard];

    const fn index(self) -> usize {
        match self {
            Self::Easy => 0,
            Self::Normal => 1,
            Self::Hard => 2,
        }
    }

    pub const fn id(self) -> &'static str {
        match self {
            Self::Easy => "easy",
            Self::Normal => "normal",
            Self::Hard => "hard",
        }
    }

    pub const fn word_length(self) -> usize {
        match self {
            Self::Easy => 4,
            Self::Normal => 5,
            Self::Hard => 6,
        }
    }

    pub const fn guesses(self) -> usize {
        match self {
            Self::Easy => 7,
            Self::Normal => 6,
            Self::Hard => 5,
        }
    }
}
