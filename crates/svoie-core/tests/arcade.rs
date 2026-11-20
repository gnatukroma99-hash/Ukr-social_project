use std::collections::HashSet;

use svoie_core::{
    arcade::{frames, letters, side},
    Level,
};

#[test]
fn side_round_stops_dealing_after_the_last_card_or_life() {
    assert_eq!(
        Level::ALL
            .iter()
            .map(|&level| side::deck(level).len())
            .sum::<usize>(),
        720
    );
    let mut draw = |_| 0;
    let mut round = side::Round::new(Level::Normal, &[], &[], &mut draw);
    for _ in 0..side::ROUND_SIZE {
        assert_eq!(
            round.pick(round.card().map(|card| card.language), &mut draw),
            Some(side::ResultKind::Correct)
        );
    }
    assert_eq!(round.score(), 10);
    assert_eq!(round.rotation().seen.len(), 10);
    assert!(round.card().is_none());
    assert_eq!(round.pick(None, &mut draw), None);

    let mut round = side::Round::new(Level::Hard, &[], &[], &mut draw);
    assert_eq!(round.pick(None, &mut draw), Some(side::ResultKind::Timeout));
    assert_eq!(round.pick(None, &mut draw), Some(side::ResultKind::Timeout));
    assert_eq!(
        (round.lives(), round.score(), round.rotation().seen.len()),
        (0, 0, 2)
    );
    assert!(round.card().is_none());
}

#[test]
fn letters_keep_art_and_deal_the_next_word_only_when_solved() {
    let cards = || Level::ALL.into_iter().flat_map(letters::deck);
    let all: HashSet<_> = cards().map(|card| card.word).collect();
    let illustrated: HashSet<_> = cards()
        .filter(|card| card.art.is_some())
        .map(|card| card.word)
        .collect();
    assert_eq!(all.len(), 136);
    assert_eq!(illustrated.len(), 69);

    let mut first = |_| 0;
    let mut round = letters::Round::new(Level::Easy, &[], &mut first);
    let word = round.word();
    assert_eq!(round.catch(Some(99), &mut first), None);
    assert_eq!(round.catch(None, &mut first), Some(letters::Catch::Timeout));
    assert_eq!(round.word(), word);
    assert_eq!(
        (round.position(), round.lives(), round.seen().len()),
        (0, 4, 1)
    );
    while let Some(letter) = round.letter() {
        let lane = round.lanes().iter().position(|&ch| ch == letter).unwrap();
        assert!(round.catch(Some(lane), &mut first).is_some());
    }
    assert_eq!(round.solved(), 5);
    assert_eq!(round.seen().len(), 5);
}

#[test]
fn frames_allow_only_one_guess_and_keep_the_two_albums_separate() {
    for album in frames::Album::ALL {
        let deck = frames::deck(album);
        assert_eq!(deck.len(), 48);
        assert!(deck
            .iter()
            .all(|card| card.url.is_some() == (album == frames::Album::Catalog)));
        let mut first = |_| 0;
        let mut round = frames::Round::new(Level::Hard, album, &[], &mut first);
        assert!(!round.advance(&mut first));
        while !round.finished() {
            assert!(round.uncover(0));
            let index = round
                .turn()
                .choices
                .iter()
                .position(|c| c.id == round.turn().item.id)
                .unwrap();
            let answer = round.guess(index).unwrap();
            assert!(answer.correct);
            assert_eq!(answer.points, 15);
            assert!(round.guess(index).is_none());
            assert!(!round.uncover(1));
            assert!(round.advance(&mut first));
        }
        assert_eq!((round.score(), round.seen().len()), (75, 5));
        assert!(!round.advance(&mut first));
    }
}
