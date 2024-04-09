import {
    head,
    curry,
    compose,
    apply,
    zipWith,
    ifElse,
    useWith,
    or,
    min,
    max,
    add,
    map,
    on,
    all,
    is,
    when,
    juxt,
    props,
    last,
    lt,
    clamp,
    curryN,
    unapply,
    gt
} from 'ramda'

import { zipWithSubtract, zipWithAdd, zipWithDivide, zipWithCall } from './zipUtility'

const isRect = all(is(Array))

const getBoundingClientRect = t => t.getBoundingClientRect()

const getNodeSize = compose(
    props([ 'width', 'height' ]),
    getBoundingClientRect
)

const getNodeWidth = compose(head, getNodeSize)

const getNodeHeight = compose(last, getNodeSize)

const getNodeRect = compose(
    juxt([
        props([ 'left', 'top' ]),
        props([ 'right', 'bottom' ])
    ]),
    getBoundingClientRect
)

const getRectSize = compose(
    map(Math.abs),
    apply(zipWithSubtract)
)

const getRectCenter = apply(
    zipWith((a, b) => (a + b) / 2)
)

const checkRectOverlap = curry((
    [ [ ax0, ay0 ], [ ax1, ay1 ] ],
    [ [ bx0, by0 ], [ bx1, by1 ] ]
) =>
    ax0 < bx1
    && ax1 > bx0
    && ay0 < by1
    && ay1 > by0
)

const checkPointOverlap = curry(([ x, y ], [ [ xMin, yMin ], [ xMax, yMax ] ]) =>
    x > xMin && x < xMax && y > yMin && y < yMax
)

const translateRect = curry((translate, box) =>
    map(zipWithAdd(translate), box)
)

const getRectOrigin = head

const getRectRelativePosition = on(
    zipWithSubtract,
    when(isRect, getRectOrigin)
)

const getRectScale = on(zipWithDivide, getRectSize)

const getNodesRect = map(getNodeRect)

const translateRectRelativeTo = curry((r0, r1) =>
    translateRect(getRectRelativePosition(r0, r1), r1)
)

const getRectWidth = compose(
    head,
    getRectSize
)

const getRectHeight = compose(
    last,
    getRectSize
)

const subtractRects = zipWith(zipWithSubtract)

const addRects = zipWith(zipWithAdd)

const getRectConstrain = curry((r0, r1) => {
    const half = v => v / 2
    const result = zipWith(
        ifElse(
            lt,
            compose(half, add),
            useWith(or, [ min(0), max(0) ])
        )
    )
    const offset = compose(
        apply(result),
        subtractRects
    )

    return offset(r1, r0)
})


const getNodeOrigin = compose(head, getNodeRect)

const getNodesSize = map(getNodeSize)

const clampSize = zipWith(
    clamp(0)
)

const clampNodeSize = on(clampSize, getNodeSize)

const rect = curry((origin, size) => {
    return [ origin, zipWithAdd(origin, size) ]
})

const clampRect = curry(([ min, max ], value) =>
    value.map(
        zipWithCall(
            zipWith(clamp, min, max)
        )
    )
)

const clampNodeRect = curryN(2)(
    compose(
        apply(clampRect),
        unapply(getNodesRect)
    )
)

const getNodeRectProps = node => ({
    rect: getNodeRect(node),
    size: getNodeSize(node),
    origin: getNodeOrigin(node)
})

const getRectProps = rect => ({
    size: getRectSize(rect),
    origin: getRectOrigin(rect)
})

const sizeOverflow = curry((s0, s1) =>
    or(
        ...zipWith(gt, s0, s1)
    )
)

export {
    rect,
    sizeOverflow,
    getNodeRectProps,
    getRectProps,
    clampSize,
    clampNodeSize,
    clampRect,
    clampNodeRect,
    getNodesSize,
    getBoundingClientRect,
    getNodesRect,
    getNodeOrigin,
    getRectConstrain,
    getRectSize,
    getNodeRect,
    getNodeSize,
    getRectOrigin,
    getRectCenter,
    getRectScale,
    getRectRelativePosition,
    translateRectRelativeTo,
    checkRectOverlap,
    translateRect,
    checkPointOverlap,
    getRectWidth,
    getRectHeight,
    subtractRects,
    addRects,
    getNodeWidth,
    getNodeHeight
}

