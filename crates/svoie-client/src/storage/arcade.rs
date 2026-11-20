use std::collections::BTreeMap;

use serde::Serialize;
use serde_json::Value;
use svoie_core::{arcade::frames::Album, lexicon::ALPHABET, wordle, Level};

use super::strings;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Game {
    Side,
    Letters,
    Frames,
    Ladder,
    Word,
}

impl Game {
    const LIST: [Self; 5] = [
        Self::Side,
        Self::Letters,
        Self::Frames,
        Self::Ladder,
        Self::Word,
    ];

    pub const fn id(self) -> &'static str {
        match self {
            Self::Side => "side",
            Self::Letters => "letters",
            Self::Frames => "frames",
            Self::Ladder => "ladder",
            Self::Word => "word",
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Arcade {
    levels: BTreeMap<&'static str, &'static str>,
    album: &'static str,
    frame_seen: BTreeMap<&'static str, Vec<String>>,
    by_level: BTreeMap<&'static str, Records>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Records {
    pub side_best: u64,
    pub side_rotation: Rotation,
    pub letters_best: u64,
    pub drop_seen: Vec<String>,
    pub frame_best: BTreeMap<&'static str, u64>,
    pub ladder_best: BTreeMap<String, u64>,
    pub ladder_index: u64,
    pub word_seen: Vec<String>,
    pub word_round: Option<Value>,
    pub word_wins: u64,
    pub word_played: u64,
    pub word_best: u64,
}

#[derive(Default, Serialize)]
pub struct Rotation {
    pub seen: Vec<String>,
    pub recent: Vec<String>,
}

impl Arcade {
    pub fn restore(raw: &Value, profile: &Value) -> Self {
        let settings = raw.get("levels");
        let levels = Game::LIST
            .into_iter()
            .map(|game| {
                let setting = get(settings, game.id()).and_then(Value::as_str);
                (game.id(), level_from(setting).id())
            })
            .collect();
        let album = match raw.get("album").and_then(Value::as_str) {
            Some("art") => Album::Art,
            _ => Album::Catalog,
        }
        .id();
        let frame_seen = Album::ALL
            .into_iter()
            .map(|album| (album.id(), ids(get(raw.get("frameSeen"), album.id()))))
            .collect();
        let by_level = Level::ALL
            .into_iter()
            .map(|level| {
                let old =
                    (level == Level::Normal && raw.get("byLevel").is_none()).then_some(profile);
                let current = get(raw.get("byLevel"), level.id());
                (level.id(), Records::restore(current, old))
            })
            .collect();
        Self {
            levels,
            album,
            frame_seen,
            by_level,
        }
    }

    pub fn level(&self, game: Game) -> Level {
        level_from(self.levels.get(game.id()).copied())
    }

    pub fn album(&self) -> Album {
        if self.album == "art" {
            Album::Art
        } else {
            Album::Catalog
        }
    }

    pub fn seen_frames(&self, album: Album) -> &[String] {
        &self.frame_seen[album.id()]
    }

    pub fn records(&self, level: Level) -> &Records {
        &self.by_level[level.id()]
    }

    pub fn resume_word(&self, level: Level, draw: impl FnOnce(usize) -> usize) -> wordle::Round {
        let record = self.records(level);
        let seen: Vec<_> = record.word_seen.iter().map(String::as_str).collect();
        let saved = record.word_round.as_ref().and_then(word_snapshot);
        wordle::Round::new(level, &seen, saved.as_ref(), draw)
    }
}

impl Records {
    fn restore(current: Option<&Value>, old: Option<&Value>) -> Self {
        let mini = get(old, "miniRecords");
        let legacy = |key, fallback| non_null(get(current, key)).or_else(|| get(mini, fallback));
        let side = |key, fallback| non_null(get(current, key)).or_else(|| get(old, fallback));
        let rotation = side("sideRotation", "arcadeRotation");
        let ladder_best = legacy("ladderBest", "ladder")
            .and_then(Value::as_object)
            .into_iter()
            .flatten()
            .filter_map(|(key, value)| {
                let best = count(Some(value));
                (best > 0 && valid_ladder_id(key)).then(|| (key.clone(), best))
            })
            .collect();
        let frame_best = Album::ALL
            .into_iter()
            .map(|album| {
                let value = non_null(get(get(current, "frameBest"), album.id())).or_else(|| {
                    (album == Album::Catalog)
                        .then(|| get(mini, "frames"))
                        .flatten()
                });
                (album.id(), count(value))
            })
            .collect();
        Self {
            side_best: count(side("sideBest", "best")),
            side_rotation: Rotation {
                seen: ids(get(rotation, "seen")),
                recent: ids(get(rotation, "recent")),
            },
            letters_best: count(legacy("lettersBest", "letters")),
            drop_seen: ids(get(current, "dropSeen")),
            frame_best,
            ladder_best,
            ladder_index: count(legacy("ladderIndex", "puzzle")),
            word_seen: ids(get(current, "wordSeen")),
            word_round: get(current, "wordRound")
                .filter(|v| v.is_object() || v.is_array())
                .cloned(),
            word_wins: count(get(current, "wordWins")),
            word_played: count(get(current, "wordPlayed")),
            word_best: count(get(current, "wordBest")),
        }
    }
}

fn level_from(value: Option<&str>) -> Level {
    match value {
        Some("easy") => Level::Easy,
        Some("hard") => Level::Hard,
        _ => Level::Normal,
    }
}

fn get<'a>(value: Option<&'a Value>, key: &str) -> Option<&'a Value> {
    value?.get(key)
}

fn non_null(value: Option<&Value>) -> Option<&Value> {
    value.filter(|v| !v.is_null())
}

fn ids(value: Option<&Value>) -> Vec<String> {
    strings(value).map(str::to_owned).collect()
}

fn count(value: Option<&Value>) -> u64 {
    const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;
    value
        .and_then(Value::as_f64)
        .filter(|n| (0.0..=MAX_SAFE_INTEGER).contains(n) && n.fract() == 0.0)
        .map_or(0, |n| n as u64)
}

fn valid_ladder_id(id: &str) -> bool {
    let valid = |s: &str| !s.is_empty() && s.chars().all(|c| ALPHABET.contains(&c));
    id.split_once('-')
        .is_some_and(|(start, end)| valid(start) && valid(end))
}

fn word_snapshot(value: &Value) -> Option<wordle::Snapshot> {
    Some(wordle::Snapshot {
        target: value.get("target")?.as_str()?.to_owned(),
        draft: value
            .get("draft")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned(),
        guesses: value
            .get("guesses")?
            .as_array()?
            .iter()
            .map(|word| word.as_str().map(str::to_owned))
            .collect::<Option<_>>()?,
    })
}
