import { bisector } from 'd3'
import { curry } from 'ramda'

const binarySearch = curry((fn, val, arr) =>
    bisector(fn).center(arr, val)
)

export default binarySearch