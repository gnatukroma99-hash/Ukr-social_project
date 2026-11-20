//! Offline games. The host supplies random indices and handles timers and storage.
//! Each `draw(n)` must return an index in `0..n`, just like `floor(random()*n)`.

pub mod frames;
pub mod letters;
pub mod side;

use std::collections::HashSet;

fn known<T>(
    history: &[&str],
    pool: &'static [T],
    id: impl Fn(&T) -> &'static str,
) -> Vec<&'static str> {
    let ids: HashSet<_> = pool.iter().map(id).collect();
    unique(history.iter().filter_map(|word| ids.get(*word).copied()))
}

fn unique(values: impl IntoIterator<Item = &'static str>) -> Vec<&'static str> {
    let mut seen = HashSet::new();
    values.into_iter().filter(|&id| seen.insert(id)).collect()
}

fn prefer<T>(pool: &mut Vec<T>, wanted: impl Fn(&T) -> bool) {
    if pool.iter().any(&wanted) {
        pool.retain(wanted);
    }
}

fn shuffle<T>(list: &mut [T], draw: &mut impl FnMut(usize) -> usize) {
    for i in (1..list.len()).rev() {
        list.swap(i, draw(i + 1));
    }
}

// Advance persistent rotation when an item becomes visible, not when the
// round starts. A player who quits early keeps the rest of the deck unseen.
fn deal<T>(
    pool: &'static [T],
    seen: &mut Vec<&'static str>,
    played: impl IntoIterator<Item = &'static str>,
    id: impl Fn(&T) -> &'static str,
    preferred: impl Fn(&T) -> bool,
    draw: &mut impl FnMut(usize) -> usize,
) -> &'static T {
    let recent: HashSet<_> = seen.iter().rev().take(5).copied().collect();
    if seen.len() == pool.len() {
        seen.clear();
    }
    let previous: HashSet<_> = seen.iter().copied().collect();
    let blocked: HashSet<_> = played.into_iter().collect();
    let mut fresh: Vec<_> = pool
        .iter()
        .filter(|item| !previous.contains(id(item)))
        .collect();
    prefer(&mut fresh, |item| !blocked.contains(id(item)));
    prefer(&mut fresh, |item| !recent.contains(id(item)));
    prefer(&mut fresh, |item| preferred(item));
    let item = fresh[draw(fresh.len())];
    seen.push(id(item));
    item
}
