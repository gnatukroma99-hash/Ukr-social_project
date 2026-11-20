use svoie_client::storage::{Appearance, Game, LocalState, ARCADE_KEY, PROFILE_KEY};
use svoie_core::{arcade::frames::Album, Level};

#[test]
fn opens_real_key_shapes_without_touching_session_credentials() {
    let profile = r#"{
        "saved":["yt-1","pod-1"],
        "days":{"2026-11-20":{"done":[{"id":"p1-1","points":20}],"starts":{}}},
        "active":"http://localhost:8080",
        "sessions":{"http://localhost:8080":{"token":"not-a-real-token"}}
    }"#;
    let arcade = r#"{
        "levels":{"frames":"hard", "word":"normal"}, "album":"art",
        "frameSeen":{"art":["hedgehog"],"catalog":["yt-1"]},
        "byLevel":{
            "hard":{"frameBest":{"catalog":45,"art":73}},
            "normal":{"wordRound":{"target":"казка","draft":"ҐА","guesses":["вішка"]},"wordWins":7}
        }
    }"#;
    let state = LocalState::restore(Some(profile), Some(arcade), Some("dawn"));
    assert_eq!(state.appearance, Appearance::Dawn);
    assert_eq!(state.bookmark_ids().collect::<Vec<_>>(), ["yt-1", "pod-1"]);
    assert_eq!(
        state.offline_days().unwrap()["2026-11-20"]["done"][0]["points"],
        20
    );
    assert_eq!(state.arcade.level(Game::Frames), Level::Hard);
    assert_eq!(state.arcade.album(), Album::Art);
    assert_eq!(state.arcade.seen_frames(Album::Catalog), ["yt-1"]);
    assert_eq!(state.arcade.seen_frames(Album::Art), ["hedgehog"]);
    assert_eq!(state.arcade.records(Level::Hard).frame_best["art"], 73);
    let round = state
        .arcade
        .resume_word(Level::Normal, |_| panic!("must restore prior answer"));
    assert_eq!(round.draft(), "ґа");
    assert_eq!(round.guesses()[0].word, "вішка");

    let before = serde_json::to_string(&state.arcade).unwrap();
    let reopened = LocalState::restore(Some(profile), Some(&before), Some("dawn"));
    let after = serde_json::to_string(&reopened.arcade).unwrap();
    assert_eq!(before, after);
    assert!(!after.contains("not-a-real-token"));
}

#[test]
fn keeps_existing_difficulties_and_only_migrates_older_records_to_normal() {
    let legacy = r#"{"best":8,"arcadeRotation":{"seen":["Родина"],"recent":["Родина"]},
        "miniRecords":{"letters":4,"frames":32,"ladder":{"кіт-тут":2},"puzzle":6}}"#;
    let state = LocalState::restore(Some(legacy), None, None);
    for level in [Level::Easy, Level::Hard] {
        assert_eq!(state.arcade.records(level).side_best, 0);
        assert_eq!(state.arcade.records(level).frame_best["catalog"], 0);
    }
    let normal = state.arcade.records(Level::Normal);
    assert_eq!(normal.side_best, 8);
    assert_eq!(normal.side_rotation.seen, ["Родина"]);
    assert_eq!(normal.letters_best, 4);
    assert_eq!(normal.frame_best["catalog"], 32);
    assert_eq!(normal.frame_best["art"], 0);
    assert_eq!(normal.ladder_best.get("кіт-тут"), Some(&2));
    assert_eq!(normal.ladder_index, 6);
    let newer = LocalState::restore(
        Some(legacy),
        Some(r#"{"byLevel":{"hard":{"sideBest":9}}}"#),
        None,
    );
    assert_eq!(newer.arcade.records(Level::Normal).side_best, 0);
    assert_eq!(newer.arcade.records(Level::Hard).side_best, 9);
}

#[test]
fn flags_unreadable_data_so_a_host_can_avoid_overwriting_it() {
    let state = LocalState::restore(Some("{"), Some("7"), Some("unknown"));
    assert_eq!(state.unreadable_keys(), [PROFILE_KEY, ARCADE_KEY]);
    assert_eq!(state.appearance, Appearance::Dark);
    assert!(state.bookmark_ids().next().is_none());
    assert_eq!(state.arcade.level(Game::Side), Level::Normal);
    assert_eq!(state.arcade.records(Level::Normal).side_best, 0);
}
