use std::io::{self, BufRead, BufWriter, Write};

use serde::Deserialize;
use serde_json::{json, Map, Value};
use svoie_client::storage::LocalState;
use svoie_core::Level;

#[derive(Deserialize)]
struct Keys {
    profile: Option<String>,
    arcade: Option<String>,
    appearance: Option<String>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut out = BufWriter::new(io::stdout().lock());
    for line in io::stdin().lock().lines() {
        let keys: Keys = serde_json::from_str(&line?)?;
        let saved = LocalState::restore(
            keys.profile.as_deref(),
            keys.arcade.as_deref(),
            keys.appearance.as_deref(),
        );
        let rounds = Level::ALL
            .into_iter()
            .map(|level| {
                let round = saved.arcade.resume_word(level, |_| 0);
                let snapshot = round.snapshot().unwrap();
                let rows: Vec<_> = round
                    .guesses()
                    .iter()
                    .map(|row| {
                        let marks: Vec<_> = row.marks.iter().map(|mark| mark.id()).collect();
                        json!({ "word": row.word, "marks": marks })
                    })
                    .collect();
                (
                    level.id().to_owned(),
                    json!({
                        "target": snapshot.target,
                        "draft": snapshot.draft,
                        "guesses": snapshot.guesses,
                        "seen": round.history(),
                        "rows": rows,
                    }),
                )
            })
            .collect::<Map<String, Value>>();
        let row = json!({
            "bookmarks": saved.bookmark_ids().collect::<Vec<_>>(),
            "days": saved.offline_days(),
            "appearance": saved.appearance.id(),
            "arcade": saved.arcade,
            "rounds": rounds,
        });
        serde_json::to_writer(&mut out, &row)?;
        writeln!(out)?;
    }
    out.flush()?;
    Ok(())
}
