
import React, { memo, useState } from 'react'
import { useEffect, useRef } from './hooks'
import { appendClassName, batch, getNodeSize, pointer, resizeObserver } from '../utils'
import { both, curry, either, zipObj, identity } from 'ramda'
import { select, zoom, zoomIdentity } from 'd3'

const devicePixelRatio = window.devicePixelRatio || 1

const propEqual = curry((name, value, obj) =>
    obj[ name ] === value
)

const eventTypeIs = propEqual('type')

const ctrlKeyIs = propEqual('ctrlKey')

const isDragEvent = either(
    eventTypeIs('mousemove'),
    eventTypeIs('touchmove')
)

const isWheelEvent = both(
    eventTypeIs('wheel'),
    ctrlKeyIs(false)
)

const isPinchEvent = both(
    eventTypeIs('wheel'),
    ctrlKeyIs(true)
)

const isDblClickEvent = eventTypeIs('dblclick')

const Canvas = memo(({
    onZoomStart = identity,
    onZoom = identity,
    onZoomEnd = identity,
    onResize = identity,
    className = '',
    onContext = identity,
    children,
    ...attributes
}) => {

    const [ container, setContainer ] = useState({})

    const [ transform, setTransform ] = useRef(zoomIdentity)

    const [ size, setSize ] = useState([])

    const [ back, setBack ] = useState({})

    const [ front, setFront ] = useState({})

    const cssSize = zipObj(
        [ 'width', 'height' ],
        size.map(v => v + 'px')
    )

    const attSize = zipObj(
        [ 'width', 'height' ],
        size.map(v => v * devicePixelRatio)
    )

    const getMovementDelta = movement => Math.pow(2, -movement * 0.002)

    useEffect(container => {
        const selection = select(container)

        const subscription = resizeObserver([ container ]).subscribe(() =>
            batch(
                [ setSize, onResize ],
                getNodeSize(container).map(Math.round)
            )
        )

        const onEvent = curry((callback, event) => {
            const e = event.sourceEvent
            const [ width, height ] = getNodeSize(container)
            const t0 = transform.current
            const t1 = event.transform
            const [ px, py ] = pointer(e.type === 'touchend' ? e.changedTouches : e, container)

            callback({
                dx: t1.x - t0.x,
                dy: t1.y - t0.y,
                dk: t1.k / t0.k,
                dxk: getMovementDelta(t1.x - t0.x),
                dyk: getMovementDelta(t1.y - t0.y),
                pinched: isPinchEvent(e),
                wheeled: isWheelEvent(e),
                dragged: isDragEvent(e),
                dblClicked: isDblClickEvent(e),
                scaled: t1.k / t0.k !== 1,
                translated: Boolean(t1.x - t0.x || t1.y - t0.y),
                px: px,
                py: py,
                width: width,
                height: height
            })

            setTransform(event.transform)
        })

        selection.call(
            zoom()
                .on('start', onEvent(onZoomStart))
                .on('zoom', onEvent(onZoom))
                .on('end', onEvent(onZoomEnd))
                .wheelDelta(e => -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002) * 1) // default d3 without ctrl scalar
        )

        return () => {
            subscription.unsubscribe()
            selection.on('.zoom', null)
        }
    }, [ container ])

    useEffect((back, front) => {
        onContext(
            [ back, front ].map(v =>
                v.getContext('2d')
            )
        )

        return () => onContext([])
    }, [ back, front ])

    return (
        <div
            className={ appendClassName('canvas', className) }
            ref={ setContainer }
            { ...attributes }
        >
            <canvas
                className='canvas-back'
                ref={ setBack }
                style={ cssSize }
                { ...attSize }
            />
            <canvas
                className='canvas-front'
                ref={ setFront }
                style={ cssSize }
                { ...attSize }
            />
            { children }
        </div>
    )
})

export default Canvas