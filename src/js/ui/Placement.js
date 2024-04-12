import React, { Fragment, useCallback, useState, memo, forwardRef } from 'react';
import { take, takeLast, repeat, join, modify, on, ascend, path, unless, compose, curry, identity, is, not, zipObj, zipWith, __, chain, map, when, prop, ap, filter, pair, juxt, always, reduce, head, assoc, o, negate, sortWith, anyPass, nth, values, mergeLeft, identical } from 'ramda';
import { domOverflowed, zipWithAdd, getNodesRect, getNodeRect, getTargetPlacements, getContainerPlacements, getCoordinatePlacements, abs, translateRect, checkRectOverlap, appendClassName, getNodeSize, subtractRects, addRects, noPropagation, noDefault, getOffsetParent, getRectSize, batch, getRectOrigin, pixelToRem, resizeObserver } from '../utils'
import { useEffect, useLayoutEffect } from './hooks';
import { drag } from 'd3-drag';
import { select } from 'd3';
import Button from './Button'
import Icon from './Icon';

const toCSSRem = o(v => v + 'rem', pixelToRem)
const toCSSPixel = v => v + 'px'

const toCSSMaxSize = compose(
    zipObj([ 'maxWidth', 'maxHeight' ]),
    map(v =>
        v > 0 ? toCSSPixel(v) : 'none'
    )
)

const sortPlacementsByConstrain = sortWith([
    ascend(
        o(
            abs,
            path([ 'constrain', 0 ])
        )
    ),
    ascend(
        o(
            abs,
            path([ 'constrain', 1 ])
        )
    )
])

const emptyObj = {}

const emptyArr = []

const emptyStr = ''

const defaultListGrid = [ [ 0, 0 ], [ 0, 0 ], [ 0, 0 ] ]

const defaultCoordinate = [ 0, 0 ]

const defaultMaxSize = [ 'none', 'none' ]

const defaultData = 'Insert your placements data.'

const defaultTarget = 'Insert your placements target'

const defaultDisplay = 'block'

const defaultOnResize = identity

const defaultContainer = document.body

const defaultMargin = [ [ 0, 0 ], [ 0, 0 ] ]

const defaultDirection = [ 'left', 'top', 'right', 'bottom' ]

const defaultAlignment = [ 'start', 'center', 'end' ]

const defaultTransition = 'none'

const defaultZIndex = 1

const defaultTranslate = [ 0, 0 ]

const defaultSlowTransition = 'visibility 0s 500ms, opacity 0s 500ms, z-index 0s 500ms'

const defaultEffect = always(emptyArr)

const defaultListen = always(emptyArr)

const defaultTrigger = always({ target: emptyObj, data: emptyObj })

const stringToArr = curry((separator, string) =>
    string.split(separator).map(v =>
        v.trim()
    )
)

const marginRect = compose(
    ap(
        compose(
            pair,
            map(negate),
            take(2)
        ),
        takeLast(2)
    )
)

const formatMargin = compose(
    marginRect,
    map(
        o(Math.round, Number)
    ),
    when(
        v => v.length === 1,
        o(repeat(__, 4), head)
    ),
    stringToArr(' ')
)

const valueFromObj = curry((obj, key) =>
    key in obj ? obj[ key ] : obj.default
)

const indexSelector = compose(
    juxt,
    map(nth)
)

const toDirectionSelector = compose(
    indexSelector,
    map(
        valueFromObj({
            left: 0,
            top: 1,
            right: 2,
            bottom: 3,
            center: 4,
            default: 1
        })
    )
)

const toAlignmentSelector = compose(
    indexSelector,
    map(
        valueFromObj({
            start: 0,
            center: 1,
            end: 2,
            default: 1
        })
    )
)

const reducePlacementsBySelectors = curry((alignment, direction, placements) =>
    sortPlacementsByConstrain(
        chain(
            toDirectionSelector(direction),
            toAlignmentSelector(alignment)(placements)
        )
    )
)

const Placement = ({
    transition = defaultTransition,
    zIndex = defaultZIndex,
    className = emptyStr,
    clear = emptyObj,
    control = emptyObj,
    children = null,
    value = emptyObj,
    container = emptyObj,
    containerMargin,
    targetMargin,
    dataMargin,
    display = defaultDisplay,
    trigger = defaultTrigger,
    target = defaultTarget,
    data = defaultData,
    calculate = identity,
    effect = defaultEffect,
    listen = defaultListen,
    onResize = defaultOnResize,
    onToggle = identity,
    onClose = identity,
    onOpen = identity,
    alignment,
    direction,
    ...attributes
}) => {

    const [ state, setState ] = useState(() => {
        return {
            container: emptyArr,
            target: emptyArr,
            data: emptyArr,
            visible: false,
            transition: false,
            result: defaultTranslate,
            translate: defaultTranslate,
            containerMargin: defaultMargin,
            targetMargin: defaultMargin,
            dataMargin: defaultMargin,
            alignment: defaultAlignment,
            direction: defaultDirection,
            pending: true,
            autoClose: 0,
            autoOpen: 0,
            coordinate: defaultCoordinate
        }
    })

    const [ containerRef, setContainerRef ] = useState(defaultContainer)
    const [ targetRef, setTargetRef ] = useState(emptyObj)
    const [ dataRef, setDataRef ] = useState(emptyObj)

    const refKeys = [ 'container', 'target', 'data' ]
    const refValues = [ containerRef, targetRef, dataRef ]
    const refIndexes = { container: 0, target: 1, data: 2 }
    const formatRefs = o(zipObj(refKeys), getNodesRect)

    const updatePlacement = state => {
        const translate = zipWithAdd(state.result, state.translate).map(Math.round)
        const data = translateRect(state.result, state.data)
        return { ...state, translate, data }
    }

    const calc = unless(
        prop('pending'),
        compose(
            updatePlacement,
            calculate
        )
    )

    const run = compose(
        setState,
        o(updatePlacement)
    )

    const triggerToListener = curry((refs, trigger, event) =>
        setState(
            compose(
                calc,
                mergeLeft(
                    formatRefs(refs)
                ),
                trigger(event)
            )
        )
    )

    const listener = map(
        map(
            triggerToListener(refValues)
        ),
        trigger()
    )

    useEffect(setContainerRef, [ container ])

    useEffect(compose(
        setState,
        assoc('containerMargin'),
        formatMargin
    ), [ containerMargin ])

    useEffect(compose(
        setState,
        assoc('targetMargin'),
        formatMargin
    ), [ targetMargin ])

    useEffect(compose(
        setState,
        assoc('dataMargin'),
        formatMargin
    ), [ dataMargin ])

    useEffect(compose(
        setState,
        assoc('alignment'),
        stringToArr(' ')
    ), [ alignment ])

    useEffect(compose(
        setState,
        assoc('direction'),
        stringToArr(' ')
    ), [ direction ])

    useEffect(o(
        setState,
        assoc('value')
    ), [ value ])

    useEffect((container, target, data) => {
        const refs = [ container, target, data ]
        const subscription = resizeObserver(refs).subscribe(() =>
            setState(state =>
                calc(
                    onResize({
                        ...state,
                        ...formatRefs(refs),
                        pending: false
                    })
                )
            )
        )

        return () => {
            subscription.unsubscribe()
            setState(
                assoc('pending', true)
            )
        }
    }, refValues)

    useLayoutEffect((pending, control) => setState(state => {
        if(pending) {
            return state
        } else {
            const result = is(Object, control)
                ? control
                : ({ visible: control, transition: control })

            return calc({
                ...state,
                ...result,
                ...formatRefs(refValues)
            })
        }
    }), [ state.pending, control ])

    useLayoutEffect((autoClose, autoOpen) => {
        const auto = autoClose || autoOpen
        if(auto) {
            const timeout = setTimeout(() => setState(state =>
                calc({
                    ...state,
                    ...formatRefs(refValues),
                    visible: autoClose ? false : true,
                    autoClose: 0,
                    autoOpen: 0
                })
            ), auto)

            return () => clearTimeout(timeout)
        } else {
            setState(v => v)
        }
    }, [ state.autoClose, state.autoOpen ])

    useLayoutEffect((visible, transition) => {
        const open = batch([ onOpen, onToggle ])
        const close = batch([ onClose, onToggle ])

        if(visible) {
            open({ visible, transition })
        } else {
            close({ visible, transition })
        }

    }, [ state.visible, state.transition ])

    useLayoutEffect(clear => setState(state => {
        const checklist = [
            () => not(state.visible || state.transition),
            () => state.pending,
            () => refValues.slice(1).some(dom =>
                dom.contains(clear.target)
            )
        ]
        return checklist.some(v => v())
            ? state
            : ({
                ...state,
                visible: false,
                transition: clear.transition || false
            })
    }), [ clear ])

    effect().forEach(([ callback, keys ]) =>
        useLayoutEffect(callback(run), [ ...keys.map(key => refValues[ refIndexes[ key ] ]) ])
    )

    listen().forEach(([ callback, keys ]) =>
        useLayoutEffect(callback, [ ...keys.map(key => state[ key ]) ])
    )

    return (
        <div
            className={
                appendClassName(
                    'placement',
                    'placement-' + display,
                    className
                )
            }
            { ...attributes }
        >
            <div
                className='placement-target'
                ref={ setTargetRef }
                { ...(listener.target || emptyObj) }
            >
                { children || target }
            </div>
            <div
                className='placement-data'
                ref={ setDataRef }
                style={ {
                    zIndex: state.visible ? zIndex : -1,
                    transform: `translate(${state.translate.map(toCSSPixel).join(', ')})`,
                    visibility: state.visible ? 'visible' : 'hidden',
                    opacity: Number(state.visible),
                    transition: state.transition ? transition : 'none'
                } }
                { ...(listener.data || emptyObj) }
            >
                { data }
            </div>
        </div>
    )
}

const ContainerPlacements = ({
    alignment = 'center',
    direction = 'center',
    ...attributes
}) => {
    const calculate = useCallback(state => {
        const [ placement ] = reducePlacementsBySelectors(
            state.alignment,
            state.direction,
            getContainerPlacements(
                addRects(state.containerMargin, state.container),
                addRects(state.dataMargin, state.data)
            )
        )
        return { ...state, result: placement.translate }
    }, [])

    const onData = curry((run, data) => {
        const selection = select(data)
        const onDrag = ({ dx, dy }) => run(state => {
            const [ placement ] = reducePlacementsBySelectors(
                [ 'end' ],
                [ 'right' ],
                getCoordinatePlacements(
                    addRects(state.containerMargin, state.container),
                    addRects(state.dataMargin, state.data),
                    zipWithAdd(getRectOrigin(state.data), [ dx, dy ])
                )
            )
            return { ...state, result: placement.translate }
        })

        const dragFilter = e =>
            !e.ctrlKey
            && !e.button
            && e.target.className.includes?.('draggable')
            && identical(
                getOffsetParent(e.target),
                e.currentTarget
            )


        selection.call(
            drag()
                .on('start', onDrag)
                .on('drag', onDrag)
                .on('end', onDrag)
                .filter(dragFilter)
        )

        return () => selection.on('.drag', null)
    })

    const effect = useCallback(() => ([
        [ onData, [ 'data' ] ]
    ]), [])

    return (
        <Placement
            effect={ effect }
            calculate={ calculate }
            alignment={ alignment }
            direction={ direction }
            { ...attributes }
        />
    )
}

const CoordinatePlacements = ({
    alignment = 'end start',
    direction = 'right left',
    ...attributes
}) => {
    const calculate = useCallback(state => {
        const [ placement ] = reducePlacementsBySelectors(
            state.alignment,
            state.direction,
            getCoordinatePlacements(
                addRects(state.containerMargin, state.container),
                addRects(state.dataMargin, state.data),
                state.coordinate
            )
        )

        return { ...state, result: placement.translate }
    }, [])

    return (
        <Placement
            calculate={ calculate }
            alignment={ alignment }
            direction={ direction }
            { ...attributes }
        />
    )
}

const TargetPlacements = ({
    parents,
    ...attributes
}) => {

    const calculate = useCallback(state => {
        const checkOverlap = anyPass(
            map(
                checkRectOverlap,
                getNodesRect(state.value || []).concat([ state.target ])
            )
        )

        const placements = reducePlacementsBySelectors(
            state.alignment,
            state.direction,
            getTargetPlacements(
                addRects(state.containerMargin, state.container),
                addRects(state.targetMargin, state.target),
                addRects(state.dataMargin, state.data)
            )
        )

        const position = placements
            .map(({ translate }) =>
                checkOverlap(
                    translateRect(translate, state.data)
                )
            )
            .findIndex(not)

        const overlap = position === -1
        const changes = overlap
            ? ({ visible: false, transition: false })
            : ({ result: placements[ position ].translate })

        return { ...state, ...changes }
    }, [])

    return (
        <Placement
            value={ parents }
            calculate={ calculate }
            { ...attributes }
        />
    )
}

const PopupPlacements = ({ ...attributes }) => {
    const trigger = useCallback(() => ({
        target: { onClick: () => modify('visible', not) }
    }), [])
    return (
        <ContainerPlacements
            trigger={ trigger }
            { ...attributes }
        />
    )
}

const ContextPlacements = ({ ...attributes }) => {
    const trigger = useCallback(() => ({
        target: {
            onContextMenu: noDefault(e =>
                mergeLeft({
                    coordinate: [ e.clientX, e.clientY ],
                    visible: true,
                    transition: false
                })
            ),
            onClick: () => mergeLeft({
                visible: false,
                transition: false
            })
        },
        data: {
            onClick: () => mergeLeft({
                visible: false,
                transition: false
            })
        }
    }), [])

    return (
        <CoordinatePlacements
            trigger={ trigger }
            { ...attributes }
        />
    )
}

const ContextMenuPlacements = ({
    container,
    containerMargin,
    data,
    ...attributes
}) => {
    const [ control, setControl ] = useState({})

    const listen = useCallback(() => ([
        [
            () => setControl({
                visible: false,
                transition: false
            }),
            [ 'coordinate' ]
        ]
    ]), [])

    return (
        <ContextPlacements
            container={ container }
            containerMargin={ containerMargin }
            listen={ listen }
            onClose={ setControl }
            data={
                <Lists
                    container={ container }
                    containerMargin={ containerMargin }
                    control={ control }
                    data={ data }
                />
            }
            { ...attributes }
        />
    )
}

const TogglePlacements = ({ ...attributes }) => {
    const trigger = useCallback(() => ({
        target: { onClick: () => modify('visible', not) },
        data: { onClick: () => mergeLeft({ visible: false, transition: false }) }
    }), [])

    return (
        <TargetPlacements
            trigger={ trigger }
            { ...attributes }
        />
    )
}

const ToggleMenuPlacements = ({
    container,
    containerMargin,
    data,
    ...attributes
}) => {
    const [ control, setControl ] = useState({})

    return (
        <TogglePlacements
            container={ container }
            containerMargin={ containerMargin }
            onClose={ setControl }
            data={
                <Lists
                    container={ container }
                    containerMargin={ containerMargin }
                    control={ control }
                    data={ data }
                />
            }
            { ...attributes }
        />
    )
}

const BranchPlacements = ({ ...attributes }) => {
    const trigger = useCallback(() => ({
        target: {
            onMouseEnter: () => mergeLeft({
                visible: true,
                transition: true
            })
        },
        data: {
            onClick: () => mergeLeft({
                visible: false,
                transition: false
            })
        }
    }), [])


    return (
        <TargetPlacements
            trigger={ trigger }
            { ...attributes }
        />
    )
}

const BranchMenuPlacements = ({
    container,
    containerMargin,
    data,
    parents,
    ...attributes
}) => {
    const [ control, setControl ] = useState({})

    return (
        <BranchPlacements
            transition={ defaultSlowTransition }
            container={ container }
            containerMargin={ containerMargin }
            onClose={ setControl }
            parents={ parents }
            data={
                <Lists
                    container={ container }
                    containerMargin={ containerMargin }
                    control={ control }
                    parents={ parents }
                    data={ data }
                />
            }
            { ...attributes }
        />
    )
}

const TooltipPlacements = ({ data, ...attributes }) => {
    const trigger = useCallback(() => ({
        target: {
            onMouseEnter: () => mergeLeft({
                visible: true,
                transition: true
            }),
            onClick: () => mergeLeft({
                visible: false,
                transition: false
            }),
            onMouseLeave: () => mergeLeft({
                visible: false,
                transition: true
            })
        }
    }), [])
    return (
        <TargetPlacements
            targetMargin='5'
            transition={ defaultSlowTransition }
            trigger={ trigger }
            data={
                <div className='placement-tooltip'>
                    { data }
                </div>
            }
            { ...attributes }
        />
    )
}

const Grid = ({
    left = null,
    center = null,
    right = null,
    onLeft = {},
    onRight = {},
    lazy = emptyStr,
    grid = defaultListGrid,
    ...attributes
}) => {
    const formatRow = row => row > 0 ? toCSSRem(row) : 'auto'
    return (
        <Button
            color='medium'
            display='block'
            size='big'
            round={ false }
            { ...attributes }
        >
            <span
                className={
                    appendClassName(
                        'placement-list-grid',
                        lazy === 'left' ? 'placement-lazy-left' : '',
                        lazy === 'right' ? 'placement-lazy-right' : ''
                    )
                }
                style={ {
                    display: 'grid',
                    gridTemplateColumns: grid.map(([ col ]) => `minmax(${col > 0 ? toCSSRem(col) : 'auto'}, max-content)`).join(' '),
                    gridTemplateRows: formatRow(
                        grid.reduce((value, [ _, row ]) => Math.max(value, row), 0)
                    )
                } }
            >
                <span className='placement-list-left' { ...onLeft }>
                    { left }
                </span>
                <span className='placement-list-center'>
                    { center }
                </span>
                <span className='placement-list-right' { ...onRight }>
                    { right }
                </span>
            </span>
        </Button>
    )
}

const List = forwardRef(function List({
    children,
}, ref) {
    return (
        <li
            ref={ ref }
            className='placement-list'
        >
            { children }
        </li>
    )
})

const SeparatorList = () => (
    <li className='placement-list'>
        <span className='placement-list-separator'></span>
    </li>
)

const RegularList = ({
    ...attributes
}) => (
    <List>
        <Grid { ...attributes } />
    </List>
)

const CheckList = ({ checked, ...attributes }) => (
    <RegularList
        { ...attributes }
        left={ checked ? <Icon name='check' /> : null }
    />
)

const FavoriteList = ({ favorited, onClick, onChange, ...attributes }) => {
    const trigger = useCallback(() => ({
        target: {
            onMouseEnter: () => mergeLeft({
                visible: true,
                transition: true,
                autoOpen: 0
            }),
            onMouseLeave: () => mergeLeft({
                visible: false,
                transition: true,
                autoOpen: 0
            }),
            onClick: () => mergeLeft({
                visible: false,
                transition: false,
                autoOpen: 600
            })
        }
    }), [])
    return (
        <RegularList
            { ...attributes }
            right={
                <TooltipPlacements
                    data={ favorited ? 'Remove from Favorites' : 'Add to Favorites' }
                    alignment='center'
                    direction='top'
                    trigger={ trigger }
                >
                    <Icon name={ favorited ? 'blackstar' : 'whitestar' } />
                </TooltipPlacements>
            }
            onRight={ { onClick: noPropagation(onChange) } }
            lazy={ favorited ? '' : 'right' }
            onClick={ onClick }
        />
    )
}

const BranchList = ({
    container,
    containerMargin,
    parents,
    clear,
    data,
    control,
    ...attributes
}) => {
    const [ ref, setRef ] = useState({})
    const [ targetMargin, setTargetMargin ] = useState('0 0 0 0')

    useEffect(ref => {
        const getMargin = compose(
            join(' '),
            map(Math.round),
            chain(
                map(abs)
            ),
            on(subtractRects, getNodeSize)
        )
        const subscription = resizeObserver([ ref ]).subscribe(() =>
            setTargetMargin(
                getMargin(ref, ref.firstElementChild)
            )
        )

        return () => subscription.unsubscribe()
    }, [ ref ])

    return (
        <List ref={ setRef }>
            <BranchMenuPlacements
                container={ container }
                containerMargin={ containerMargin }
                targetMargin={ targetMargin }
                parents={ parents }
                clear={ clear }
                control={ control }
                data={ data }
                alignment='start end'
                direction='right left'
            >
                <Grid
                    { ...attributes }
                    onClick={ noPropagation() }
                    right={ <Icon name='angleright' /> }
                />
            </BranchMenuPlacements>
        </List>
    )
}

const CollapseList = ({
    collapsed,
    children,
    onClick,
    onChange,
    ...attributes
}) => (
    <Fragment>
        <RegularList
            { ...attributes }
            right={
                <Icon
                    name='angleup'
                    style={ {
                        transform: `rotate(${collapsed ? '180deg' : '0deg'})`,
                        transition: 'transform 250ms ease-in-out'
                    } }
                />
            }
            onClick={
                noPropagation(
                    batch([ onClick, onChange ])
                )
            }
        />
        { children }
    </Fragment>
)

const normalize = data => data.map(({
    type = 'regular',
    left = null,
    center = null,
    right = null,
    favorited = false,
    checked = false,
    highlighted = false,
    disabled = false,
    collapsed = false,
    onClick = identity,
    onChange = identity,
    data = []
}) => {
    return {
        type,
        checked,
        favorited,
        highlighted,
        disabled,
        collapsed,
        left,
        center,
        right,
        data,
        onClick,
        onChange
    }
})

const Wrapper = forwardRef(function Wrapper({
    flat = false,
    gutter = false,
    children,
    ...attributes
}, ref) {
    return flat
        ? <>{ children }</>
        : (
            <menu
                ref={ ref }
                className={
                    appendClassName(
                        'placement-lists',
                        'placement-lists-scroll' + (gutter ? 'enabled' : 'disabled'),
                    )
                }
                { ...attributes }
            >
                { children }
            </menu>
        )
})

const Lists = memo(function Lists({
    flat = false,
    collapsed = false,
    grid = defaultListGrid,
    control = emptyObj,
    container = defaultContainer,
    containerMargin = '0 0 0 0',
    data = emptyArr,
    parents = emptyArr,
    ...attributes
}) {
    const [ ref, setRef ] = useState({})

    const [ clear, setClear ] = useState({})

    const [ template, setTemplate ] = useState(defaultListGrid)

    const [ gutter, setGutter ] = useState(false)

    const [ maxSize, setMaxSize ] = useState(() => defaultMaxSize)

    const onMouseEnter = useCallback(({ target }) => setClear({
        target: target,
        transition: true
    }), [])

    useEffect((container, containerMargin) => {
        const subscription = resizeObserver([ container ]).subscribe(() =>
            setMaxSize(() =>
                map(
                    Math.round,
                    getRectSize(
                        addRects(
                            formatMargin(containerMargin),
                            getNodeRect(container)
                        )
                    )
                )
            )
        )

        return () => subscription.unsubscribe()
    }, [ container, containerMargin ])

    useEffect(ref => {
        const reduceGrid = zipWith(
            zipWith(
                compose(Math.round, Math.max)
            )
        )

        const getGrid = compose(
            reduce(
                reduceGrid,
                [ [ 0, 0 ], [ 0, 0 ], [ 0, 0 ] ]
            ),
            map(
                compose(
                    map(getNodeSize),
                    values,
                    prop('children')
                )
            )
        )


        const filterByOffsetParent = curry((offsetParent, childs) =>
            filter(
                compose(
                    identical(offsetParent),
                    prop('offsetParent')
                ),
                childs
            )
        )

        const subscription = resizeObserver([ ref ]).subscribe(() => {
            const items = filterByOffsetParent(
                ref.offsetParent,
                [ ...ref.querySelectorAll('.placement-list-grid') ]
            )
            if(items.length > 0) {
                setTemplate(
                    reduceGrid(
                        getGrid(items)
                    )
                )
                setGutter(
                    domOverflowed(ref)
                )
            } else {
                setGutter(
                    domOverflowed(ref)
                )
            }
        })

        return () => subscription.unsubscribe()
    }, [ ref ])

    const size = flat ? grid : template

    const refs = parents.concat([ ref ])

    return (
        collapsed
            ? null
            : <Wrapper
                ref={ setRef }
                flat={ flat }
                gutter={ gutter }
                style={ toCSSMaxSize(maxSize) }
                { ...attributes }
            >
                {
                    normalize(data).map(({
                        type,
                        checked,
                        favorited,
                        highlighted,
                        disabled,
                        collapsed,
                        left,
                        center,
                        right,
                        data,
                        onClick,
                        onChange
                    }, key) =>
                        type === 'regular'
                            ? (
                                <RegularList
                                    key={ type + key }
                                    grid={ size }
                                    left={ left }
                                    center={ center }
                                    right={ right }
                                    highlighted={ highlighted }
                                    disabled={ disabled }
                                    onClick={ onClick }
                                    onMouseEnter={ onMouseEnter }
                                />
                            )
                            : type === 'check'
                                ? (
                                    <CheckList
                                        key={ type + key }
                                        checked={ checked }
                                        grid={ size }
                                        left={ left }
                                        center={ center }
                                        right={ right }
                                        highlighted={ highlighted }
                                        disabled={ disabled }
                                        onChange={ onChange }
                                        onClick={ onClick }
                                        onMouseEnter={ onMouseEnter }
                                    />
                                )
                                : type === 'favorite'
                                    ? (
                                        <FavoriteList
                                            key={ type + key }
                                            grid={ size }
                                            left={ left }
                                            center={ center }
                                            right={ right }
                                            favorited={ favorited }
                                            highlighted={ highlighted }
                                            disabled={ disabled }
                                            onChange={ onChange }
                                            onClick={ onClick }
                                            onMouseEnter={ onMouseEnter }
                                        />
                                    )
                                    : type === 'branch'
                                        ? (
                                            <BranchList
                                                key={ type + key }
                                                grid={ size }
                                                container={ container }
                                                containerMargin={ containerMargin }
                                                parents={ refs }
                                                clear={ clear }
                                                control={ control }
                                                data={ data }
                                                left={ left }
                                                center={ center }
                                                right={ right }
                                                highlighted={ highlighted }
                                                disabled={ disabled }
                                                onMouseEnter={ onMouseEnter }
                                            />
                                        )
                                        : type === 'collapse'
                                            ? (
                                                <CollapseList
                                                    key={ key + type }
                                                    grid={ size }
                                                    highlighted={ highlighted }
                                                    collapsed={ collapsed }
                                                    disabled={ disabled }
                                                    onClick={ onClick }
                                                    onChange={ onChange }
                                                    left={ left }
                                                    center={ center }
                                                    right={ right }
                                                >
                                                    <Lists
                                                        grid={ size }
                                                        collapsed={ collapsed }
                                                        flat={ true }
                                                        container={ container }
                                                        containerMargin={ containerMargin }
                                                        control={ control }
                                                        parents={ refs }
                                                        data={ data }
                                                        onMouseEnter={ onMouseEnter }
                                                    />
                                                </CollapseList>
                                            )
                                            : type === 'separator'
                                                ? (
                                                    <SeparatorList key={ key + type } />
                                                )
                                                : null
                    )
                }
            </Wrapper>
    )
})


export { ContainerPlacements, CoordinatePlacements, TargetPlacements, TogglePlacements, ToggleMenuPlacements, ContextPlacements, ContextMenuPlacements, BranchPlacements, BranchMenuPlacements, TooltipPlacements, PopupPlacements }