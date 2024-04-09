import { splitAt } from 'ramda'

const splitSymbol = symbol =>
    symbol.includes(':')
        ? symbol.slice(1).split(':')
        : splitAt(
            3,
            symbol.slice(1)
        )

export default splitSymbol