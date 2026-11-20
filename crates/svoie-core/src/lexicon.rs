use std::{collections::HashSet, sync::OnceLock};

pub const ALPHABET: [char; 33] = [
    'а', 'б', 'в', 'г', 'ґ', 'д', 'е', 'є', 'ж', 'з', 'и', 'і', 'ї', 'й', 'к', 'л', 'м', 'н', 'о',
    'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ь', 'ю', 'я',
];
pub(crate) const UPPER_ALPHABET: [char; 33] = [
    'А', 'Б', 'В', 'Г', 'Ґ', 'Д', 'Е', 'Є', 'Ж', 'З', 'И', 'І', 'Ї', 'Й', 'К', 'Л', 'М', 'Н', 'О',
    'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ь', 'Ю', 'Я',
];

const FORM_TEXT: [&str; 4] = [
    include_str!(concat!(env!("OUT_DIR"), "/words-3.txt")),
    include_str!(concat!(env!("OUT_DIR"), "/words-4.txt")),
    include_str!(concat!(env!("OUT_DIR"), "/words-5.txt")),
    include_str!(concat!(env!("OUT_DIR"), "/words-6.txt")),
];

// Four forms accepted by the previous installed app but missing from this
// particular Hunspell edition.
const LEGACY: [&[&str]; 4] = [&["ток", "різ"], &["малю"], &["комом"], &[]];

static BANKS: [OnceLock<HashSet<Word>>; 4] = [
    OnceLock::new(),
    OnceLock::new(),
    OnceLock::new(),
    OnceLock::new(),
];

fn bank(length: usize) -> Option<&'static HashSet<Word>> {
    let index = length.checked_sub(3).filter(|&i| i < BANKS.len())?;
    Some(BANKS[index].get_or_init(|| {
        FORM_TEXT[index]
            .split_whitespace()
            .chain(LEGACY[index].iter().copied())
            .map(|word| Word::parse(word).expect("valid Ukrainian word bank"))
            .collect()
    }))
}

pub fn known_word(text: &str) -> bool {
    Word::parse(text).is_some_and(Word::is_known)
}

pub fn form_count(length: usize) -> usize {
    bank(length).map_or(0, HashSet::len)
}

pub(crate) fn typed_letter(ch: char) -> Option<char> {
    let mut chars = ch.to_lowercase();
    let letter = chars.next()?;
    (chars.next().is_none() && ALPHABET.contains(&letter)).then_some(letter)
}

// One 6-bit field per letter, indexed from 1. Keys are Copy, with no heap
// allocation for edit/dictionary checks. Words have 3–6 Ukrainian letters.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub(crate) struct Word {
    data: u64,
    length: u8,
}

impl Word {
    pub(crate) fn parse(text: &str) -> Option<Self> {
        if !(6..=12).contains(&text.len()) {
            return None;
        }
        let mut length = 0;
        let mut data = 0;
        for ch in text.chars() {
            if length == 6 {
                return None;
            }
            let index = ALPHABET.iter().position(|&letter| letter == ch)? + 1;
            data |= (index as u64) << (6 * length);
            length += 1;
        }
        (length >= 3).then_some(Self { data, length })
    }

    pub(crate) fn len(self) -> usize {
        self.length as usize
    }

    fn code(self, slot: usize) -> u8 {
        ((self.data >> (6 * slot)) & 63) as u8
    }

    pub(crate) fn at(self, slot: usize) -> char {
        ALPHABET[(self.code(slot) - 1) as usize]
    }

    pub(crate) fn is_known(self) -> bool {
        bank(self.len()).is_some_and(|words| words.contains(&self))
    }

    fn with_code(self, slot: usize, code: u8) -> Self {
        let shift = 6 * slot;
        Self {
            data: (self.data & !(63 << shift)) | (u64::from(code) << shift),
            ..self
        }
    }

    pub(crate) fn replace(self, slot: usize, letter: char) -> Option<Self> {
        let code = ALPHABET.iter().position(|&ch| ch == letter)? + 1;
        (slot < self.len()).then(|| self.with_code(slot, code as u8))
    }

    pub(crate) fn adjacent(self) -> impl Iterator<Item = Self> {
        let set = bank(self.len()).expect("valid length");
        (0..self.len()).flat_map(move |slot| {
            (1..=ALPHABET.len() as u8)
                .filter(move |&i| i != self.code(slot))
                .map(move |i| self.with_code(slot, i))
                .filter(|next| set.contains(next))
        })
    }
}

impl std::fmt::Display for Word {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        use std::fmt::Write;
        for i in 0..self.len() {
            formatter.write_char(self.at(i))?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn imports_all_words_and_preserves_ukrainian_letters() {
        let totals: Vec<_> = (3..=6).map(form_count).collect();
        assert_eq!(totals, [1374, 6837, 25979, 65103]);
        assert_eq!(totals.iter().sum::<usize>(), 99_293);
        for word in ["вішка", "ґанок", "їжак", "мрія", "комом"] {
            assert!(known_word(word), "{word}");
        }
        for word in ["ВІШКА", "ві-шка", "Vishka", "ґґґґґ", "д", "підручник"]
        {
            assert!(!known_word(word), "{word}");
        }
    }
}
