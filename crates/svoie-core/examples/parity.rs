use std::io::{self, BufRead, BufWriter, Write};

use svoie_core::{
    ladder::{puzzles, shortest_path},
    lexicon::form_count,
    quests::{day_at, deck_for, score, streak_bonus, Kind},
    wordle::{answers, marks_for},
    Level,
};

#[path = "parity/arcade.rs"]
mod arcade;

// Test transport for comparing this crate to the installed JS rules. No
// Electron, browser, SQLite, network or production data involved.
fn main() -> io::Result<()> {
    let mut writer = BufWriter::new(io::stdout().lock());
    for level in Level::ALL {
        writeln!(
            writer,
            "answers\t{}\t{}",
            level.id(),
            answers(level).join(" ")
        )?;
        for puzzle in puzzles(level) {
            let path = shortest_path(puzzle.start, puzzle.target, &[]).expect("connected puzzle");
            writeln!(
                writer,
                "ladder\t{}\t{}\t{}\t{}",
                level.id(),
                puzzle.id(),
                puzzle.minimum,
                path.join(" ")
            )?;
        }
    }
    for length in 3..=6 {
        writeln!(writer, "forms\t{length}\t{}", form_count(length))?;
    }
    arcade::write(&mut writer)?;
    for line in io::stdin().lock().lines() {
        let line = line?;
        match line.split('\t').collect::<Vec<_>>().as_slice() {
            ["marks", guess, target] => {
                let marks: Vec<_> = marks_for(guess, target)
                    .iter()
                    .map(|mark| mark.id())
                    .collect();
                writeln!(writer, "{line}\t{}", marks.join(" "))?;
            }
            ["score", kind, expected, pick, elapsed, days] => {
                let kind = match *kind {
                    "translate" => Kind::Translate,
                    "context" => Kind::Context,
                    "riddle" => Kind::Riddle,
                    _ => {
                        return Err(io::Error::new(
                            io::ErrorKind::InvalidInput,
                            "unknown question type",
                        ))
                    }
                };
                let score = score(
                    kind,
                    expected,
                    pick,
                    elapsed.parse().unwrap(),
                    streak_bonus(days.parse().unwrap()),
                );
                writeln!(
                    writer,
                    "{line}\t{}\t{}\t{}\t{}",
                    score.correct, score.speed, score.bonus, score.points
                )?;
            }
            ["day", unix_ms] => {
                let day = day_at(unix_ms.parse().unwrap()).unwrap();
                writeln!(writer, "{line}\t{day}")?;
            }
            ["daily", date] => {
                for (slot, quest) in deck_for(date.parse().unwrap()).into_iter().enumerate() {
                    let q = quest.question;
                    writeln!(
                        writer,
                        "{line}\t{slot}\t{}\t{}\t{}\t{}\t{}\t{}\t{}",
                        q.id,
                        q.kind.id(),
                        q.clue.unwrap_or(""),
                        q.prompt,
                        quest.correct,
                        quest.explanation,
                        q.choices.join("\t")
                    )?;
                }
            }
            _ => {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "unknown parity command",
                ))
            }
        }
    }
    writer.flush()
}
