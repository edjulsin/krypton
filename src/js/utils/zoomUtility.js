import { zoomIdentity } from 'd3'

import { curry } from 'ramda'

import { getRectConstrain } from './rectUtility'

const constrainZoomTranslate = curry((t, e, z) =>
    z.translate(
        ...getRectConstrain(
            t,
            e.map(p =>
                z.invert(p)
            )
        )
    )
)

const translateZoom = curry(([ x0, y0 ], [ x1, y1 ], t) =>
    zoomIdentity.translate(x0 - x1 * t.k, y0 - y1 * t.k).scale(t.k)
)

const translateZoomBy = curry(([ x, y ], t) =>
    t.translate(x / t.k, y / t.k)
)

const scaleZoom = curry((k, t) =>
    k === t.k
        ? t
        : zoomIdentity
            .translate(t.x, t.y)
            .scale(k)
)

const scaleZoomTo = curry((p, k, t) =>
    translateZoom(
        p,
        t.invert(p),
        scaleZoom(k, t)
    )
)

export {
    translateZoom,
    scaleZoom,
    translateZoomBy,
    scaleZoomTo,
    constrainZoomTranslate
}