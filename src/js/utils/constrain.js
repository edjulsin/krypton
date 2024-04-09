import { clamp, curry } from 'ramda'

const constrain = curry((min, max, step, value) =>
    clamp(
        min,
        max,
        min + step * Math.round(Math.abs(value - min) / step)
    )
)

export default constrain