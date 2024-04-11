import React, { useCallback, useState } from 'react'
import Canvas from './Canvas'
import Button from './Button'
import Icon from './Icon'
import Slider from './Slider'

import { useEffect, useLayoutEffect } from './hooks'
import { absDiff, batch, binarySearch, defaultColor, defaultDownColor, defaultUpColor, defaultWhiteColor, drawLabels, drawLines, drawTexts, isLinesOverlap, measureText, scaleZoomTo, splitSymbol, stream, strokePattern, zipWithSubtract } from '../utils'
import { add, chain, clamp, compose, curry, head, init, isEmpty, last, mean, modify, not, nth, o, omit, pair, prop, reduce, reverse, sort, subtract, tail, take, transpose, zip, zipWith } from 'ramda'
import { interpolateNumber, pointer, precisionFixed, scaleLinear, zoomIdentity } from 'd3'
import { colord } from 'colord'
import { TooltipPlacements } from './Placement'
import Loader from './Loader'

const P = { price: nth(0), count: nth(1), amount: nth(2) }

const formatEqPrice = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 8 }).format

const formatEqChange = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 3, maximumFractionDigits: 3 }).format

const formatCursorChange = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format

const formatVolume = new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format

const priceFormatter = precision => new Intl.NumberFormat('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision }).format

const devicePixelRatio = window.devicePixelRatio || 1

const tickLength = 8

const defaultTick = 'single'

const defaultLabelFill = 'rgb(36, 42, 51)'

const defaultFontSize = 12

const defaultPointerFill = '#1e222b'

const downTrans = colord(defaultDownColor).alpha(.5).toRgbString()

const upTrans = colord(defaultUpColor).alpha(.5).toRgbString()

const xMeasure = curry((context, x) =>
    measureText(context, x).at(0) * 1.3
)

const yMeasure = curry((context, y) =>
    measureText(context, y).at(1) * 2
)

const toLine = (point, size) => ([ point - size / 2, point + size / 2 ])

const filterTicks = curry((measure, scale, [ head, ...rest ]) =>
    rest.reduce((acc, curr) => {
        const lines = [ last(acc), curr ].map(v =>
            toLine(
                scale(v),
                measure(v)
            )
        )
        return isLinesOverlap(...lines) ? acc : acc.concat([ curr ])
    }, [ head ])
)

const sortAsk = sort(([ a ], [ b ]) =>
    Number(a) - Number(b)
)

const sortBid = sort(([ a ], [ b ]) =>
    Number(b) - Number(a)
)

const bidSingle = curry((_, [ xScale ], data) => {
    const i = interpolateNumber(...xScale.domain())
    const [ x, y ] = last(data)
    const xs = [ i(0), i(.5) ].filter(price => price < x)
    const ys = xs.map(x => {
        const idx = binarySearch(head, x, data)
        const offset = head(data[ idx ]) > x ? -1 : 0
        return last(data[ Math.max(idx + offset, 0) ])
    })
    return [ [ ...xs, x ], [ ...ys, y ] ]
})

const askSingle = curry((_, [ xScale ], data) => {
    const i = interpolateNumber(...xScale.domain())
    const [ x, y ] = head(data)
    const xs = [ i(.5), i(1) ].filter(price => price > x)
    const ys = xs.map(x => {
        const idx = binarySearch(head, x, data)
        const offset = head(data[ idx ]) > x ? -1 : 0
        return last(data[ Math.max(idx + offset, 0) ])
    })
    return [ [ x, ...xs ], [ y, ...ys ] ]
})

const bidDouble = curry((_, [ xScale ], data) => {
    const i = interpolateNumber(...xScale.domain())
    const [ x, y ] = last(data)
    const xs = [ i(0), i(.34), i(.67) ].filter(price => price < x)
    const ys = xs.map(x => {
        const idx = binarySearch(head, x, data)
        const offset = head(data[ idx ]) > x ? -1 : 0
        return last(data[ Math.max(idx + offset, 0) ])
    })
    return [ [ ...xs, x ], [ ...ys, y ] ]
})

const askDouble = curry((_, [ xScale ], data) => {
    const i = interpolateNumber(...xScale.domain())
    const [ x, y ] = head(data)
    const xs = [ i(.34), i(.67), i(1) ].filter(price => price > x)
    const ys = xs.map(x => {
        const idx = binarySearch(head, x, data)
        const offset = head(data[ idx ]) > x ? -1 : 0
        return last(data[ Math.max(idx + offset, 0) ])
    })
    return [ [ x, ...xs ], [ y, ...ys ] ]
})

const volume = curry((measurements, scales, data) => {
    const [ head, ...rest ] = data.toSorted((a, b) => last(b) - last(a))
    const result = rest.reduce((acc, curr) => {
        const values = zip(last(acc), curr)
        const applyFn = zipWith((fn, values) =>
            values.map(fn)
        )
        const [ xs, ys ] = zipWith(
            zipWith(toLine),
            applyFn(scales, values),
            applyFn(measurements, values)
        )
        return isLinesOverlap(...xs) || isLinesOverlap(...ys) ? acc : acc.concat([ curr ])
    }, [ head ])

    return transpose(
        result.filter((_, i) => i % 2 === 0)
    )
})

const formatData = reduce((a, [ _, b ]) => a.concat([
    ([ P.price(b), P.amount(b) + (isEmpty(a) ? 0 : last(last(a))) ])
]), [])

const fromEntries = v => Object.fromEntries(v)
const entries = v => Object.entries(v)

const ticks = {
    bid: { single: bidSingle, double: bidDouble, volume: volume },
    ask: { single: askSingle, double: askDouble, volume: volume }
}

const floor = Math.floor
const round = Math.round

const formatBid = o(reverse, formatData)

const formatAsk = ask => formatData(ask).map(v =>
    v.map(Math.abs)
)

const calculateEq = curry((bid, ask) => {
    const bidPrice = head(
        last(bid)
    )
    const askPrice = head(
        head(ask)
    )
    const eqPrice = (bidPrice + askPrice) / 2
    const eqChange = absDiff(bidPrice, eqPrice) / eqPrice
    return [ eqPrice, eqChange ]
})

const priceDomain = curry((bid, ask) => {
    const eq = mean(
        [ last(bid), head(ask) ].map(head)
    )

    const bidDomain = [
        head(
            head(bid)
        ),
        eq
    ]

    const askDomain = [
        eq,
        eq + absDiff(...bidDomain)
    ]

    return [ bidDomain, askDomain ]
})

const volumeDomain = curry((bid, ask) => {
    const [ minBidVol, maxBidVol ] = [ last(bid), head(bid) ].map(last)
    const [ minAskVol, maxAskVol ] = [ head(ask), last(ask) ].map(last)
    const maxVol = Math.max(maxBidVol, maxAskVol)
    return [
        [ minBidVol, maxVol ],
        [ minAskVol, maxVol ]
    ]
})

const sliceBid = curry((scale, bid) => {
    const [ start ] = scale.range()
    const domain = scale.domain()
    return bid.slice(
        ...domain.map((x, i) => {
            const idx = binarySearch(head, x, bid)
            const v = head(bid[ idx ])
            const o = Number(scale(v) < start)
            return idx + i + o
        })
    )
})

const sliceAsk = curry((scale, ask) => {
    const [ , end ] = scale.range()
    return ask.slice(
        ...scale.domain().map((x, i) => {
            const idx = binarySearch(head, x, ask)
            const v = head(ask[ idx ])
            const o = Number(scale(v) > end)
            return idx + i - o
        })
    )
})

const maxVolume = curry((bid, ask) =>
    Math.max(
        last(
            head(bid)
        ),
        last(
            last(ask)
        )
    )
)

const rescaleX = curry((t, v) =>
    t.rescaleX(v)
)

const rescaleY = curry((t, v) =>
    t.rescaleY(v)
)

const drawBid = ({ context, xScale, yScale, ticks, data }) => {
    const [ [ xMin ], [ , yMax ] ] = [ xScale, yScale ].map(v =>
        v.range().toSorted(subtract).map(floor)
    )

    const offset = .5

    const [ s, ...rest ] = data

    const e = last(data)

    const x = floor(
        xScale(s[ 0 ])
    )
    const y = floor(
        yScale(s[ 1 ])
    )

    const m = floor(
        xScale(e[ 0 ])
    )

    const fill = context.createLinearGradient(0, 0, 0, yMax)

    fill.addColorStop(0, upTrans)
    fill.addColorStop(1, 'transparent')

    context.beginPath()
    context.moveTo(x + offset, y + offset)

    rest.forEach(([ price, volume ], i) => {
        const x = floor(
            xScale(price)
        )
        const y = floor(
            yScale(volume)
        )
        const py = floor(
            yScale(
                data[ i ].at(1)
            )
        )

        context.lineTo(x + offset, py + offset)
        context.lineTo(x + offset, y + offset)
    })

    context.lineTo(m + offset, yMax + offset)
    context.lineTo(Math.min(xMin, x) + offset, yMax + offset)
    context.lineTo(Math.min(xMin, x) + offset, y + offset)
    context.closePath()

    context.setLineDash(strokePattern.solid)
    context.strokeStyle = defaultUpColor
    context.fillStyle = fill
    context.stroke()
    context.fill()

    drawLines({
        context: context,
        stroke: {
            color: defaultUpColor,
            thickness: 1,
            style: 'dashed'
        },
        lines: ticks.flatMap(([ a, b ]) => {
            const x = xScale(a)
            const y = yScale(b)
            return [
                [ [ xMin, y ], [ x, y ] ],
                [ [ x, y ], [ x, yMax ] ]
            ]
        })
    })
}

const drawAsk = ({ context, xScale, yScale, data, ticks }) => {
    const [ [ , xMax ], [ , yMax ] ] = [ xScale, yScale ].map(v =>
        v.range().toSorted(subtract).map(floor)
    )
    const offset = .5

    const [ s, ...rest ] = data

    const e = last(data)

    const x = floor(
        xScale(s[ 0 ])
    )
    const y = floor(
        yScale(s[ 1 ])
    )

    const m = floor(
        xScale(e[ 0 ])
    )

    const n = floor(
        yScale(e[ 1 ])
    )

    const fill = context.createLinearGradient(0, 0, 0, yMax)

    fill.addColorStop(0, downTrans)
    fill.addColorStop(1, 'transparent')

    context.beginPath()
    context.moveTo(x + offset, y + offset)

    rest.forEach(([ price, volume ], i) => {
        const x = floor(
            xScale(price)
        )
        const y = floor(
            yScale(volume)
        )
        const py = floor(
            yScale(
                data[ i ].at(1)
            )
        )

        context.lineTo(x + offset, py + offset)
        context.lineTo(x + offset, y + offset)
    })

    context.lineTo(Math.max(xMax, m) + offset, n + offset)
    context.lineTo(Math.max(xMax, m) + offset, yMax + offset)
    context.lineTo(x + offset, yMax + offset)
    context.closePath()

    context.setLineDash(strokePattern.solid)
    context.strokeStyle = defaultDownColor
    context.fillStyle = fill
    context.stroke()
    context.fill()

    drawLines({
        context: context,
        stroke: {
            color: defaultDownColor,
            thickness: 1,
            style: 'dashed'
        },
        lines: ticks.flatMap(([ a, b ]) => {
            const x = xScale(a)
            const y = yScale(b)
            return [
                [ [ x, y ], [ xMax, y ] ],
                [ [ x, y ], [ x, yMax ] ]
            ]
        })
    })
}

const volumeTransform = zoomIdentity.translate(0, 50 - 50 * .98).scale(.98)

const drawPoints = ({ context, points }) => {
    const path = new Path2D()
    points.forEach(([ x, y ]) => {
        path.arc(round(x), round(y), 2, 0, 2 * Math.PI)
        path.closePath()
    })

    context.fillStyle = defaultWhiteColor
    context.fill(path)
}

const overlay = colord(defaultLabelFill).alpha(.5).toRgbString()

const drawOverlays = ({ context, overlays }) => {
    context.fillStyle = overlay
    overlays.forEach(([ start, end ]) =>
        context.fillRect(
            ...start.map(round),
            ...zipWithSubtract(end, start).map(round)
        )
    )
}

const drawClip = ({ context, points }) => {
    const [ [ x, y ], ...rest ] = points

    context.moveTo(
        round(x),
        round(y)
    )

    rest.forEach(([ x, y ]) => {
        context.lineTo(
            round(x),
            round(y)
        )
    })

    context.closePath()

    context.clip()
}

const scaleExtent = [ 1, 7 ]

const clampZoom = clamp(...scaleExtent)

const precisionExtent = [ 0, 4 ]
const defaultPrecision = 0
const clampPrecision = clamp(...precisionExtent)

const scale = (range, domain) => scaleLinear().range(range).domain(domain)
const sliderScale = range => scaleLinear().rangeRound(range).domain(scaleExtent).clamp(true)

const BookHeader = ({
    symbol,
    maps,
    zoom,
    setZoom,
    size,
    precision,
    setPrecision,
    tick,
    setTick,
    showVolTick,
    setShowVolTick,
    loading
}) => {
    const [ middle, setMiddle ] = useState(0)

    const [ scale, setScale ] = useState(() => () => 0)

    const [ compact, setCompact ] = useState(false)

    const title = symbol ? splitSymbol(symbol).map(v => maps[ v ] || v).join('/') : ''

    const onResize = ([ [ cWidth ], [ pWidth ] ]) => {
        setScale(() =>
            sliderScale([ pWidth / 2, cWidth - pWidth / 2 ])
        )
        setMiddle(pWidth / 2)
    }

    const onDrag = ({ track: [ tWidth ], pointer: [ pWidth ], x }) => setZoom(
        sliderScale([ pWidth / 2, tWidth - pWidth / 2 ]).invert(x)
    )

    const decreasePrecision = () => setPrecision(
        compose(
            clampPrecision,
            add(1)
        )
    )

    const increasePrecision = () => setPrecision(
        compose(
            clampPrecision,
            add(-1)
        )
    )

    useEffect(([ width ]) => {
        if(width < 500) {
            setTick('single')
            setCompact(true)
        } else {
            setTick(v => v)
            setCompact(false)
        }
    }, [ size ])

    return (
        <div className='book-header'>
            <span className='book-title'>
                { title }
            </span>
            <menu className='book-control'>
                {
                    [
                        {
                            tooltip: 'Set Single Price Tick',
                            highlighted: tick === 'single',
                            disabled: false,
                            icon: 'singletick',
                            onClick: () => setTick('single'),
                            visible: !compact
                        },
                        {
                            tooltip: 'Set Double Price Ticks',
                            highlighted: tick === 'double',
                            disabled: false,
                            icon: 'doubletick',
                            onClick: () => setTick('double'),
                            visible: !compact
                        },
                        {
                            tooltip: 'Set Volume Based Price Ticks',
                            highlighted: tick === 'volume',
                            disabled: false,
                            icon: 'randomtick',
                            onClick: () => setTick('volume'),
                            visible: !compact
                        },
                        {
                            tooltip: `${showVolTick ? 'Hide' : 'Show'} Volume Ticks`,
                            highlighted: showVolTick,
                            disabled: false,
                            icon: 'volumetick',
                            onClick: () => setShowVolTick(not),
                            visible: true
                        },
                        {
                            tooltip: 'Decrease Precision',
                            highlighted: false,
                            disabled: precision === Math.max(...precisionExtent) || loading,
                            icon: 'decreaseprecision',
                            onClick: decreasePrecision,
                            visible: true
                        },
                        {
                            tooltip: 'Increase Precision',
                            highlighted: false,
                            disabled: precision === Math.min(...precisionExtent) || loading,
                            icon: 'increaseprecision',
                            onClick: increasePrecision,
                            visible: true
                        }
                    ].filter(({ visible }) => visible).map(({ tooltip, highlighted, disabled, icon, onClick }, key) =>
                        <li key={ key } className='book-control-item'>
                            <TooltipPlacements
                                direction='top'
                                alignment='center'
                                display='cover'
                                data={ tooltip }
                            >
                                <Button
                                    display='block'
                                    size={ compact ? 'slim' : 'big' }
                                    onClick={ onClick }
                                    disabled={ disabled }
                                    highlighted={ highlighted }
                                >
                                    <Icon name={ icon } />
                                </Button>
                            </TooltipPlacements>
                        </li>
                    )
                }
                <li key={ 7 } className='book-control-item'>
                    <Slider
                        className='book-slider'
                        onResize={ onResize }
                        onDragStart={ onDrag }
                        onDrag={ onDrag }
                        onDragEnd={ onDrag }
                        pointerFill={ defaultPointerFill }
                        x={ scale(zoom) }
                        y={ middle }
                    />
                </li>
            </menu>
        </div>
    )
}

const BookLoader = ({ }) => (
    <div className='book-loader'>
        <Loader />
    </div>
)

const BookChart = ({
    loading,
    setLoading,
    size,
    setSize,
    symbol,
    zoom,
    setZoom,
    tick,
    showVolTick,
    precision,
    socket
}) => {
    const [ [ back, front ], setContext ] = useState([ {}, {} ])

    const [ [ bid ], setBid ] = useState([ [], [] ])
    const [ [ ask ], setAsk ] = useState([ [], [] ])

    const [ cursor, setCursor ] = useState([])

    const onZoom = useCallback(({ scaled, dk }) => setZoom(zoom =>
        scaled ? clampZoom(dk * zoom) : zoom
    ), [])

    const onPointerMove = useCallback(e => setCursor(
        pointer(e, e.target)
    ), [])

    const onPointerEnter = onPointerMove

    const onPointerLeave = useCallback(_ => setCursor([]), [])

    useEffect((symbol, precision) => {
        const splitBook = reduce((splitted, book) => {
            const key = P.amount(book) > 0 ? 'bid' : 'ask'
            return {
                ...splitted,
                [ key ]: splitted[ key ].concat([ [ P.price(book), book ] ])
            }
        }, { bid: [], ask: [] })

        const sortBook = o(
            modify('ask', sortAsk),
            modify('bid', sortBid)
        )

        const formatSnapshot = o(sortBook, splitBook)

        const applyUpdate = curry((update, book) =>
            entries({
                ...fromEntries(book),
                ...fromEntries(update)
            })
        )

        const applyDelete = curry((update, book) =>
            entries(
                omit(
                    update.map(head),
                    fromEntries(book)
                )
            )
        )

        const onSnapshot = o(
            batch([
                () => setLoading(false),
                compose(
                    setBid,
                    chain(pair, formatBid),
                    prop('bid')
                ),
                compose(
                    setAsk,
                    chain(pair, formatAsk),
                    prop('ask')
                )
            ]),
            formatSnapshot
        )

        const onUpdate = values => {
            const [ [ bD, bU ], [ aD, aU ] ] = values.reduce(([ [ bD, bU ], [ aD, aU ] ], curr) => {
                const i = [ P.price(curr), curr ]
                if(P.count(curr) > 0) {
                    if(P.amount(curr) > 0) {
                        return [ [ bD, bU.concat([ i ]) ], [ aD, aU ] ]
                    } else {
                        return [ [ bD, bU ], [ aD, aU.concat([ i ]) ] ]
                    }
                } else {
                    if(P.amount(curr) === 1) {
                        return [ [ bD.concat([ i ]), bU ], [ aD, aU ] ]
                    } else {
                        return [ [ bD, bU ], [ aD.concat([ i ]), aU ] ]
                    }
                }
            }, [ [ [], [] ], [ [], [] ] ])

            setBid(
                compose(
                    chain(pair, formatBid),
                    sortBid,
                    applyDelete(bD),
                    applyUpdate(bU),
                    last
                )
            )

            setAsk(
                compose(
                    chain(pair, formatAsk),
                    sortAsk,
                    applyDelete(aD),
                    applyUpdate(aU),
                    last
                )
            )
        }

        const enableBulkUpdate = 536870912

        const callback = {
            snapshot: onSnapshot,
            update: onUpdate
        }

        const subscription = stream({
            socket: socket,
            payload: {
                channel: 'book',
                symbol: symbol,
                len: '100',
                prec: 'P' + precision + ''
            },
            flags: enableBulkUpdate
        }).subscribe(([ type, value ]) =>
            callback[ type ](value)
        )

        return () => {
            subscription.unsubscribe()
            setLoading(true)
            setBid([ [], [] ])
            setAsk([ [], [] ])
            setZoom(1)
        }
    }, [ symbol, precision ])

    useLayoutEffect((context, [ width, height ], zoom, bid, ask, tick, showVolTick) => {
        const transform = scaleZoomTo([ width / 2, 0 ], zoom, zoomIdentity)
        const [ eqPrice, eqChange ] = calculateEq(bid, ask)

        const textHeight = defaultFontSize * 1.5

        const measureX = xMeasure(context)

        const paddingX = add(
            measureX(
                formatVolume(
                    maxVolume(bid, ask)
                )
            ),
            tickLength
        )

        const paddingY = textHeight + tickLength

        const center = round(width / 2)

        const [ bXScale, aXScale ] = zipWith(
            compose(rescaleX(transform), scale),
            [ [ paddingX, center ], [ center, width - paddingX ] ],
            priceDomain(bid, ask)
        )

        const sBids = sliceBid(bXScale, bid)
        const sAsks = sliceAsk(aXScale, ask)

        const sufficient = [ sBids, sAsks ].every(data => data.length > 1)

        if(sufficient) {
            const [ bYScale, aYScale ] = zipWith(
                compose(rescaleY(volumeTransform), scale),
                [ [ height - paddingY, paddingY ], [ height - paddingY, paddingY ] ],
                volumeDomain(sBids, sAsks)
            )

            const formatPrice = priceFormatter(
                precisionFixed(
                    absDiff(
                        ...take(2, bid).map(head)
                    )
                )
            )

            const eqPriceWidth = measureX(
                formatPrice(eqPrice)
            )
            const mx = o(measureX, formatPrice)
            const my = () => textHeight

            const measurements = [ mx, my ]

            const [ bXTicks, bYTicks ] = ticks.bid[ tick ](measurements, [ bXScale, bYScale ], sBids)
            const [ aXTicks, aYTicks ] = ticks.ask[ tick ](measurements, [ aXScale, aYScale ], sAsks)

            const bXFiltered = tick === 'volume'
                ? bXTicks
                : filterTicks(
                    mx,
                    bXScale.copy().range([ paddingX, center - eqPriceWidth / 2 ]),
                    bXTicks
                )

            const aXFiltered = tick === 'volume'
                ? aXTicks
                : filterTicks(
                    mx,
                    aXScale.copy().range([ center + eqPriceWidth / 2, width - paddingX ]),
                    aXTicks
                )

            const bXReduced = tick === 'volume' ? bXTicks : init(bXTicks)
            const aXReduced = tick === 'volume' ? aXTicks : tail(aXTicks)

            const bYReduced = tick === 'volume' ? bYTicks : bYTicks.length > 1 ? init(bYTicks) : bYTicks
            const aYReduced = tick === 'volume' ? aYTicks : aYTicks.length > 1 ? tail(aYTicks) : aYTicks

            const bYFiltered = showVolTick ? filterTicks(my, bYScale, bYReduced) : ([])
            const aYFiltered = showVolTick ? filterTicks(my, aYScale, aYReduced) : ([])

            context.scale(devicePixelRatio, devicePixelRatio)

            drawBid({
                context: context,
                xScale: bXScale,
                yScale: bYScale,
                data: sBids,
                ticks: zip(bXReduced, bYReduced)
            })

            drawAsk({
                context: context,
                xScale: aXScale,
                yScale: aYScale,
                data: sAsks,
                ticks: zip(aXReduced, aYReduced)
            })

            drawLines({
                context: context,
                stroke: {
                    color: 'grey',
                    thickness: 1,
                    style: 'solid'
                },
                lines: [
                    pair([ width / 2, paddingY + 16 ], [ width / 2, height - paddingY ])
                ]
            })

            drawLines({
                context: context,
                stroke: {
                    color: 'grey',
                    thickness: 1,
                    style: 'solid'
                },
                lines: [
                    [ [ paddingX, paddingY ], [ paddingX, height - paddingY ] ],
                    [ [ width - paddingX, paddingY ], [ width - paddingX, height - paddingY ] ],
                    [ [ paddingX, height - paddingY ], [ width - paddingX, height - paddingY ] ],
                    ...bXFiltered.map(v =>
                        pair([ bXScale(v), height - paddingY ], [ bXScale(v), height - paddingY + tickLength ])
                    ),
                    ...aXFiltered.map(v =>
                        pair([ aXScale(v), height - paddingY ], [ aXScale(v), height - paddingY + tickLength ])
                    ),
                    ...bYFiltered.map(v =>
                        pair([ paddingX - tickLength, bYScale(v) ], [ paddingX, bYScale(v) ])
                    ),
                    ...aYFiltered.map(v =>
                        pair([ width - paddingX, aYScale(v) ], [ width - paddingX + tickLength, aYScale(v) ])
                    )
                ]
            })

            drawTexts({
                context: context,
                font: { color: defaultWhiteColor },
                texts: [
                    ...bXFiltered.map(v => {
                        const message = formatPrice(v)
                        const tWidth = measureX(message)
                        return {
                            message: message,
                            x: clamp(
                                paddingX,
                                center - tWidth / 2,
                                bXScale(v)
                            ),
                            y: height - paddingY + tickLength + textHeight / 2
                        }
                    }),
                    ...aXFiltered.map(v => {
                        const message = formatPrice(v)
                        const tWidth = measureX(message)
                        return {
                            message: formatPrice(v),
                            x: clamp(
                                center + tWidth / 2,
                                width - paddingX,
                                aXScale(v)
                            ),
                            y: height - paddingY + tickLength + textHeight / 2
                        }
                    }),
                    ...bYFiltered.map(v => {
                        const message = formatVolume(v)
                        const tWidth = measureX(message)
                        return {
                            message: formatVolume(v),
                            x: paddingX - tickLength - tWidth / 2,
                            y: bYScale(v)
                        }
                    }),
                    ...aYFiltered.map(v => {
                        const message = formatVolume(v)
                        const tWidth = measureX(message)
                        return {
                            message: formatVolume(v),
                            x: width - paddingX + tickLength + tWidth / 2,
                            y: aYScale(v)
                        }
                    }),
                    {
                        message: formatEqPrice(eqPrice),
                        x: width / 2,
                        y: paddingY - 8
                    }
                ]
            })

            drawTexts({
                context: context,
                font: { color: defaultColor },
                texts: [
                    {
                        message: formatEqChange(eqChange),
                        x: width / 2,
                        y: paddingY + 8
                    }
                ]
            })
        } else {
            drawTexts({
                context: context,
                font: { color: defaultWhiteColor, size: 14 },
                texts: [
                    {
                        message: 'Not Enough Data Available to Display Depth.',
                        x: center,
                        y: height * .25
                    }
                ]
            })
        }

        return () => {
            context.clearRect(0, 0, width, height)
            context.setTransform(1, 0, 0, 1, 0, 0)
        }
    }, [ back, size, zoom, bid, ask, tick, showVolTick ])

    useLayoutEffect((context, [ width, height ], zoom, bid, ask, [ x, y ]) => {
        const transform = scaleZoomTo([ width / 2, 0 ], zoom, zoomIdentity)
        const textHeight = defaultFontSize * 1.5

        const measureX = xMeasure(context)

        const paddingX = add(
            measureX(
                formatVolume(
                    maxVolume(bid, ask)
                )
            ),
            tickLength
        )
        const paddingY = textHeight + tickLength

        const withinXBound = clamp(paddingX, width - paddingX, x) === x
        const withinYBound = clamp(paddingY, height - paddingY, y) === y

        if(withinXBound && withinYBound) {
            const [ eqPrice, eqChange ] = calculateEq(bid, ask)

            const center = round(width / 2)

            const [ bXScale, aXScale ] = zipWith(
                compose(rescaleX(transform), scale),
                [ [ paddingX, center ], [ center, width - paddingX ] ],
                priceDomain(bid, ask)
            )

            const sBids = sliceBid(bXScale, bid)
            const sAsks = sliceAsk(aXScale, ask)

            const sufficient = [ sBids, sAsks ].every(data => data.length > 1)

            if(sufficient) {
                const [ bYScale, aYScale ] = zipWith(
                    compose(rescaleY(volumeTransform), scale),
                    [ [ height - paddingY, paddingY ], [ height - paddingY, paddingY ] ],
                    volumeDomain(sBids, sAsks)
                )

                const t0 = x / width
                const t1 = 1 - t0
                const a = t0 * width
                const b = t1 * width

                const xBid = Math.min(a, b)
                const pBid = bXScale.invert(xBid)
                const iBid = binarySearch(head, pBid, sBids)
                const oBid = head(sBids[ iBid ]) > pBid ? -1 : 0
                const yBid = bYScale(
                    last(sBids[ Math.max(0, iBid + oBid) ])
                )

                const xAsk = Math.max(a, b)
                const pAsk = aXScale.invert(xAsk)
                const iAsk = binarySearch(head, pAsk, sAsks)
                const oAsk = head(sAsks[ iAsk ]) > pAsk ? - 1 : 0
                const yAsk = aYScale(
                    last(sAsks[ Math.max(0, iAsk + oAsk) ])
                )

                const formatPrice = priceFormatter(
                    precisionFixed(
                        absDiff(
                            ...take(2, bid).map(head)
                        )
                    )
                )

                const bidPrice = formatPrice(
                    bXScale.invert(xBid)
                )

                const askPrice = formatPrice(
                    aXScale.invert(xAsk)
                )

                const bidVolume = formatVolume(
                    bYScale.invert(yBid)
                )

                const askVolume = formatVolume(
                    aYScale.invert(yAsk)
                )

                const bidPriceWidth = measureX(bidPrice)
                const askPriceWidth = measureX(askPrice)
                const bidVolumeWidth = measureX(bidVolume)
                const askVolumeWidth = measureX(askVolume)

                const change = formatCursorChange(absDiff(bXScale.invert(xBid), eqPrice) / eqPrice)

                const changeWidth = measureX(change)
                const changeHeight = textHeight

                const priceLabels = [
                    {
                        message: bidPrice,
                        x: clamp(0, center - bidPriceWidth / 2, xBid),
                        y: height - paddingY + tickLength + textHeight / 2,
                        width: bidPriceWidth,
                        height: textHeight,
                        color: defaultUpColor,
                        fill: defaultLabelFill
                    },
                    {
                        message: askPrice,
                        x: clamp(center + askPriceWidth / 2, width - paddingX, xAsk),
                        y: height - paddingY + tickLength + textHeight / 2,
                        width: askPriceWidth,
                        height: textHeight,
                        color: defaultDownColor,
                        fill: defaultLabelFill
                    }
                ]

                const volLabels = [
                    {
                        message: bidVolume,
                        x: paddingX - tickLength - bidVolumeWidth / 2,
                        y: yBid,
                        width: bidVolumeWidth,
                        height: textHeight,
                        color: defaultUpColor,
                        fill: defaultLabelFill
                    },
                    {
                        message: askVolume,
                        x: width - paddingX + tickLength + askVolumeWidth / 2,
                        y: yAsk,
                        width: askVolumeWidth,
                        height: textHeight,
                        color: defaultDownColor,
                        fill: defaultLabelFill
                    }
                ]

                const changeLabels = [
                    {
                        message: change,
                        x: (xBid + center) / 2,
                        y: yBid,
                        width: changeWidth,
                        height: changeHeight,
                        color: defaultUpColor,
                        fill: defaultLabelFill
                    },
                    {
                        message: change,
                        x: (center + xAsk) / 2,
                        y: yAsk,
                        width: changeWidth,
                        height: changeHeight,
                        color: defaultDownColor,
                        fill: defaultLabelFill
                    }
                ]

                const bidVolTick = [
                    [ [ paddingX - tickLength, yBid ], [ paddingX, yBid ] ],
                    [ [ xBid, height - paddingY ], [ xBid, height - paddingY + tickLength ] ]
                ]
                const askVolTick = [
                    [ [ width - paddingX, yAsk ], [ width - paddingX + tickLength, yAsk ] ],
                    [ [ xAsk, height - paddingY ], [ xAsk, height - paddingY + tickLength ] ]
                ]

                const changeText = formatEqChange(eqChange)
                const paddingXCenter = measureX(changeText) / 2
                const paddingYCenter = textHeight

                context.scale(devicePixelRatio, devicePixelRatio)

                context.save()

                drawClip({
                    context: context,
                    points: [
                        [ paddingX, paddingY - paddingYCenter / 2 ],
                        [ center - paddingXCenter, paddingY - paddingYCenter / 2 ],
                        [ center - paddingXCenter, paddingY + paddingYCenter ],
                        [ center + paddingXCenter, paddingY + paddingYCenter ],
                        [ center + paddingXCenter, paddingY - paddingYCenter / 2 ],
                        [ width - paddingX, paddingY - paddingYCenter / 2 ],
                        [ width - paddingX, height - paddingY ],
                        [ paddingX, height - paddingY ]
                    ]
                })

                drawOverlays({
                    context: context,
                    overlays: [
                        [
                            [ paddingX, paddingY ],
                            [ xBid, height - paddingY ]
                        ],
                        [
                            [ xAsk, paddingY ],
                            [ width - paddingX, height - paddingY ]
                        ]
                    ]
                })

                drawLines({
                    context: context,
                    stroke: {
                        color: defaultUpColor,
                        thickness: 1,
                        style: 'dashed'
                    },
                    lines: [
                        [ [ paddingX, yBid ], [ center, yBid ] ],
                        [ [ xBid, paddingY ], [ xBid, height - paddingY ] ]
                    ]
                })

                drawLines({
                    context: context,
                    stroke: {
                        color: defaultDownColor,
                        thickness: 1,
                        style: 'dashed'
                    },
                    lines: [
                        [ [ xAsk, paddingY ], [ xAsk, height - paddingY ] ],
                        [ [ center, yAsk ], [ width - paddingX, yAsk ] ]
                    ]
                })

                context.restore()

                drawPoints({
                    context: context,
                    points: [
                        [ xBid, yBid ],
                        [ xAsk, yAsk ]
                    ]
                })

                drawLines({
                    context: context,
                    stroke: {
                        color: defaultUpColor,
                        thickness: 1,
                        style: 'solid'
                    },
                    lines: showVolTick ? bidVolTick : ([])
                })

                drawLines({
                    context: context,
                    stroke: {
                        color: defaultDownColor,
                        thickness: 1,
                        style: 'solid'
                    },
                    lines: showVolTick ? askVolTick : ([])
                })

                drawLabels({
                    context: context,
                    labels: showVolTick
                        ? ([ ...priceLabels, ...volLabels, ...changeLabels ])
                        : ([ ...priceLabels, ...changeLabels ])
                })
            }
        }

        return () => {
            context.clearRect(0, 0, width, height)
            context.setTransform(1, 0, 0, 1, 0, 0)
        }
    }, [ front, size, zoom, bid, ask, cursor ])

    return (
        loading
            ? <BookLoader />
            : <Canvas
                className='book-canvas'
                onPointerEnter={ onPointerEnter }
                onPointerMove={ onPointerMove }
                onPointerLeave={ onPointerLeave }
                onContext={ setContext }
                onResize={ setSize }
                onZoom={ onZoom }
            />
    )
}

const Book = ({ maps, symbol, socket }) => {

    const [ loading, setLoading ] = useState(true)

    const [ size, setSize ] = useState([])

    const [ zoom, setZoom ] = useState(1)

    const [ tick, setTick ] = useState(defaultTick)

    const [ showVolTick, setShowVolTick ] = useState(true)

    const [ precision, setPrecision ] = useState(defaultPrecision)

    return (
        <div id='book' className='book'>
            <BookHeader
                symbol={ symbol }
                maps={ maps }
                precision={ precision }
                setPrecision={ setPrecision }
                showVolTick={ showVolTick }
                setShowVolTick={ setShowVolTick }
                tick={ tick }
                setTick={ setTick }
                size={ size }
                zoom={ zoom }
                setZoom={ setZoom }
                loading={ loading }
            />
            <BookChart
                loading={ loading }
                setLoading={ setLoading }
                symbol={ symbol }
                size={ size }
                setSize={ setSize }
                zoom={ zoom }
                setZoom={ setZoom }
                socket={ socket }
                showVolTick={ showVolTick }
                precision={ precision }
                tick={ tick }
            />
        </div>
    )
}

export default Book