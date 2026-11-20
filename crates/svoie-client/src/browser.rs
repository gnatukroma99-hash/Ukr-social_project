//! Browser bridge for the opt-in local preview. Keep JS-visible shapes equal
//! to the installed app; the regular client does not load this module.

use serde::Serialize;
use serde_json::json;
use svoie_core::{
    ladder::shortest_path,
    lexicon::known_word as in_dictionary,
    quests::{self, Kind},
};
use wasm_bindgen::prelude::*;

use crate::storage::LocalState;

#[wasm_bindgen(js_name = knownWord)]
pub fn known_word(word: &str) -> bool {
    in_dictionary(word)
}

#[wasm_bindgen(js_name = ladderPath)]
pub fn ladder_path(start: &str, target: &str, excluded_json: &str) -> Option<String> {
    let words: Vec<String> = serde_json::from_str(excluded_json).ok()?;
    let excluded: Vec<_> = words.iter().map(String::as_str).collect();
    serde_json::to_string(&shortest_path(start, target, &excluded)).ok()
}

#[wasm_bindgen(js_name = kyivDay)]
pub fn kyiv_day(epoch_ms: f64) -> Option<String> {
    if !epoch_ms.is_finite() || epoch_ms.fract() != 0.0 {
        return None;
    }
    quests::day_at(epoch_ms as i64)
        .ok()
        .map(|day| day.to_string())
}

#[derive(Serialize)]
struct DailyCard {
    id: &'static str,
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    clue: Option<&'static str>,
    prompt: &'static str,
    choices: [&'static str; 4],
    correct: &'static str,
    explanation: &'static str,
}

#[wasm_bindgen(js_name = dailyDeck)]
pub fn daily_deck(day: &str) -> Option<String> {
    let date: quests::Date = day.parse().ok()?;
    if date.to_string() != day {
        return None;
    }
    let deck = quests::deck_for(date).map(|entry| DailyCard {
        id: entry.question.id,
        kind: entry.question.kind.id(),
        clue: entry.question.clue,
        prompt: entry.question.prompt,
        choices: entry.question.choices,
        correct: entry.correct,
        explanation: entry.explanation,
    });
    serde_json::to_string(&deck).ok()
}

#[wasm_bindgen(js_name = scoreQuest)]
pub fn score_quest(
    kind: &str,
    answer: &str,
    choice: &str,
    elapsed: u32,
    bonus: u8,
) -> Option<String> {
    let kind = match kind {
        "translate" => Kind::Translate,
        "context" => Kind::Context,
        "riddle" => Kind::Riddle,
        _ => return None,
    };
    let score = quests::score(kind, answer, choice, u64::from(elapsed), bonus);
    Some(
        json!({
            "correct":score.correct,"speed":score.speed,"bonus":score.bonus,"points":score.points
        })
        .to_string(),
    )
}

#[wasm_bindgen(js_name = restoreArcade)]
pub fn restore_arcade(arcade: &str, old_records: &str) -> Option<String> {
    let saved = LocalState::restore(Some(old_records), Some(arcade), None);
    if !saved.unreadable_keys().is_empty() {
        return None;
    }
    serde_json::to_string(&saved.arcade).ok()
}
