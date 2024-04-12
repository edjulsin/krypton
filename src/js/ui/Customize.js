import React, { memo, useCallback, useId, useState } from 'react'
import { appendClassName, batch, capitalizeWord, pixelToRem, singleton } from '../utils'
import { TargetPlacements } from './Placement'
import { scaleLinear } from 'd3'
import { useEffect, useRef } from './hooks'
import { assoc, compose, curry, identity, map, path, uniq, when, equals, last, init, clamp, toUpper, o, prop, modify, __, props, isNil, juxt, not, chain, append, mergeLeft } from 'ramda'
import Icon from './Icon'
import Button from './Button'
import interlace from '../../assets/images/misc/interlace.svg?url'
import Select from './Select'
import { colord, getFormat, extend } from 'colord'
import namesPlugin from 'colord/plugins/names'
import Slider from './Slider'

extend([ namesPlugin ])

const Check = <Icon name='check' />

const Uncheck = <Icon name='check' style={ { visibility: 'hidden' } } />

const mixin = range =>
    scaleLinear()
        .domain([ 0, 100 ])
        .rangeRound(range)
        .clamp(true)

const hue = range => scaleLinear()
    .domain([ 0, 360 ])
    .rangeRound(range)
    .clamp(true)

const alpha = range => scaleLinear()
    .domain([ 0, 1 ])
    .rangeRound(range)
    .clamp(true)


const colorMode = color => 'v' in color ? 'hsv' : 'hsl'

const brightnessKey = compose(last, colorMode)

const clampPercent = clamp(0, 100)

const clampRGB = clamp(0, 255)

const clampHue = clamp(0, 360)

const toStr = v => v + ''

const getInputValue = compose(
    toStr,
    path([ 'target', 'value' ])
)

const getInputValueAsNumber = compose(
    Number,
    when(compose(equals('%'), last), init),
    getInputValue
)

const validateStringInput = compose(
    v => v.isValid(),
    colord,
    getInputValue
)

const validateNumberInput = compose(
    not,
    isNaN,
    getInputValueAsNumber
)

const round = v => Math.round(v)

const mulByHundreds = v => v * 100

const divByHundreds = v => v / 100

const roundAlpha = compose(divByHundreds, round, mulByHundreds)

const toPercentString = o(v => v + '%', round)

const alphaToPercentString = o(toPercentString, mulByHundreds)

const rounds = map(round)

const Input = ({
    focus,
    value,
    callback,
    validate,
    ...attributes
}) => {
    const [ ref, setRef ] = useState({})
    const [ input, setInput ] = useState(() => value)

    const onInputChange = compose(setInput, getInputValue)

    const onInputBlur = curry((value, e) => {
        if(validate(e)) {
            callback(e)
        } else {
            setInput(value)
        }
    })

    useEffect((ref, focus) => {
        if(focus) {
            ref.focus()
        } else {
            ref.blur()
        }
    }, [ ref, focus ])

    useEffect(setInput, [ value ])

    return (
        <input
            ref={ setRef }
            className='customize-channel-input'
            type='text'
            value={ input }
            onChange={ onInputChange }
            onBlur={ value === input ? v => v : onInputBlur(value) }
            { ...attributes }
        />
    )
}

const Inputs = ({ data }) => (
    <ul className='customize-channel-inputs'>
        {
            data.map((attributes, key) =>
                <li key={ key } className='customize-channel-item'>
                    <Input focus={ key === 0 } { ...attributes } />
                </li>
            )
        }
    </ul>
)

const Hex = ({ id, value, onChange }) => {

    const formatHex = compose(
        toUpper,
        v => v.alpha(1).toHex(),
        colord
    )

    const onHex = curry((value, e) =>
        onChange(
            colord(getInputValue(e)).alpha(value.a).toHsv()
        )
    )

    const onAlpha = curry((value, e) =>
        onChange({
            ...value,
            a: clampPercent(getInputValueAsNumber(e) / 100)
        })
    )

    return (
        <Inputs
            data={ [
                {
                    id: id + 'hex',
                    callback: onHex(value),
                    validate: validateStringInput,
                    value: formatHex(value)
                },
                {
                    id: id + 'hexalpha',
                    callback: onAlpha(value),
                    validate: validateNumberInput,
                    value: alphaToPercentString(value.a)
                }
            ] }
        />
    )
}

const RGBKeys = [ 'r', 'g', 'b' ]
const RGBIds = [ 'red', 'green', 'blue' ]

const RGB = ({ id, value, onChange }) => {

    const formatRgb = compose(
        rounds,
        props(RGBKeys),
        v => v.toRgb(),
        colord
    )

    const onRgb = curry((key, value, e) =>
        onChange(
            colord({
                ...colord(value).toRgb(),
                [ key ]: clampRGB(
                    getInputValueAsNumber(e)
                )
            }).toHsv()
        )
    )

    const onAlpha = curry((value, e) =>
        onChange({
            ...value,
            a: clampPercent(getInputValueAsNumber(e) / 100)
        })
    )

    return (
        <Inputs
            data={
                formatRgb(value).map((input, idx) => {
                    return {
                        id: id + RGBIds[ idx ],
                        callback: onRgb(RGBKeys[ idx ], value),
                        validate: validateNumberInput,
                        value: input
                    }
                }).concat([ {
                    id: id + 'rgbalpha',
                    callback: onAlpha(value),
                    validate: validateNumberInput,
                    value: alphaToPercentString(value.a)
                } ])
            }
        />
    )
}

const CSS = ({ id, value, onChange }) => {

    const [ format, setFormat ] = useState('rgb')

    const formatInput = curry((format, value) => {
        if(format === 'hsl') {
            const { s, l } = rounds(colord(value).toHsl())
            return `hsla(${value.h}, ${s}, ${l}, ${roundAlpha(value.a)})`
        } else if(format === 'rgb') {
            const { r, g, b } = rounds(colord(value).toRgb())
            return `rgba(${r}, ${g}, ${b}, ${roundAlpha(value.a)})`
        } else {
            return colord(value).toHex()
        }
    })

    const onCSS = curry((format, e) => {
        const value = getInputValue(e)
        const color = colord(value)
        setFormat(
            getFormat(value) || format
        )
        onChange(
            color.toHsv()
        )
    })

    return (
        <Inputs
            data={ singleton({
                id: id + 'css',
                callback: onCSS(format),
                validate: validateStringInput,
                value: formatInput(format, value)
            }) }
        />

    )
}

const Common = ({ id, value, onChange }) => {

    const getKeys = value => 'l' in value
        ? ([ 'h', 's', 'l' ])
        : ([ 'h', 's', 'v' ])

    const formatColor = compose(
        rounds,
        chain(props, getKeys)
    )

    const onValues = curry((idx, value, e) => {
        const key = getKeys(value)[ idx ]
        const clamp = key === 'h' ? clampHue : clampPercent
        onChange({
            ...value,
            [ key ]: clamp(
                getInputValueAsNumber(e)
            )
        })
    })

    const onValue = curry((value, e) =>
        onChange({
            ...value,
            a: clampPercent(getInputValueAsNumber(e) / 100)
        })
    )

    const keys = getKeys(value)

    return (
        <Inputs
            data={
                formatColor(value).map((input, idx) => {
                    return {
                        id: id + keys[ idx ],
                        callback: onValues(idx, value),
                        validate: validateNumberInput,
                        value: input
                    }
                }).concat([ {
                    id: id + keys.join('') + 'alpha',
                    callback: onValue(value),
                    validate: validateNumberInput,
                    value: alphaToPercentString(value.a)
                } ])
            }
        />
    )
}

const splitByAlpha = compose(
    juxt([
        v => v.alpha(1).toHex(),
        v => v.toHex()
    ]),
    colord
)

const Preview = ({ title = '', color, ...props }) => (
    <Button title={ title } { ...props }>
        <span className='customize-preview'>
            {
                splitByAlpha(color).map((c, k) =>
                    <span
                        key={ k }
                        className='customize-preview-split'
                        style={ { backgroundColor: c } }
                    />
                )
            }
        </span>
    </Button>
)

const Mixin = ({
    mode,
    value,
    onStart,
    onChange,
    onEnd
}) => {
    const [ [ mx, my ], setMixin ] = useState([ () => 0, () => 0 ])

    const onResize = ([ [ width, height ] ]) => setMixin([
        mixin([ 0, width ]),
        mixin([ height, 0 ])
    ])

    const onDrag = ({ track: [ width, height ], x, y }) => onChange([
        mixin([ 0, width ]).invert(x),
        mixin([ height, 0 ]).invert(y)
    ])

    const onDragStart = batch([ onDrag, onStart ])

    const onDragEnd = batch([ onDrag, onEnd ])

    return (
        <Slider
            className={ appendClassName('customize-mixin', `customize-mixin-${mode}`) }
            pointerFill={ colord(value).alpha(1).toHex() }
            style={ { backgroundColor: colord({ h: value.h, s: 100, l: 50 }).toHex() } }
            onResize={ onResize }
            onDragStart={ onDragStart }
            onDrag={ onDrag }
            onDragEnd={ onDragEnd }
            x={ mx(value.s) }
            y={ my(value[ last(mode) ]) }
        />
    )
}

const Hue = ({
    value,
    onStart,
    onChange,
    onEnd
}) => {
    const [ scale, setScale ] = useState(() => () => 0)
    const [ middle, setMiddle ] = useState(0)

    const onResize = ([ [ tWidth ], [ pWidth, pHeight ] ]) => {
        setScale(() =>
            hue([ pWidth / 2, tWidth - pWidth / 2 ])
        )
        setMiddle(pHeight / 2)
    }

    const onDrag = ({ track: [ tWidth ], pointer: [ pWidth ], x }) => {
        onChange(
            hue([ pWidth / 2, tWidth - pWidth / 2 ]).invert(x)
        )
    }

    const onDragStart = batch([ onDrag, onStart ])

    const onDragEnd = batch([ onDrag, onEnd ])

    return (
        <Slider
            className='customize-hue'
            pointerFill={ colord({ h: value.h, s: 100, l: 50 }).toHex() }
            onResize={ onResize }
            onDragStart={ onDragStart }
            onDrag={ onDrag }
            onDragEnd={ onDragEnd }
            x={ scale(value.h) }
            y={ middle }
        />
    )
}

const Alpha = ({
    value,
    onStart,
    onChange,
    onEnd
}) => {

    const [ scale, setScale ] = useState(() => () => 0)
    const [ middle, setMiddle ] = useState(0)

    const color = colord(value)

    const onResize = ([ [ tWidth ], [ pWidth, pHeight ] ]) => {
        setScale(() =>
            alpha([ pWidth / 2, tWidth - pWidth / 2 ])
        )
        setMiddle(pHeight / 2)
    }

    const onDrag = ({ track: [ tWidth ], pointer: [ pWidth ], x }) => {
        onChange(
            alpha([ pWidth / 2, tWidth - pWidth / 2 ]).invert(x)
        )
    }

    const onDragStart = batch([ onDrag, onStart ])

    const onDragEnd = batch([ onDrag, onEnd ])

    return (
        <Slider
            className='customize-alpha'
            style={ {
                backgroundImage: `
                    linear-gradient(to right, transparent, ${color.alpha(1).toHex()}),
                    url(${interlace})
                `
            } }
            pointerFill={ color.toHex() }
            onResize={ onResize }
            onDragStart={ onDragStart }
            onDrag={ onDrag }
            onDragEnd={ onDragEnd }
            x={ scale(value.a) }
            y={ middle }
        />
    )
}

const Presets = ({
    value,
    onChange
}) => {

    const [ presets, setPresets ] = useState([])

    return (
        <menu className='customize-presets'>
            <li className='customize-presets-item'>
                <Button
                    title='Add to Presets'
                    onClick={ () =>
                        setPresets(
                            compose(
                                uniq,
                                append(value)
                            )
                        )
                    }
                >
                    <Icon name='plus' />
                </Button>
            </li>
            {
                presets.map((value, key) =>
                    <li className='customize-presets-item' key={ key }>
                        <Preview
                            title='Select Color'
                            color={ value }
                            onClick={ () => onChange(value) }
                        />
                    </li>
                )
            }
        </menu >
    )
}

const Line = ({
    style,
    thickness,
    onStyleChange,
    onThicknessChange
}) => {
    const Thickness = thickness
        ? (
            <li className='customize-stroke-type'>
                <span className='customize-stroke-label'>
                    Thickness
                </span>
                <menu className='customize-stroke-list'>
                    {
                        ([ 1, 2, 3, 4 ]).map(id =>
                            <li key={ id } className='customize-stroke-item'>
                                <Button
                                    title={ id + 'px' }
                                    display='block'
                                    round={ false }
                                    highlighted={ id === Number(thickness) }
                                    onClick={ () => onThicknessChange(id) }
                                >
                                    <span
                                        className='customize-stroke-icon'
                                        style={ { height: pixelToRem(id) + 'rem', backgroundColor: 'currentcolor' } }
                                    />
                                </Button>
                            </li>
                        )
                    }
                </menu>
            </li>
        )
        : null
    const Style = style
        ? (
            <li className='customize-stroke-type'>
                <span className='customize-stroke-label'>
                    Style
                </span>
                <menu className='customize-stroke-list'>
                    {
                        ([ 'solid', 'dashed', 'dotted' ]).map(id =>
                            <li key={ id } className='customize-stroke-item'>
                                <Button
                                    title={ capitalizeWord(id) }
                                    display='block'
                                    round={ false }
                                    highlighted={ id === style }
                                    onClick={ () => onStyleChange(id) }
                                >
                                    <span
                                        className='customize-stroke-icon'
                                        style={ { borderWidth: '1px', borderStyle: id, borderColor: 'currentcolor' } }
                                    />
                                </Button>
                            </li>
                        )
                    }
                </menu>
            </li>
        )
        : null
    return (
        <ul className='customize-stroke'>
            { Thickness }
            { Style }
        </ul>
    )
}

const Channel = ({
    control,
    clear,
    value,
    onChange,
    setMode
}) => {
    const id = useId()
    const [ channel, setChannel ] = useState({
        id: 'hex',
        input: Hex
    })

    const [ menu, setMenu ] = useState(() => {
        const channels = [
            [ 'hex', Hex, true, 'hsv' ],
            [ 'rgb', RGB, false, 'hsv' ],
            [ 'css', CSS, false, 'hsv' ],
            [ 'hsl', Common, false, 'hsl' ],
            [ 'hsv', Common, false, 'hsv' ]
        ]

        const generate = ([ id, input, value, mode ]) => ({
            id: id,
            center: toUpper(id),
            right: value ? Check : Uncheck,
            onClick: () => {
                setMenu(
                    map(v => {
                        return {
                            ...v,
                            right: id === v.id ? Check : Uncheck
                        }
                    })
                )
                setChannel({ id, input })
                setMode(mode)
            }
        })

        return channels.map(generate)
    })

    return (
        <div className='customize-channel'>
            <div className='customize-channel-select'>
                <Select
                    clear={ clear }
                    data={ menu }
                    alignment='center'
                    direction='top'
                    control={ control }
                >
                    { toUpper(channel.id) }
                </Select>
            </div>
            <channel.input
                id={ id }
                value={ value }
                onChange={ onChange }
            />
        </div>
    )
}

const Color = ({
    control,
    value,
    onChange,
    clear
}) => {
    const [ state, setState ] = useRef({
        hsl: { h: 0, s: 0, l: 0, a: 1 },
        hsv: { h: 0, s: 0, v: 0, a: 1 },
        mode: 'hsv'
    })

    const [ mode, setMode ] = useState('hsv')

    const [ active, setActive ] = useState(false)

    const color = state.current[ mode ]

    const toState = color => ({
        hsl: 'l' in color
            ? color
            : ({ ...colord(color).toHsl(), h: color.h, a: color.a })
        ,
        hsv: 'v' in color
            ? color
            : ({ ...colord(color).toHsv(), h: color.h, a: color.a })
    })

    const changeMode = useCallback(batch([
        setMode,
        compose(
            setState,
            assoc('mode')
        )
    ]), [])

    const callback = batch([
        o(setState, mergeLeft),
        compose(
            onChange,
            v => colord(v).toHex(),
            prop('hsl')
        )
    ])

    const onValueChange = o(callback, toState)

    const onStart = () => setActive(true)

    const onEnd = () => setActive(false)

    const onMixin = ([ x, y ]) => callback(
        toState({
            ...state.current[ state.current.mode ],
            s: x,
            [ last(mode) ]: y
        })
    )

    const onHue = h => callback({
        hsv: { ...state.current.hsv, h },
        hsl: { ...state.current.hsl, h }
    })

    const onAlpha = a => callback({
        hsl: { ...state.current.hsl, a },
        hsv: { ...state.current.hsv, a }
    })

    useEffect(curr => setState(state => {
        if(active) {
            return state
        } else {
            const color = colord(curr)
            return {
                ...state,
                hsl: color.toHsl(),
                hsv: color.toHsv()
            }
        }
    }), [ value ])

    return (
        <div className='customize-color'>
            <Mixin
                value={ color }
                mode={ mode }
                onStart={ onStart }
                onChange={ onMixin }
                onEnd={ onEnd }
            />
            <Hue
                value={ color }
                onStart={ onStart }
                onChange={ onHue }
                onEnd={ onEnd }
            />
            <Alpha
                value={ color }
                onStart={ onStart }
                onChange={ onAlpha }
                onEnd={ onEnd }
            />
            <Presets
                value={ color }
                onChange={ onValueChange }
            />
            <Channel
                control={ control }
                clear={ clear }
                setMode={ changeMode }
                value={ color }
                onChange={ onValueChange }
            />
        </div>
    )
}

const Customize = ({ children, ...attributes }) => (
    <div className='customize' { ...attributes }>
        { children }
    </div>
)

const defaultStroke = {
    color: 'white',
    thickness: 1,
    style: 'solid'
}

const defaultFill = 'white'

const defaultTrigger = () => ({
    target: { onClick: () => modify('visible', not) }
})

const Stroke = memo(function Stroke({
    title = 'Set Custom Color',
    value,
    defaultValue = defaultStroke,
    onChange = identity,
    ...attributes
}) {

    const [ stroke, setStroke ] = useState(defaultStroke)

    const [ event, setEvent ] = useState({})

    const [ control, setControl ] = useState({})

    const clearMenu = useCallback(e => setEvent({
        target: e.target,
        transition: false
    }), [])

    const refValue = isNil(value) ? stroke : { ...value, color: value.color || defaultStroke.color }

    const refCallback = isNil(value) ? setStroke : onChange

    const onColorChange = compose(
        refCallback,
        assoc('color', __, refValue)
    )

    const onStyleChange = compose(
        refCallback,
        assoc('style', __, refValue)
    )

    const onThicknessChange = compose(
        refCallback,
        assoc('thickness', __, refValue)
    )

    useEffect(setStroke, [ defaultValue ])

    return (
        <TargetPlacements
            trigger={ defaultTrigger }
            onClose={ setControl }
            direction='left right'
            alignment='center'
            display='inline'
            data={
                <Customize onPointerDown={ clearMenu }>
                    <Color
                        control={ control }
                        clear={ event }
                        value={ refValue.color }
                        onChange={ onColorChange }
                    />
                    <Line
                        thickness={ refValue.thickness }
                        style={ refValue.style }
                        onStyleChange={ onStyleChange }
                        onThicknessChange={ onThicknessChange }
                    />
                </Customize>
            }
            { ...attributes }
        >
            <Preview title={ title } color={ refValue.color } />
        </TargetPlacements>
    )
})

const Fill = memo(function Fill({
    title = 'Set Custom Color',
    onChange = identity,
    value,
    defaultValue = defaultFill,
    ...attributes
}) {
    const [ color, setColor ] = useState(defaultFill)

    const [ control, setControl ] = useState({})

    const [ event, setEvent ] = useState({})

    const clearMenu = useCallback(e => setEvent({
        target: e.target,
        transition: false
    }), [])

    const refValue = isNil(value) ? color : value || defaultFill

    const refCallback = isNil(value) ? setColor : onChange

    useEffect(setColor, [ defaultValue ])

    return (
        <TargetPlacements
            trigger={ defaultTrigger }
            onClose={ setControl }
            direction='left right'
            alignment='center'
            display='inline'
            data={
                <Customize onPointerDown={ clearMenu }>
                    <Color
                        clear={ event }
                        control={ control }
                        value={ refValue }
                        onChange={ refCallback }
                    />
                </Customize>
            }
            { ...attributes }
        >
            <Preview title={ title } color={ refValue } />
        </TargetPlacements>
    )
})

export { Fill, Stroke }
