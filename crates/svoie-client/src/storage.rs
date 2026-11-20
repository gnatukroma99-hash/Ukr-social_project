//! Restore state from the three existing localStorage keys. This module never
//! writes to a WebView profile or transfers the credentials in `svoie.v1`.

mod arcade;

use serde_json::{Map, Value};

pub use arcade::{Arcade, Game, Records, Rotation};

pub const PROFILE_KEY: &str = "svoie.v1";
pub const ARCADE_KEY: &str = "svoie.arcade.v2";
pub const APPEARANCE_KEY: &str = "svoie.appearance.v1";

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum Appearance {
    #[default]
    Dark,
    Light,
    Tide,
    Dusk,
    Dawn,
}

impl Appearance {
    pub fn restore(raw: Option<&str>) -> Self {
        match raw {
            Some("light") => Self::Light,
            Some("tide") => Self::Tide,
            Some("dusk") => Self::Dusk,
            Some("dawn") => Self::Dawn,
            _ => Self::Dark,
        }
    }

    pub const fn id(self) -> &'static str {
        match self {
            Self::Dark => "dark",
            Self::Light => "light",
            Self::Tide => "tide",
            Self::Dusk => "dusk",
            Self::Dawn => "dawn",
        }
    }
}

/// Read a snapshot in the same origin as the installed app. Valid legacy
/// data stays in place. A host should offer recovery before overwriting a key
/// reported in `unreadable_keys`, even though the UI can use fallback values.
pub struct LocalState {
    bookmarks: Vec<String>,
    days: Option<Map<String, Value>>,
    pub arcade: Arcade,
    pub appearance: Appearance,
    unreadable_keys: Vec<&'static str>,
}

impl LocalState {
    pub fn restore(profile: Option<&str>, arcade: Option<&str>, appearance: Option<&str>) -> Self {
        let mut unreadable_keys = Vec::new();
        let mut profile = parse(profile, PROFILE_KEY, &mut unreadable_keys);
        let raw = parse(arcade, ARCADE_KEY, &mut unreadable_keys);
        let arcade = Arcade::restore(&raw, &profile);
        let bookmarks = strings(profile.get("saved")).map(str::to_owned).collect();
        let days = profile
            .get_mut("days")
            .and_then(Value::as_object_mut)
            .map(std::mem::take);
        Self {
            bookmarks,
            days,
            arcade,
            appearance: Appearance::restore(appearance),
            unreadable_keys,
        }
    }

    pub fn bookmark_ids(&self) -> impl Iterator<Item = &str> {
        self.bookmarks.iter().map(String::as_str)
    }

    /// Offline quest records are retained in their original JSON shape.
    pub fn offline_days(&self) -> Option<&Map<String, Value>> {
        self.days.as_ref()
    }

    pub fn unreadable_keys(&self) -> &[&'static str] {
        &self.unreadable_keys
    }
}

fn parse(raw: Option<&str>, key: &'static str, unreadable: &mut Vec<&'static str>) -> Value {
    let Some(raw) = raw else { return Value::Null };
    match serde_json::from_str(raw) {
        Ok(data @ (Value::Null | Value::Object(_))) => data,
        _ => {
            unreadable.push(key);
            Value::Null
        }
    }
}

fn strings(data: Option<&Value>) -> impl Iterator<Item = &str> {
    data.and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
}
