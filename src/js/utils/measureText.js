import { curry } from 'ramda';

const measureText = curry((context, text) => {
    const metric = context.measureText(text)
    const width = metric.width
    const height = metric.actualBoundingBoxDescent + metric.actualBoundingBoxAscent
    return [ width, height ]
})

export default measureText