use std::io::{self, Write};

use svoie_core::{
    arcade::{frames, letters, side},
    Level,
};

fn random(mut state: u32) -> impl FnMut(usize) -> usize {
    move |size| {
        state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        ((u64::from(state) * size as u64) >> 32) as usize
    }
}

pub fn write(writer: &mut impl Write) -> io::Result<()> {
    for level in Level::ALL {
        side_trace(writer, level)?;
        letters_trace(writer, level)?;
    }
    for album in frames::Album::ALL {
        frames_trace(writer, album)?;
    }
    Ok(())
}

fn side_trace(out: &mut impl Write, level: Level) -> io::Result<()> {
    let id = level.id();
    let mut draw = random(23_019);
    let mut rotation = side::Rotation {
        seen: vec!["not-a-card"],
        recent: vec!["not-a-card"],
    };
    for step in 0..(2 * side::deck(level).len()) {
        let (card, next) = side::next_card(level, &rotation.seen, &rotation.recent, &mut draw);
        rotation = next;
        writeln!(
            out,
            "side-deal\t{id}\t{step}\t{}\t{}\t{}\t{}\t{}",
            card.word,
            card.language.id(),
            card.hint,
            rotation.seen.len(),
            rotation.recent.join("|")
        )?;
    }
    for mode in ["win", "lose"] {
        let mut draw = random(123);
        let mut round = side::Round::new(level, &rotation.seen, &rotation.recent, &mut draw);
        while let Some(card) = round.card() {
            let index = round.attempts().len();
            let duration = round.duration_ms().unwrap();
            let pick = match (mode, index) {
                ("win", _) => Some(card.language),
                (_, 0) => Some(card.language.other()),
                _ => None,
            };
            let result = round.pick(pick, &mut draw).unwrap();
            let result = match result {
                side::ResultKind::Correct => "ok",
                side::ResultKind::Wrong => "wrong",
                side::ResultKind::Timeout => "time",
            };
            writeln!(
                out,
                "side-play\t{id}\t{mode}\t{index}\t{}\t{duration}\t{result}\t{}\t{}\t{}",
                card.word,
                round.score(),
                round.lives(),
                round.rotation().seen.len()
            )?;
        }
    }
    Ok(())
}

fn letters_trace(out: &mut impl Write, level: Level) -> io::Result<()> {
    let id = level.id();
    let mut draw = random(32);
    let mut seen = vec!["not-a-card"];
    for i in 0..=letters::deck(level).len() {
        let g = letters::Round::new(level, &seen, &mut draw);
        let word = g.word();
        writeln!(
            out,
            "letters-deal\t{id}\t{i}\t{}\t{}\t{}\t{}\t{}",
            word.word,
            word.clue,
            word.art.unwrap_or("-"),
            g.lanes().iter().collect::<String>(),
            g.seen().len()
        )?;
        seen = g.seen().to_vec();
    }
    for mode in ["win", "lose"] {
        let mut draw = random(49);
        let mut g = letters::Round::new(level, &[], &mut draw);
        for step in 0.. {
            writeln!(
                out,
                "letters-play\t{id}\t{mode}\t{step}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}",
                g.word().word,
                g.lanes().iter().collect::<String>(),
                g.position(),
                g.solved(),
                g.lives(),
                g.duration_ms(),
                g.finished(),
                g.seen().join("|")
            )?;
            let Some(letter) = g.letter() else { break };
            let lane = match (mode, step) {
                (_, 0) => Some(g.lanes().len()),
                (_, 1) => g.lanes().iter().position(|&ch| ch != letter),
                ("lose", _) => None,
                _ => g.lanes().iter().position(|&ch| ch == letter),
            };
            g.catch(lane, &mut draw);
        }
    }
    Ok(())
}

fn indices(values: &[usize]) -> String {
    values
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

fn choices(turn: &frames::Turn) -> String {
    turn.choices
        .iter()
        .map(|card| card.id)
        .collect::<Vec<_>>()
        .join("|")
}

fn frames_trace(out: &mut impl Write, album: frames::Album) -> io::Result<()> {
    let album_id = album.id();
    let mut draw = random(48);
    let mut seen = vec!["not-a-card"];
    for i in 0..=frames::deck(album).len() {
        let level = Level::ALL[i % Level::ALL.len()];
        let g = frames::Round::new(level, album, &seen, &mut draw);
        let item = g.turn().item;
        writeln!(
            out,
            "frames-deal\t{album_id}\t{i}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}",
            item.id,
            item.category,
            item.title,
            item.cue,
            item.src,
            item.author.unwrap_or("-"),
            item.meta.unwrap_or("-"),
            item.url.unwrap_or("-"),
            item.action.unwrap_or("-"),
            choices(g.turn()),
            g.seen().len()
        )?;
        seen = g.seen().to_vec();
    }
    for level in Level::ALL {
        let id = level.id();
        let mut draw = random(892);
        let mut g = frames::Round::new(level, album, &[], &mut draw);
        let tiles = frames::tile_count(level);
        while !g.finished() {
            let index = g.round_index();
            assert!(!g.advance(&mut draw) && !g.uncover(tiles) && g.guess(usize::MAX).is_none());
            if index == 0 {
                let closed = (0..tiles).find(|tile| !g.opened().contains(tile)).unwrap();
                assert!(g.uncover(closed));
                assert!(!g.uncover(closed));
            } else if index == 2 {
                for tile in 0..tiles {
                    g.uncover(tile);
                }
            }
            let turn = g.turn();
            let choose = turn
                .choices
                .iter()
                .position(|card| (card.id == turn.item.id) == (index != 1))
                .unwrap();
            let answer = g.guess(choose).unwrap();
            assert!(g.guess(choose).is_none() && !g.uncover(0));
            writeln!(
                out,
                "frames-play\t{album_id}\t{id}\t{index}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}",
                answer.item.id,
                indices(g.opened()),
                choices(g.turn()),
                answer.index,
                answer.correct,
                answer.points,
                g.score(),
                frames::max_points(level),
                g.seen().join("|")
            )?;
            assert!(g.advance(&mut draw));
        }
    }
    Ok(())
}
