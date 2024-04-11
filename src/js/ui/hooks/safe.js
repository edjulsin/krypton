import { none, is, always, compose, unless } from 'ramda'
import { nilOrEmpty } from '../../utils'

const safeReturn = unless(is(Function), always)

const safeCall = (cb, ...args) =>
    cb.length === 0 || none(nilOrEmpty, args)
        ? cb(...args)
        : undefined

const safe = compose(safeReturn, safeCall)

export default safe