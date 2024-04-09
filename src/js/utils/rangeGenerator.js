const rangeGenerator = (fn, min, max) =>
    fn(min) === min
        ? ([ min, max ])
        : min < max
            ? ([ min, ...rangeGenerator(fn, fn(min), max) ])
            : ([ max ])

export default rangeGenerator