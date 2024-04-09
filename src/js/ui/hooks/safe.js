import { none, ifElse, is, identity, always, compose } from 'ramda'
import { nilOrEmpty } from '../../utils'

const safeReturn = ifElse(
    is(Function),
    identity,
    always
)

const safeCall = (cb, ...args) =>
    cb.length === 0 || none(nilOrEmpty, args)
        ? cb(...args)
        : undefined

const safe = compose(safeReturn, safeCall)

export default safe