import { drag, select } from 'd3'
import { curry, map, o } from 'ramda'
import React, { useState } from 'react'
import { appendClassName, getNodeSize, resizeObserver } from '../utils'
import { useEffect } from './hooks'

const Slider = ({
    className = '',
    onResize = identity,
    onDragStart = identity,
    onDrag = identity,
    onDragEnd = identity,
    pointerFill = 'white',
    x = 0,
    y = 0,
    ...attributes
}) => {
    const [ track, setTrack ] = useState({})
    const [ pointer, setPointer ] = useState({})

    useEffect((track, pointer) => {
        const refs = [ track, pointer ]
        const selections = refs.map(ref =>
            select(ref)
        )

        const onEvent = curry((callback, event) =>
            callback({
                x: event.x,
                y: event.y,
                track: getNodeSize(track).map(Math.round),
                pointer: getNodeSize(pointer).map(Math.round)
            })
        )

        const subscription = resizeObserver(refs).subscribe(() =>
            onResize(
                refs.map(
                    o(map(Math.round), getNodeSize)
                )
            )
        )

        selections.forEach(selection =>
            selection.call(
                drag()
                    .on('start', onEvent(onDragStart))
                    .on('drag', onEvent(onDrag))
                    .on('end', onEvent(onDragEnd))
                    .container(track)
            )
        )

        return () => {
            selections.forEach(selection =>
                selection.on('.drag', null)
            )
            subscription.unsubscribe()
        }
    }, [ track, pointer ])

    return (
        <div
            ref={ setTrack }
            className={ appendClassName('slider', className) }
            { ...attributes }
        >
            <span
                ref={ setPointer }
                className='slider-pointer'
                style={ { transform: `translate(${[ x, y ].map(v => `calc(${v}px - 50%)`).join(', ')})` } }
            >
                <span
                    className='slider-pointer-fill'
                    style={ { backgroundColor: pointerFill } }
                />
            </span>
        </div>
    )
}

export default Slider