// Private parser for the checked-in, validated exports from the JS banks.
pub(crate) fn rows<const N: usize>(text: &'static str) -> impl Iterator<Item = [&'static str; N]> {
    text.lines().skip(1).map(|line| {
        let mut fields = line.split('\t');
        let row = std::array::from_fn(|_| match fields.next().expect("missing export column") {
            "\\N" => "",
            field => field,
        });
        assert!(fields.next().is_none(), "extra export column");
        row
    })
}

pub(crate) fn optional(field: &str) -> Option<&str> {
    (!field.is_empty()).then_some(field)
}
