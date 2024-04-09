import { curry, compose, map, splitEvery, zipObj, transpose, on, unnest, adjust, append, reverse } from 'ramda';
import { getRectCenter, getRectSize, addRects, subtractRects, translateRect, getRectRelativePosition, getRectConstrain } from './rectUtility';
import { zipWithAdd } from './zipUtility';

const getMatrixInput = compose(
    map(v => v / 2),
    getRectSize
)

const getMatrix = ([ x, y ]) => ([
    [ -x, 0 ],
    [ 0, -y ],
    [ x, 0 ],
    [ 0, y ]
])

const getPlacementsMatrix = compose(
    getMatrix,
    getMatrixInput
)

const zipPlacements = zipObj([
    'offset',
    'constrain',
    'translate'
])

const formatPlacements = compose(
    splitEvery(4),
    map(zipPlacements),
    transpose
)

const getDeltas = compose(
    reverse,
    map(
        map(Math.abs)
    )
)

const getContainerPlacements = curry((cRect, dRect) => {
    const cMatrix = getPlacementsMatrix(cRect)
    const dMatrix = getPlacementsMatrix(dRect)
    const centers = subtractRects(cMatrix, dMatrix)
    const deltas = on(
        subtractRects,
        getDeltas,
        cMatrix,
        dMatrix
    )
    const starts = subtractRects(centers, deltas)
    const ends = addRects(centers, deltas)
    const center = on(
        getRectRelativePosition,
        getRectCenter,
        cRect,
        dRect
    )
    const offsets = map(
        zipWithAdd(center),
        unnest([ starts, centers, ends ])
    )
    const constrains = offsets.map(offset =>
        getRectConstrain(
            cRect,
            translateRect(offset, dRect)
        )
    )
    const translates = subtractRects(offsets, constrains)
    const appendCenter = adjust(
        1,
        append(
            zipPlacements([ center, [ 0, 0 ], center ])
        )
    )
    return appendCenter(
        formatPlacements([ offsets, constrains, translates ])
    )
})

const getCoordinatePlacements = curry((cRect, dRect, coordinate) => {
    const centers = getPlacementsMatrix(dRect)
    const deltas = getDeltas(centers)
    const starts = subtractRects(centers, deltas)
    const ends = addRects(centers, deltas)
    const center = getRectRelativePosition(
        coordinate,
        getRectCenter(dRect)
    )
    const offsets = map(
        zipWithAdd(center),
        unnest([ starts, centers, ends ])
    )
    const constrains = offsets.map(offset =>
        getRectConstrain(
            cRect,
            translateRect(offset, dRect)
        )
    )
    const translates = subtractRects(offsets, constrains)
    return formatPlacements([ offsets, constrains, translates ])
})

const getTargetPlacements = curry((cRect, tRect, dRect) => {
    const tMatrix = getPlacementsMatrix(tRect)
    const dMatrix = getPlacementsMatrix(dRect)
    const centers = addRects(tMatrix, dMatrix)
    const deltas = on(
        subtractRects,
        getDeltas,
        tMatrix,
        dMatrix
    )
    const starts = subtractRects(centers, deltas)
    const ends = addRects(centers, deltas)
    const center = on(
        getRectRelativePosition,
        getRectCenter,
        tRect,
        dRect
    )
    const offsets = map(
        zipWithAdd(center),
        unnest([ starts, centers, ends ])
    )
    const constrains = offsets.map(offset =>
        getRectConstrain(
            cRect,
            translateRect(offset, dRect)
        )
    )
    const translates = subtractRects(offsets, constrains)
    return formatPlacements([ offsets, constrains, translates ])
})

export { getPlacementsMatrix, getContainerPlacements, getCoordinatePlacements, getTargetPlacements }