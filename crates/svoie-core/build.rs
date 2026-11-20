use std::{
    env,
    fs::{self, File},
    io::{BufWriter, Write},
    path::{Path, PathBuf},
};

// Until both clients switch, build from the same generated word data as the JS
// client. Nothing is evaluated here. Only the known backtick-delimited tables
// are extracted, and Cargo itself needs neither Node.js nor network access.
fn extract<'a>(source: &'a str, marker: &str) -> &'a str {
    let (_, rest) = source
        .split_once(marker)
        .unwrap_or_else(|| panic!("missing data marker {marker:?}"));
    let (body, _) = rest
        .split_once('`')
        .unwrap_or_else(|| panic!("unterminated section {marker:?}"));
    body
}

fn original(repo: &Path, name: &str) -> String {
    let file = repo.join("app").join(name);
    println!("cargo:rerun-if-changed={}", file.display());
    fs::read_to_string(file).expect("read the app's word data")
}

fn main() {
    let crate_dir = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let out = PathBuf::from(env::var_os("OUT_DIR").unwrap());
    let repo = crate_dir.parent().unwrap().parent().unwrap();

    // The extracted dictionary data keeps its MPL-1.1 license. See
    // app/assets/licenses/uk-hunspell.txt and docs/rust-migration.md.
    let source = original(repo, "lexicon-data.mjs");
    for length in 3..=6 {
        let block = extract(&source, &format!("\n{length}:`"));
        let mut output =
            BufWriter::new(File::create(out.join(format!("words-{length}.txt"))).unwrap());
        for word in block.split_whitespace() {
            assert_eq!(word.chars().count(), length, "invalid word {word}");
            writeln!(output, "{word}").unwrap();
        }
        output.flush().unwrap();
    }

    let nouns = original(repo, "answer-data.mjs");
    fs::write(out.join("answers.txt"), extract(&nouns, "const nouns=`")).unwrap();

    let puzzles = original(repo, "ladder-decks.mjs");
    for level in ["easy", "normal", "hard"] {
        let text = extract(&puzzles, &format!("\n  {level}:`"));
        fs::write(out.join(format!("ladders-{level}.txt")), text).unwrap();
    }
}
