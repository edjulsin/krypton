import { curry, isEmpty, compose, not, identity, complement, allPass, split, join, promap, filter, reduce, isNil, o, prop, ifElse, add, pathSatisfies, __ } from 'ramda'
import React, { useState } from 'react'
import { appendClassName, constrain, noDefault } from '../utils'
import Button from './Button'
import { useEffect } from './hooks'

const allowedNumericInputs = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9'
]

const allowedDecimalInputs = [ ...allowedNumericInputs, '.', ',' ]

const removeMultiplePoints = reduce((a, b) => (
    b === '.' || b === ','
        ? a.includes('.') ? a : a.concat([ '.' ])
        : a.concat([ b ])
), [])

const pipeNumberInput = promap(
    split(''),
    join('')
)

const sanitizeNumericInput = pipeNumberInput(
    filter(v => allowedNumericInputs.includes(v))
)

const sanitizeDecimalInput = pipeNumberInput(
    compose(
        removeMultiplePoints,
        filter(v => allowedDecimalInputs.includes(v))
    )
)

const sanitizeInput = curry((mode, input) =>
    (mode === 'numeric' ? sanitizeNumericInput : sanitizeDecimalInput)(input + '')
)

const validateNumber = compose(not, isNaN, Number)

const validateInput = allPass([
    complement(isEmpty),
    validateNumber
])

export default ({
    title = '',
    id = '',
    mode = 'numeric',
    defaultValue = 5,
    value = null,
    min = 0,
    max = 10,
    step = 1,
    focus = false,
    onChange = identity,
    className = '',
    ...props
}) => {

    const [ ref, setRef ] = useState({})

    const [ input, setInput ] = useState(() => defaultValue + '')

    const setInputFromValue = o(
        setInput,
        v => v + ''
    )

    const refValue = isNil(value) ? defaultValue : value

    const refCallback = isNil(value) ? setInputFromValue : onChange

    const onInputChange = curry((sanitizer, event) =>
        setInput(
            sanitizer(event.target.value)
        )
    )

    const formatValue = constrain(min, max, step)

    const callback = v =>
        v === formatValue(refValue)
            ? setInputFromValue(v)
            : refCallback(v)

    const onSuccess = o(
        callback,
        formatValue
    )

    const onFailure = () => setInput(refValue)

    const sanitizer = sanitizeInput(mode)

    const evaluate = curry((onFailure, onSuccess, value, event) => {
        if(validateInput(value)) {
            onSuccess({ value, event })
        } else {
            onFailure({ value, event })
        }
    })

    const valueAsNumber = o(
        Number,
        prop('value')
    )

    const run = o(
        evaluate(onFailure, __, input),
        o(onSuccess)
    )

    const onBlurChange = run(valueAsNumber)

    const increment = o(
        add(step),
        valueAsNumber
    )

    const decrement = o(
        add(-step),
        valueAsNumber
    )

    const onWheelChange = run(
        ifElse(
            pathSatisfies(v => v < 0, [ 'event', 'deltaY' ]),
            increment,
            decrement
        )
    )

    const onPointerDown = noDefault(() => ref.focus())

    useEffect(setInputFromValue, [ refValue ])

    useEffect((ref, focus) => ref[ focus ? 'focus' : 'blur' ](), [ ref, focus ])

    return (
        <div
            className={ appendClassName('number', className) }
            { ...props }
        >
            <input
                ref={ setRef }
                title={ title }
                id={ id }
                className='number-input'
                type='text'
                inputMode={ mode }
                required={ true }
                value={ input }
                onChange={ onInputChange(sanitizer) }
                onBlur={ onBlurChange }
                onWheel={ onWheelChange }
            />
            <menu
                className='number-menu'
                onPointerDown={ onPointerDown }
            >
                {
                    [
                        [ 'angleup', 'Increase', increment ],
                        [ 'angledown', 'Decrease', decrement ]
                    ].map(([ id, title, onClick ]) =>
                        <li key={ id } className='number-menu-list'>
                            <Button
                                className={ 'number-menu-' + title.toLowerCase() }
                                display='block'
                                title={ title }
                                onClick={ run(onClick) }
                            >
                            </Button>
                        </li>
                    )
                }
            </menu>
        </div>
    )
}