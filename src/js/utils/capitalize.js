
import { ap, compose, concat, toUpper, head, tail, join, map, split } from 'ramda'

const capitalizeWord = ap(
    compose(
        concat,
        toUpper,
        head
    ),
    tail
)

const capitalizeWords = compose(
    join(' '),
    map(capitalizeWord),
    split(' ')
)


export { capitalizeWord, capitalizeWords }