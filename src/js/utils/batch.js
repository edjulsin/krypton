import { curry } from 'ramda';

export default curry((fns, val) =>
    fns.forEach(fn => fn(val))
)