import React, { memo, useCallback, useMemo, useState } from 'react';
import { timeFormat as formatTime, precisionFixed, scaleLinear, select, zoomIdentity, utcFormat, extent, scaleUtc, utcHour, utcDay, utcMonday, utcYear, utcMonth, utcMinute, utcWeek, utcTickInterval, scaleLog, format, interpolateArray, easeCubicIn, drag } from 'd3'
import { slice, modifyPath, replace, takeLast, join, props, compose, curry, split, equals, identity, is, last, not, nth, propEq, reverse, zipObj, __, chain, map, prop, pair, concat, juxt, always, call, unapply, toUpper, head, assocPath, assoc, o, zipWith, subtract, sort, ascend, isEmpty, update, unless, eqBy, multiply, on, clamp, add, zip, isNil, take, applyTo, transpose, mergeLeft, dropLastWhile, mean, identical, findLast, lte } from 'ramda';
import { defaultXTickSpace, defaultYTickSpace, defaultUpColor, defaultLabelFill, defaultDownColor, defaultChartColors, isOHLC, isHeikinashi, adjustLabel, sortLabel, dataTimeInterval, formatTimeTicks, chartPriceColor, textSizes, textScale, priceExtent, drawLabels, drawChart, drawMultiLines, drawPulse, drawLines, drawTexts, dateFormatter, P, priceSources, price, capitalizeWord, scaleZoomTo, capitalizeWords, appendClassName, zipWithCall, constrainZoomTranslate, translateZoomBy, absDiff, pointer, batch, getOffsetParent, millisecondsToClock, rangeGenerator, zipWithAdd, now, weeksToMilliseconds, hoursToMilliseconds, millisecondsToHours, millisecondsToMinutes, fetchJSON, scaleZoom, getTime, singleton, getTimes, replicate, getNodeHeight, getNodeWidth, isLine, drawTooltip, stream, binarySearch, splitSymbol, defaultColor, defaultWhiteColor, pixelToRem, defaultBlueColor, resizeObserver } from '../utils'
import { useEffect, useLayoutEffect } from './hooks';

import * as rx from 'rxjs'

import { ToggleMenuPlacements, TooltipPlacements, ContextMenuPlacements, PopupPlacements } from './Placement'
import Icon from './Icon'
import Button from './Button'
import Select from './Select'
import CheckInput from './Check'
import NumberInput from './Number'
import { Stroke, Fill } from './Customize'
import { TimeCalendar, TimeClock, TimeDate } from './Time';
import fscreen from 'fscreen';
import { colord, extend } from 'colord';
import a11yPlugin from "colord/plugins/a11y";
import namesPlugin from 'colord/plugins/names'
import Canvas from './Canvas';
import Loader from './Loader';

extend([ a11yPlugin, namesPlugin ]);

const defaultAreaFill = colord('white').alpha(0).toHex()

const devicePixelRatio = window.devicePixelRatio || 1

const defaultGridColor = 'rgba(115, 115, 115, 0.15)'

const defaultBlueLabel = '#142e61'

const defaultLineThickness = 2

const defaultAxisColor = 'rgba(126, 126, 126, 0.5)'

const defaultHLCCloseColor = '#9A9A9A'

const timeDomain = compose(
    map(P.mts),
    juxt([ head, last ])
)

const volumeDomain = v => {
    const [ min, max ] = extent(v, P.volume)
    if(min === max) {
        if(min === 0 && max === 0) {
            return [ 0, 1 ]
        } else {
            return [ min - min * .5, max + max * .5 ]
        }
    } else {
        return [ min, max ]
    }
}

const scaleTimeInterval = curry((timeScale, [ a, b ]) =>
    on(absDiff, o(timeScale, P.mts), a, b)
)

const calculateScaleExtent = curry((min, max, distance, scale) =>
    pair(scale * min / distance, scale * max / distance)
)

const applyTransform = zipWith((a, b) => is(Function, a) ? a(b) : a)

const defaultXScaleExtent = [ .1, 100 ]
const defaultYScaleExtent = [ -Infinity, Infinity ]

const defaultScaleExtent = [
    defaultXScaleExtent,
    defaultYScaleExtent
]

const defaultXtransform = zoomIdentity

const defaultYTransform = zoomIdentity

const defaultTransform = [ defaultXtransform, defaultYTransform ]

const defaultPlotWidth = 1920

const defaultPlotHeight = 1080

const defaultPlotSize = [ defaultPlotWidth, defaultPlotHeight ]

const defaultDomain = [ 0, 1 ]

const defaultTimeRange = [ 0, defaultPlotWidth ]

const defaultPriceRange = [ 0, defaultPlotHeight ]

const defaultVolumeRange = [ defaultPlotHeight, defaultPlotHeight * 0.8 ]

const timeScale = scaleUtc()

const defaultTimeScale = () => timeScale.copy().range(defaultTimeRange)

const linearScale = scaleLinear()

const logScale = scaleLog()

const defaultPriceScale = log =>
    log
        ? logScale.copy().range(defaultPriceRange)
        : linearScale.copy().range(defaultPriceRange)

const defaultVolumeScale = () => linearScale.copy().range(defaultVolumeRange)

const mapScaleDomain = curry((fn, scale) =>
    scale.copy().domain(
        scale.domain().map(fn)
    )
)

const defaultTickCount = 240

const defaultTickOffset = 10

const today = new Date()

const timeFormats = [
    `%e %b '%y`,
    '%b %e, %Y',
    '%b %e',
    '%Y-%m-%e',
    '%y-%m-%e',
    '%y/%m/%e',
    '%Y/%m/%e',
    '%e-%m-%Y',
    '%e-%m-%y',
    '%e/%m/%y',
    '%e-%m-%Y',
    '%m/%e/%y',
    '%m/%e/%Y'
]

const calculateZoomTransition = curry((t0, t1, i) => {
    const interpolator = on(
        interpolateArray,
        props([ 'x', 'y', 'k' ])
    )

    const output = compose(
        map(([ x, y, k ]) =>
            zoomIdentity.translate(x, y).scale(k)
        ),
        juxt(
            zipWith(interpolator, t0, t1)
        )
    )
    return output(i)
})

const animationFrames = duration =>
    rx.animationFrames().pipe(
        rx.map(({ elapsed }) => duration === 0 ? 1 : elapsed / duration),
        rx.takeWhile(v => v < 1),
        rx.startWith(0),
        rx.endWith(1),
        rx.share()
    )

const defaultTimeFormat = 0

const defaultTimeFormatDate = new Date(1997, 8, 29)

const parseByTimeZone = (timeZone, date) => new Date(
    date.toLocaleString('en-US', { timeZone })
)

const timeZones = [
    'UTC',
    'Africa/Lagos',
    'Africa/Johannesburg',
    'Africa/Cairo',
    'America/Juneau',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Vancouver',
    'America/Denver',
    'America/El_Salvador',
    'America/Bogota',
    'America/Chicago',
    'America/Lima',
    'America/Mexico_City',
    'America/Caracas',
    'America/New_York',
    'America/Santiago',
    'America/Toronto',
    'America/Argentina/Buenos_Aires',
    'America/Sao_Paulo',
    'Asia/Bahrain',
    'Asia/Jerusalem',
    'Asia/Kuwait',
    'Asia/Qatar',
    'Asia/Riyadh',
    'Asia/Dubai',
    'Asia/Muscat',
    'Asia/Tehran',
    'Asia/Ashgabat',
    'Asia/Kolkata',
    'Asia/Almaty',
    'Asia/Bangkok',
    'Asia/Ho_Chi_Minh',
    'Asia/Jakarta',
    'Asia/Chongqing',
    'Asia/Hong_Kong',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Taipei',
    'Asia/Seoul',
    'Asia/Tokyo',
    'Atlantic/Reykjavik',
    'Australia/Perth',
    'Australia/Adelaide',
    'Australia/Brisbane',
    'Australia/Sydney',
    'Europe/Dublin',
    'Europe/Lisbon',
    'Europe/London',
    'Europe/Amsterdam',
    'Europe/Belgrade',
    'Europe/Berlin',
    'Europe/Brussels',
    'Europe/Copenhagen',
    'Europe/Luxembourg',
    'Europe/Helsinki',
    'Europe/Istanbul',
    'Europe/Madrid',
    'Europe/Malta',
    'Europe/Oslo',
    'Europe/Paris',
    'Europe/Rome',
    'Europe/Stockholm',
    'Europe/Warsaw',
    'Europe/Zurich',
    'Europe/Tallinn',
    'Europe/Vilnius',
    'Europe/Riga',
    'Europe/Athens',
    'Europe/Moscow',
    'Pacific/Norfolk',
    'Pacific/Auckland',
    'Pacific/Chatham',
    'Pacific/Honolulu'
].map(timeZone => {
    return [
        timeZone,
        on(
            subtract,
            getTime,
            parseByTimeZone(timeZone, today),
            parseByTimeZone('UTC', today)
        )
    ]
})

const defaultTimeZone = 0

const getTimeZone = tz => timeZones[ tz ]

const getTimeZoneOffset = compose(last, getTimeZone)

const getTimeZoneRegion = compose(
    replace('_', ' '),
    last,
    split('/'),
    head,
    getTimeZone
)

const formatTimeZoneOffset = v => {
    const prefix = v > 0 ? '+' : v < 0 ? '-' : ''
    const hours = millisecondsToHours(v)
    const minutes = millisecondsToMinutes(
        hoursToMilliseconds(hours % 1)
    )
    const format = compose(Math.trunc, Math.abs)
    const suffix = [ hours, minutes ].map(format).filter(v => v).join(':')
    return [ prefix, suffix ].filter(v => v).join('')
}

const getTimeZoneUTC = compose(
    v => `(${v})`,
    concat('UTC'),
    formatTimeZoneOffset,
    getTimeZoneOffset
)

const timeZoneToString = compose(
    join(' '),
    juxt([
        getTimeZoneUTC,
        getTimeZoneRegion
    ])
)

const tickInterval = data => {
    const interval = take(2, data).map(P.mts)
    const diff = absDiff(...interval)
    return diff === hoursToMilliseconds(4)
        ? utcHour.every(4)
        : diff === weeksToMilliseconds(1)
            ? utcMonday
            : utcTickInterval(...interval, 1)
}

const normalizeTimestamp = curry((sampleSize, data) => {
    const intervals = takeLast(sampleSize, data).reduce((a, b, i, arr) => {
        if(i + 1 < arr.length) {
            const items = [ b, arr[ i + 1 ] ]
            const interval = on(absDiff, P.mts, ...items)
            return { ...a, [ interval ]: interval in a ? a[ interval ].concat([ items ]) : [ items ] }
        } else {
            return a
        }
    }, {})
    const keys = Object.keys(intervals).sort((a, b) => intervals[ b ].length - intervals[ a ].length)
    const interval = tickInterval(
        head(intervals[ head(keys) ])
    )
    const normalized = data.reduce((acc, curr) => {
        if(isEmpty(acc)) {
            return [ curr ]
        } else {
            const prev = last(acc)
            const [ start, end ] = [ prev, curr ].map(P.mts)
            const dummy = P.close(prev)
            const filler = interval.range(interval.offset(start, 1), end).map(v => {
                return [ v.getTime(), dummy, dummy, dummy, dummy, 0 ]
            })
            return acc.concat(filler).concat([ curr ])
        }
    }, [])
    const recent = last(normalized)
    const dummy = P.close(recent)
    const filler = interval.range(interval.offset(P.mts(recent), 1), Date.now()).map(v => {
        return [ v.getTime(), dummy, dummy, dummy, dummy, 0 ]
    })
    return normalized.concat(filler)
})

const formatRequest = curry((tickInterval, dates) =>
    zipWithCall([ tickInterval.floor, tickInterval.ceil ], dates).map(getTime)
)

const formatDestination = curry((tickInterval, dates) =>
    dates.map(tickInterval.round).map(getTime)
)

const defaultXAxisHeight = 25

const defaultYAxisWidth = 45

const timeIntervals = [
    [
        'minutes',
        [
            [
                '1m',
                '1 minute'
            ],
            [
                '5m',
                '5 minutes'
            ],
            [
                '15m',
                '15 minutes'
            ],
            [
                '30m',
                '30 minutes'
            ]
        ]
    ],
    [
        'hours',
        [
            [
                '1h',
                '1 hour'
            ],
            [
                '3h',
                '3 hours'
            ],
            [
                '4h',
                '4 hours'
            ],
            [
                '6h',
                '6 hours'
            ],
            [
                '12h',
                '12 hours'
            ]
        ]
    ],
    [
        'days',
        [
            [
                '1D',
                '1 day'
            ],
            [
                '1W',
                '1 week'
            ],
            [
                '1M',
                '1 month'
            ]
        ]
    ]
]

const toUTCSTrings = v => v.map(v => new Date(v).toUTCString())

const timeRanges = [
    {
        label: '3 Years',
        interval: '1W',
        generate: compose(
            getTimes,
            juxt([ v => utcYear.offset(v, -3), identity ]),
            utcMonday
        )
    },
    {
        label: '1 Year',
        interval: '1D',
        generate: compose(
            getTimes,
            juxt([ v => utcYear.offset(v, -1), identity ]),
            utcDay
        )
    },
    {
        label: '3 Months',
        interval: '12h',
        generate: compose(
            getTimes,
            juxt([ v => utcMonth.offset(v, -3), identity ]),
            utcHour.every(12)
        )
    },
    {
        label: '1 Month',
        interval: '6h',
        generate: compose(
            getTimes,
            juxt([ v => utcMonth.offset(v, -1), identity ]),
            utcHour.every(6)
        )
    },
    {
        label: '7 Days',
        interval: '1h',
        generate: compose(
            getTimes,
            juxt([ v => utcWeek.offset(v, -1), identity ]),
            utcHour.every(1)
        )
    },
    {
        label: '3 Days',
        interval: '30m',
        generate: compose(
            getTimes,
            juxt([ v => utcDay.offset(v, -3), identity ]),
            utcMinute.every(30)
        )

    },
    {
        label: '1 Day',
        interval: '15m',
        generate: compose(
            getTimes,
            juxt([ v => utcDay.offset(v, -1), identity ]),
            utcMinute.every(15)
        )
    },
    {
        label: '6 Hours',
        interval: '5m',
        generate: compose(
            getTimes,
            juxt([ v => utcHour.offset(v, -6), identity ]),
            utcMinute.every(5)
        )
    },
    {
        label: '1 Hour',
        interval: '1m',
        generate: compose(
            getTimes,
            juxt([ v => utcHour.offset(v, -1), identity ]),
            utcMinute
        )
    }
]

const defaultTimeInterval = '30m'

const UIVisibilities = [
    'always invisible',
    'always visible',
    'visible on mouse over'
]

const defaultUIVisibility = 2

const defaultPriceSource = 3

const defaultHeikinashiPriceSource = 6

const defaultHighLowPriceSource = 2

const heikinashiAdjuster = ([ start, ...rest ]) => {
    const [ mts, open, close, high, low, volume ] = start
    const averagePrice = price(defaultHeikinashiPriceSource)
    return rest.reduce((a, b) => {
        const prev = last(a)
        const close = averagePrice(b)
        const open = mean([ P.open(prev), P.close(prev) ])
        const high = Math.max(
            P.high(b),
            P.open(b),
            P.close(b)
        )
        const low = Math.min(
            P.low(b),
            P.open(b),
            P.close(b)
        )
        return a.concat([ [ P.mts(b), open, close, high, low, P.volume(b) ] ])
    }, [ [
        mts,
        open,
        averagePrice(start),
        Math.max(high, open, close),
        Math.min(low, open, close),
        volume
    ] ])
}
const pricePrecisions = [
    -1,
    0,
    ...rangeGenerator(v => v * 10, 10, 10000000000),
    ...rangeGenerator(v => v * 2, 2, 320)
]

const defaultPricePrecision = head(pricePrecisions)

const precisionScale = scaleLinear()
    .domain([ 0, 10 ])
    .range([ 1, 2.8 ])

const toPrecision = curry((precision, value) =>
    format(`.${precision}f`)(value)
)

const transformers = [ identity, add(-1), identity, multiply(100) ]
const precisions = [ identity, always(2), identity, always(2) ]
const suffixes = [ 'f', '%', 'f', 'f' ]
const formatters = transpose([ transformers, precisions, suffixes ])

const priceFormatter = curry((priceAlgorithm, pricePrecision, price) => {
    const [ transformer, precision, suffix ] = formatters[ priceAlgorithm ]
    const value = transformer(price)
    return format(`.${precision(pricePrecision)}${suffix}`)(value)
})

const formatVolume = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short'
}).format

const formatPercent = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero'
}).format

const priceAlgorithms = [
    [ 'regular', 'auto' ],
    [ 'percent', '%' ],
    [ 'logarithmic', 'log' ],
    [ 'index', 'i' ]
]

const defaultPriceAlgorithm = 0

const logAlgorithms = [ 1, 3 ]

const isLogAlgorithm = v => logAlgorithms.includes(v)

const types = [
    'area',
    'bars',
    'baseline',
    'candles',
    'columns',
    'Heikin-Ashi',
    'High-Low',
    'HLC',
    'hollow',
    'line',
    'markers',
    'step'
]

const defaultType = 3

const placementsText = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top'
}

const placementsFunction = {
    left: reverse,
    right: identity,
    top: reverse,
    bottom: identity
}

const formatGridTemplate = map(
    join(' ')
)

const getGridTemplate = curry((placements, templates) =>
    zip(placements, templates).map(([ placement, template ]) =>
        placementsFunction[ placement ](template)
    )
)

const formatGridAreas = o(
    join('\n'),
    map(v => `'${v.join(' ')}'`)
)

const getGridAreas = curry(([ x, y ], templates) =>
    [ placementsFunction[ x ], map(placementsFunction[ y ]) ].reduce(applyTo, templates)
)

const defaultStatus = ({ chart, precision, change, data }) => {
    const close = P.close(data)
    const volume = P.volume(data)
    const index = Number(
        chart.previous ? change < 0 : P.open(data) > P.close(data)
    )
    const color = defaultChartColors[ index ]
    const percent = change / close || 0
    return [
        { id: 'change', label: '', value: (change > 0 ? '+' : '') + format(`.${precision}f`)(change), color: color },
        { id: 'change', label: '', value: `(${formatPercent(isFinite(percent) ? percent : 0)})`, color: color },
        { id: 'volume', label: 'Vol', value: formatVolume(volume), color: color }
    ]
}

const ohlcStatus = ({ data, change, precision, chart }) => {
    const color = chartPriceColor(3, { chart, change, data })
    const [ , open, close, high, low ] = data.map(
        toPrecision(precision)
    )

    return [
        { id: 'ohlc', label: 'O', value: open, color: color },
        { id: 'ohlc', label: 'H', value: high, color: color },
        { id: 'ohlc', label: 'L', value: low, color: color },
        { id: 'ohlc', label: 'C', value: close, color: color },
        ...defaultStatus({ chart, precision, change, data })
    ]
}

const nonOhlcStatus = ({ data, precision, chart, base, algorithm }) => {
    const log = isLogAlgorithm(algorithm)
    const value = price(chart.price, data)
    const changeLog = value / price(chart.price, base)
    return [
        { id: 'ohlc', label: '', value: priceFormatter(algorithm, precision, log ? changeLog : value) }
    ]
}

const baselineStatus = ({ data, baselinePrice, order, base, change, chart, algorithm, precision, height }) => {
    const color = chartPriceColor(2, { baselinePrice, order, data, chart, height })
    return nonOhlcStatus({ data, precision, chart, base, algorithm })
        .map(
            assoc('color', color)
        )
        .concat(
            defaultStatus({ chart, precision, change, data }).filter(({ id }) =>
                isLogAlgorithm(algorithm)
                    ? id === 'volume'
                    : true
            )
        )
}

const columnStatus = ({ data, change, precision, chart, base, algorithm }) =>
    nonOhlcStatus({ data, precision, chart, base, algorithm })
        .map(v => {
            return { ...v, color: chartPriceColor(4, { chart, change, data }) }
        })
        .concat(
            defaultStatus({ chart, precision, change, data }).filter(({ id }) =>
                isLogAlgorithm(algorithm)
                    ? id === 'volume'
                    : true
            )
        )

const lineStatus = ({ algorithm, precision, base, data, chart, change }) =>
    nonOhlcStatus({ data, precision, base, chart, algorithm })
        .map(
            assoc('color', chart.stroke.color)
        )
        .concat(
            defaultStatus({ chart, precision, change, data }).filter(({ id }) =>
                isLogAlgorithm(algorithm)
                    ? id === 'volume'
                    : true
            )
        )

const highLowStatus = ({ data, precision, chart }) => {
    const high = P.high(data)
    const low = P.low(data)
    const volume = P.volume(data)
    const precise = toPrecision(precision)
    const index = Number(
        P.open(data) > P.close(data)
    )
    const color = chart.border.color
    return [
        { id: 'ohlc', label: '', value: precise(high), color: color },
        { id: 'ohlc', label: '', value: precise(low), color: color },
        { id: 'volume', label: 'Vol', value: formatVolume(volume), color: defaultChartColors[ index ] }
    ]
}

const HLCStatus = ({ data, precision, chart, change }) => {
    const precise = toPrecision(precision)
    const high = P.high(data)
    const low = P.low(data)
    const close = P.close(data)
    return [
        { id: 'ohlc', label: 'H', value: precise(high), color: chart.high.color },
        { id: 'ohlc', label: 'L', value: precise(low), color: chart.low.color },
        { id: 'ohlc', label: 'C', value: precise(close), color: chart.close.color },
        ...defaultStatus({ chart, precision, change, data })
    ]
}

const chartStatus = curry((type, props) => {
    const fns = [
        lineStatus,
        columnStatus,
        baselineStatus,
        ohlcStatus,
        columnStatus,
        ohlcStatus,
        highLowStatus,
        HLCStatus,
        ohlcStatus,
        lineStatus,
        lineStatus,
        lineStatus
    ]
    return fns[ type ](props).map(v => {
        return { ...v, color: colord(v.color).alpha(1).toRgbString() }
    })
})

const drawMainChart = ({
    context,
    size: [ width, height ],
    frame,
    symbol,
    timeScale,
    priceScale,
    volumeScale,
    timeOffset,
    data,
    log,
    type,
    chart,
    recent,
    recentChange,
    start,
    end,
    session,
    line,
    label,
    font,
    grid: [ xGrid, yGrid ],
    showTimeTooltip,
    timeFormat,
    order,
    baselinePrice,
    direction
}) => {
    const rPrice = price(chart.price, recent)
    const ePrice = price(chart.price, end)
    const pPrice = price(chart.price, findLast(v => P.mts(v) < P.mts(end), data))
    const sPrice = price(chart.price, start)

    const [ low, high ] = priceExtent(juxt([ P.low, P.high ]), data)
    const volume = P.volume(end)

    const ts = timeScale.copy().domain(
        timeScale.domain().map(v => v.getTime() + timeOffset)
    )
    const ps = compose(
        priceScale,
        multiply(
            1 / (log ? sPrice : 1)
        )
    )

    const textRatio = textScale(font.size)

    const Y = {
        price: ps(rPrice),
        high: ps(high),
        low: ps(low),
        volume: volumeScale(volume),
        recent: ps(rPrice),
        end: ps(ePrice)
    }

    const symbolColor = label.fill.symbol || chartPriceColor(type, {
        data: recent,
        change: recentChange,
        chart: chart,
        order: order,
        baselinePrice: baselinePrice
    })

    const volumeColor = label.fill.volume || chartPriceColor(4, {
        chart: { previous: chart.previous, fill: defaultChartColors },
        data: end,
        change: ePrice / pPrice
    })

    const lineStroke = {
        ...line.stroke,
        price: {
            ...line.stroke.price,
            color: line.stroke.price.color || symbolColor
        }
    }

    const xCount = Math.floor(
        width / (textScale(font.size) * defaultXTickSpace)
    )

    const yCount = Math.floor(
        height / (textRatio * defaultYTickSpace)
    )

    const xTicks = formatTimeTicks(
        dataTimeInterval(data),
        timeOffset,
        ts.ticks(xCount)
    ).map(ts)

    const yTicks = priceScale.ticks(yCount).map(priceScale)

    const allowedLabels = [ 'symbol', 'high', 'low', 'volume' ]

    const ltr = direction === 'right'

    const radius = ltr ? ([ 5, 0, 0, 5 ]) : ([ 0, 5, 5, 0 ])

    const labels = sortLabel(head, height / 2, [
        pair(
            Y.recent,
            [
                ...singleton(
                    label.value.symbol
                        ? ({ id: 'symbol', message: toUpper(symbol).slice(1), fill: symbolColor })
                        : ({ id: 'price', message: '', fill: '' })
                ),
                { id: 'change', message: '', fill: '' },
                { id: 'countdown', message: '', fill: '' }
            ],
        ),
        ...(
            equals(recent, end)
                ? ([])
                : singleton(
                    pair(
                        Y.end,
                        pair(
                            { id: 'price', message: '', fill: '' },
                            { id: 'change', message: '', fill: '' }
                        )
                    )
                )
        ),
        pair(
            Y.high,
            singleton({ id: 'high', message: 'High', fill: label.fill.high })
        ),
        pair(
            Y.low,
            singleton({ id: 'low', message: 'Low', fill: label.fill.low })
        ),
        pair(
            Y.volume,
            singleton({ id: 'volume', message: 'Volume', fill: volumeColor })
        )
    ]).reduce((acc, [ value, values ]) => {
        const filtered = values.filter(({ id }) => label.value[ id ])
        const labelHeight = font.size * 2
        const y = head(
            adjustLabel(
                pair(
                    value,
                    [ value, value + filtered.length * labelHeight ]
                ),
                acc.map(({ value, y, height }) =>
                    pair(value, [ y, y + height ])
                )
            )
        )
        return acc.concat(
            filtered.map((label, i) => {
                const measure = toUpper(label.message)
                const labelWidth = context.measureText(measure).width * 1.2
                const x = ltr ? width - labelWidth / 2 : labelWidth / 2
                return {
                    ...label,
                    value: value,
                    x: x,
                    y: y + i * labelHeight,
                    width: labelWidth,
                    height: labelHeight,
                    radius: radius
                }
            })
        )
    }, []).filter(({ id }) =>
        allowedLabels.includes(id)
    )

    drawLines({
        context: context,
        stroke: xGrid,
        lines: xTicks.map(x =>
            zip([ x, x ], [ 0, height ])
        )
    })

    drawLines({
        context: context,
        stroke: yGrid,
        lines: yTicks.map(y =>
            zip([ 0, width ], [ y, y ])
        )
    })

    drawMultiLines({
        context: context,
        lines: log
            ? singleton({
                stroke: { thickness: 1, color: defaultWhiteColor, style: 'solid' },
                line: zip([ 0, width ], [ priceScale(1), priceScale(1) ])
            })
            : ([])
    })

    drawChart(4, {
        context: context,
        data: data,
        width: width,
        height: Math.max(...volumeScale.range()),
        timeScale: timeScale,
        priceScale: volumeScale,
        order: order,
        chart: {
            price: -1,
            previous: chart.previous,
            fill: defaultChartColors
        }
    })

    if(isLine(type) && eqBy(P.mts, end, recent)) {
        drawChart(type, {
            context: context,
            data: data,
            timeScale: timeScale,
            priceScale: ps,
            width: width,
            height: height,
            chart: chart,
            order: order
        })

        drawPulse({
            context: context,
            frame: frame,
            pulse: {
                x: timeScale(
                    P.mts(recent)
                ),
                y: Y.recent,
                color: chartPriceColor(type, {
                    data: recent,
                    change: recentChange,
                    chart: chart,
                    order: order,
                    baselinePrice: baselinePrice
                })
            }
        })
    } else {
        drawChart(type, {
            context: context,
            data: data,
            timeScale: timeScale,
            priceScale: ps,
            width: width,
            height: height,
            chart: chart,
            order: order
        })
    }

    drawMultiLines({
        context: context,
        lines: session.value
            ? xTicks.map(x => {
                return {
                    stroke: session.stroke,
                    line: zip([ x, x ], [ 0, height ])
                }
            })
            : ([])
    })

    drawMultiLines({
        context: context,
        lines: Object.keys(line.value).reduce((acc, key) => {
            if(line.value[ key ]) {
                return acc.concat([ {
                    stroke: lineStroke[ key ],
                    line: zip([ 0, width ], [ Y[ key ], Y[ key ] ])
                } ])
            } else {
                return acc
            }
        }, [])
    })

    drawLabels({ context, font, labels })

    if(showTimeTooltip) {
        const value = data[ binarySearch(P.mts, timeScale.invert(width / 2), data) ]
        const time = P.mts(value)
        const date = utcFormat(timeFormats[ timeFormat ])(time)
        const hour = millisecondsToClock(time).slice(0, -3)
        const x = timeScale(time)
        const y = isOHLC(type)
            ? Math.min(
                ps(
                    P.high(value)
                ),
                ps(
                    P.low(value)
                )
            )
            : ps(
                price(chart.price, value)
            )

        drawTooltip({
            context: context,
            font: font,
            messages: [ date, hour ],
            x: x,
            y: y
        })
    }
}

const drawMainCursor = ({
    context,
    size: [ width, height ],
    timeScale,
    priceScale,
    crosshair,
    cursor
}) => {
    const [ x, y ] = zipWithCall([ timeScale, priceScale ], cursor)

    drawLines({
        context: context,
        stroke: crosshair,
        lines: [ zip([ x, x ], [ 0, height ]), zip([ 0, width ], [ y, y ]) ]
    })
}

const drawHorizontalAxis = ({
    context,
    size: [ width, height ],
    timeScale,
    timeOffset,
    data,
    font
}) => {
    const count = Math.floor(
        width / (textScale(font.size) * defaultXTickSpace)
    )

    const ts = mapScaleDomain(v => v.getTime() + timeOffset, timeScale)

    const ticks = formatTimeTicks(
        dataTimeInterval(data),
        timeOffset,
        ts.ticks(count)
    )

    const floor = tickInterval(data)

    drawTexts({
        context: context,
        font: font,
        texts: ticks.map(tick => {
            const floored = floor(tick)
            return {
                message: dateFormatter(
                    floored.getUTCHours() === 0 ? floored : tick
                ),
                x: ts(tick),
                y: height / 2
            }
        })
    })
}

const drawHorizontalCursor = ({
    context,
    size: [ width, height ],
    timeScale,
    timeOffset,
    timeFormat,
    cursor: [ time ],
    font,
    orientation
}) => {
    const value = time + timeOffset
    const date = utcFormat(timeFormats[ timeFormat ])(value)
    const hour = millisecondsToClock(value).slice(0, -3)
    const message = date + '   ' + hour
    const rectWidth = context.measureText(message.toUpperCase()).width * 1.3
    const rectHeight = height
    const radius = orientation === 'bottom' ? ([ 0, 0, 5, 5 ]) : ([ 5, 5, 0, 0 ])

    drawLabels({
        context: context,
        font: font,
        labels: singleton({
            fill: defaultLabelFill,
            message: message,
            x: clamp(
                rectWidth / 2,
                width - rectWidth / 2,
                timeScale(time)
            ),
            y: height / 2,
            width: rectWidth,
            height: rectHeight,
            radius: radius
        })
    })
}

const drawVerticalAxis = ({
    context,
    size: [ width, height ],
    now,
    priceAlgorithm,
    pricePrecision,
    priceScale,
    volumeScale,
    label,
    type,
    chart,
    data,
    start,
    end,
    recent,
    recentChange,
    font,
    order,
    baselinePrice,
    orientation
}) => {
    const log = isLogAlgorithm(priceAlgorithm)

    const rPrice = price(chart.price, recent)
    const sPrice = price(chart.price, start)
    const ePrice = price(chart.price, end)
    const pPrice = price(chart.price, findLast(v => P.mts(v) < P.mts(end), data))

    const volume = P.volume(end)
    const [ low, high ] = priceExtent(juxt([ P.low, P.high ]), data)

    const countdown = tickInterval(data).offset(P.mts(recent), 1) - now

    const ps = compose(
        priceScale,
        multiply(
            1 / (log ? sPrice : 1)
        )
    )

    const formatPrice = priceFormatter(priceAlgorithm, pricePrecision)

    const formatCountdown = countdown =>
        millisecondsToClock(countdown).slice(countdown < hoursToMilliseconds(1) ? 3 : 0)

    const Y = {
        recent: ps(rPrice),
        end: ps(ePrice),
        high: ps(high),
        low: ps(low),
        volume: volumeScale(volume)
    }

    const rColor = chartPriceColor(type, {
        chart: chart,
        data: recent,
        change: recentChange,
        order: order,
        baselinePrice: baselinePrice
    })

    const eColor = chartPriceColor(type, {
        chart: chart,
        data: end,
        change: ePrice / pPrice,
        order: order,
        baselinePrice: baselinePrice
    })

    const volumeColor = label.fill.volume || chartPriceColor(4, {
        chart: { previous: chart.previous, fill: defaultChartColors },
        data: end,
        change: ePrice / pPrice
    })

    const labelWidth = width
    const labelHeight = font.size * 2

    const labels = sortLabel(head, height / 2, [
        pair(
            Y.recent,
            [
                {
                    id: 'price',
                    message: formatPrice(log ? rPrice / sPrice : rPrice),
                    fill: label.fill.price || rColor,
                },
                {
                    id: 'change',
                    message: log ? toPrecision(pricePrecision, rPrice) : formatPercent(rPrice / sPrice - 1),
                    fill: label.fill.change || rColor,
                },
                {
                    id: 'countdown',
                    message: formatCountdown(countdown),
                    fill: label.fill.countdown || rColor,
                }
            ]
        ),
        ...(
            equals(recent, end)
                ? ([])
                : singleton(
                    pair(
                        Y.end,
                        pair(
                            {
                                id: 'price',
                                message: formatPrice(log ? ePrice / sPrice : ePrice),
                                fill: label.fill.price || eColor,
                            },
                            {
                                id: 'change',
                                message: log ? toPrecision(pricePrecision, ePrice) : formatPercent(ePrice / sPrice - 1),
                                fill: label.fill.change || eColor,
                            }
                        )
                    )
                )
        ),
        pair(
            Y.high,
            singleton({
                id: 'high',
                message: toPrecision(pricePrecision, high),
                fill: label.fill.high
            })
        ),
        pair(
            Y.low,
            singleton({
                id: 'low',
                message: toPrecision(pricePrecision, low),
                fill: label.fill.low
            })
        ),
        pair(
            Y.volume,
            singleton({
                id: 'volume',
                message: formatVolume(volume),
                fill: volumeColor
            })
        )
    ]).reduce((acc, [ value, values ]) => {
        const filtered = values.filter(({ id }) => label.value[ id ])
        const x = width / 2
        const y = head(
            adjustLabel(
                pair(
                    value,
                    [ value, value + filtered.length * labelHeight ]
                ),
                acc.map(({ value, y, height }) =>
                    pair(value, [ y, y + height ])
                )
            )
        )

        return acc.concat(
            filtered.map((label, i) => {
                const topRadius = i ? 0 : 5
                const bottomRadius = i < filtered.length - 1 ? 0 : 5
                return {
                    ...label,
                    value: value,
                    x: x,
                    y: y + i * labelHeight,
                    width: labelWidth,
                    height: labelHeight,
                    radius: orientation === 'right'
                        ? ([ 0, topRadius, bottomRadius, 0 ])
                        : ([ topRadius, 0, 0, bottomRadius ])
                }
            })
        )
    }, [])

    drawTexts({
        context,
        font,
        texts: priceScale.ticks(
            Math.floor(
                height / (textScale(font.size) * defaultYTickSpace)
            )
        ).map(tick => {
            return {
                message: formatPrice(tick),
                x: Math.floor(width / 2),
                y: priceScale(tick)
            }
        })
    })

    drawLabels({ context, font, labels })
}

const drawVerticalCursor = ({
    context,
    size: [ width, height ],
    priceScale,
    priceAlgorithm,
    pricePrecision,
    cursor: [ _, price ],
    font,
    orientation
}) => drawLabels({
    context,
    font,
    labels: singleton({
        fill: defaultLabelFill,
        message: priceFormatter(
            priceAlgorithm,
            pricePrecision,
            price
        ),
        x: width / 2,
        y: priceScale(price),
        width: width,
        height: font.size * 2,
        radius: orientation === 'right' ? ([ 0, 5, 5, 0 ]) : ([ 5, 0, 0, 5 ])
    })
})

const resetCanvas = curry((context, size) => {
    context.clearRect(0, 0, ...size)
    context.setTransform(1, 0, 0, 1, 0, 0)
})

const calculatePlotScale = plot => {
    const [ width, height ] = plot.size
    const [ tx, ty ] = plot.transform

    const intv = tickInterval(plot.source)

    const ts = defaultTimeScale().domain(
        eqBy(last, timeDomain(plot.source), plot.timeDomain)
            ? plot.timeDomain
            : timeDomain(
                takeLast(defaultTickCount, plot.source)
            ).map(v =>
                intv.offset(v, defaultTickOffset)
            )
    )

    const interval = scaleTimeInterval(ts, plot.source)

    const [ xMin, xMax ] = zipWithAdd(
        zipWithAdd(
            timeDomain(plot.source).map(ts),
            [ interval * 1.5, -interval * 1.5 ]
        ),
        [ -defaultPlotWidth, width ].map(v => v / tx.k)
    )

    const xt = constrainZoomTranslate(
        [ [ xMin, -Infinity ], [ xMax, Infinity ] ],
        [ [ 0, 0 ], [ defaultPlotWidth, defaultPlotHeight ] ],
        tx
    )

    const yt = plot.autoFit ? defaultYTransform : ty

    const timeScale = zoomIdentity
        .translate(width - defaultPlotWidth)
        .scale(defaultPlotWidth / width)
        .rescaleX(
            xt.rescaleX(ts).range([ 0, width ])
        )

    const clampIndex = clamp(0, plot.source.length - 1)

    const indexes = timeScale.domain().map(v =>
        binarySearch(P.mts, v.getTime(), plot.source)
    )

    const [ start, end ] = indexes.map(v => plot.source[ v ])

    const view = plot.source.slice(
        ...zipWithCall(
            [
                compose(
                    clampIndex,
                    add(-2)
                ),
                compose(
                    add(1),
                    clampIndex,
                    add(2)
                )
            ],
            indexes
        )
    )

    const ps = defaultPriceScale(plot.log)
        .domain(
            sort(
                plot.invert
                    ? (a, b) => a - b
                    : (a, b) => b - a
                ,
                plot.autoFit
                    ? priceExtent(
                        isOHLC(plot.type)
                            ? juxt([ P.low, P.high ])
                            : o(
                                replicate,
                                price(plot.price)
                            )
                        ,
                        view
                    ).map(
                        plot.log
                            ? v => v / price(plot.price, start)
                            : v => v
                    )
                    : plot.priceDomain
            )
        )


    const priceScale = yt
        .rescaleY(
            zoomIdentity
                .translate(0, (defaultPlotHeight / 2) - (defaultPlotHeight / 2) * .6)
                .scale(.6)
                .rescaleY(ps)
        )
        .range([ 0, height ])

    const vs = defaultVolumeScale()
        .domain(
            eqBy(head, plot.view, view)
                ? plot.volumeDomain
                : volumeDomain(view)
        )
        .clamp(true)

    const volumeScale = vs.range([ height, height * 0.8 ])

    const scaleExtent = pair(
        calculateScaleExtent( // 1 being minimum distance between tick and width / 2 being maximum
            1,
            width / 2,
            scaleTimeInterval(timeScale, plot.source),
            xt.k
        ),
        defaultYScaleExtent
    )

    return {
        ...plot,
        view,
        timeScale,
        priceScale,
        volumeScale,
        scaleExtent,
        start,
        end,
        timeDomain: ts.domain(),
        priceDomain: ps.domain(),
        volumeDomain: vs.domain(),
        transform: [ xt, yt ]
    }
}

const calculatePlotTransit = plot => {
    if(isEmpty(plot.transit)) {
        return plot
    } else {
        const domain = plot.timeScale.domain().map(getTime)
        const interval = scaleTimeInterval(plot.timeScale, plot.source)
        const offset = absDiff(...domain) / 2
        const formatSingle = juxt([ add(-offset), add(offset) ])
        const formatMultiple = compose(
            getTimes,
            map(plot.timeScale.invert),
            zipWithAdd([ -interval / 2, interval / 2 ]),
            map(plot.timeScale),
            formatDestination(
                tickInterval(plot.source)
            )
        )

        const single = plot.transit.length === 1

        const destination = call(
            single ? formatSingle : formatMultiple,
            plot.transit
        )
        const transit = []
        if(absDiff(...destination) === 0) {
            return { ...plot, transit }
        } else {
            const result = [ single, destination ]
            const surplus = [ destination, head(plot.source) ]
                .map(head)
                .reduce(subtract)

            if(surplus < 0) {
                return { ...plot, transit, pending: result }
            } else {
                return { ...plot, transit, destination: result }
            }
        }
    }
}

const calculatePlotDestination = plot => {
    if(isEmpty(plot.destination)) {
        return plot
    } else {
        const [ width ] = plot.size
        const [ single, value ] = plot.destination
        const [ xScaleExtent ] = plot.scaleExtent

        const xs = value.map(plot.timeScale)
        const xt = o(
            chain(
                scaleZoomTo([ defaultPlotWidth - (width / 2), 0 ]),
                compose(
                    clamp(...xScaleExtent),
                    multiply(
                        width / absDiff(...xs)
                    ),
                    prop('k')
                )
            ),
            translateZoomBy([ (width / 2) - mean(xs), 0 ])
        )

        const yt = identity

        return {
            ...plot,
            showTimeTooltip: single,
            autoFit: true,
            destination: [],
            transform: zipWithCall([ xt, yt ], plot.transform)
        }
    }
}

const calculatePlotRequest = plot => {
    const start = Math.min(
        head(
            getTimes(
                plot.timeScale.domain()
            )
        ),
        isEmpty(plot.pending) ? Infinity : head(last(plot.pending))
    )

    const end = P.mts(
        head(plot.source)
    )
    if(!isEmpty(plot.request) || plot.completed || start > end) {
        return plot
    } else {
        const interval = tickInterval(plot.source)
        const request = formatRequest(interval, [ interval.offset(start, -5), end ])
        return { ...plot, request }
    }
}

const calculatePlotSelected = plot => {
    if(isEmpty(plot.cursor)) {
        const locked = head(plot.lock)
        const selected = locked ? plot.selected : plot.recent
        const selectedChange = locked ? plot.selectedChange : plot.recentChange
        return { ...plot, selected, selectedChange }
    } else {
        const [ x, min ] = [ plot.cursor, timeDomain(plot.view) ].map(head)
        const index = x < min
            ? -1
            : binarySearch(P.mts, x, plot.view)

        const selected = index < 0
            ? ([])
            : plot.view[ index ]

        const selectedChange = index <= 0
            ? Infinity
            : on(
                subtract,
                price(plot.price),
                plot.view[ index ],
                plot.view[ index - 1 ]
            )

        return { ...plot, selected, selectedChange }
    }
}

const calculatePlotSource = plot => {
    if(plot.loading) {
        return plot
    } else {
        const normalized = normalizeTimestamp(defaultTickCount, plot.data)
        const source = isHeikinashi(plot.type) ? heikinashiAdjuster(normalized) : normalized
        const previous = nth(-2, source)
        const recent = nth(-1, source)
        const recentChange = on(subtract, price(plot.price), recent, previous)
        return { ...plot, source, recent, recentChange }
    }
}

const calculatePlotCursor = plot => {
    const invert = zipWithCall([
        compose(
            getTime,
            tickInterval(plot.source).round,
            plot.timeScale.invert
        ),
        plot.priceScale.invert
    ])
    const cursor = zipWithCall(
        plot.lock.map(v => v ? head : last),
        zip(
            plot.inverted,
            invert(plot.pointer)
        )
    )
    return { ...plot, cursor }
}

const calculatePlotTimeRange = plot => {
    const timeRange = [ plot.start, plot.end ].map(P.mts)
    return { ...plot, timeRange }
}

const calculatePlot = compose(
    calculatePlotRequest,
    calculatePlotTimeRange,
    calculatePlotSelected,
    calculatePlotCursor,
    calculatePlotScale,
    calculatePlotDestination,
    calculatePlotTransit
)

const Reset = <Icon name='reset' />

const isPlacement = ref => ref.className.includes('placement')

const isPlacementEvent = compose(
    isPlacement,
    getOffsetParent,
    prop('target')
)

const ChartSettingHeader = ({ onClose }) => (
    <div className='chart-setting-header draggable'>
        <h3 className='chart-setting-title'>Settings</h3>
        <Button title='Close Settings' display='inline' size='big' onClick={ onClose }>
            <Icon name='close' />
        </Button>
    </div>
)

const ChartSettingNavigation = ({ container, type, navigation, setNavigation }) => {
    const [ size, setSize ] = useState('big')

    useEffect(container => {
        const subscription = resizeObserver([ container ]).subscribe(() =>
            setSize(getNodeWidth(container) < 370 ? 'slim' : 'big')
        )

        return () => subscription.unsubscribe()
    }, [ container ])
    return (
        <menu className='chart-setting-navigation'>
            {
                [
                    [ 'chart' + type, 'type' ],
                    [ 'status', 'status' ],
                    [ 'scale', 'scale' ],
                    [ 'pencil', 'general' ]
                ].map(([ icon, id ], idx) =>
                    <ChartSettingItem key={ id }>
                        <Button
                            display='block'
                            size={ size }
                            highlighted={ idx === navigation }
                            onClick={ useCallback(() => setNavigation(idx), []) }
                        >
                            <span className='chart-setting-icon'>
                                <Icon name={ icon } />
                            </span>
                            <span className='chart-setting-text'>
                                { capitalizeWord(id) }
                            </span>
                        </Button>
                    </ChartSettingItem>
                )
            }
        </menu>
    )
}

const ChartSettingContent = ({ onScroll, children }) => {
    const [ transition, setTransition ] = useState(null)
    const [ scrolled, setScrolled ] = useState(false)

    const onScrolled = () => {
        setScrolled(true)
        setTransition(
            setTimeout(() => setScrolled(false), 125)
        )
    }

    useEffect(transition => () => clearTimeout(transition), [ transition ])

    useLayoutEffect(onScroll, [ scrolled ])

    return (
        <menu
            className='chart-setting-content'
            onScroll={ onScrolled }
        >
            { children }
        </menu>
    )
}

const ChartSettingMain = ({ container, type, onScroll, navigation, setNavigation, content }) => (
    <div className='chart-setting-main'>
        <ChartSettingNavigation
            container={ container }
            type={ type }
            navigation={ navigation }
            setNavigation={ setNavigation }
        />
        <ChartSettingContent onScroll={ onScroll }>
            { content }
        </ChartSettingContent>
    </div>
)

const ChartSettingFooter = ({
    onRestore,
    onCancel,
    onSave
}) => (
    <menu className='chart-setting-footer'>
        {
            [
                {
                    id: 'restore',
                    onClick: onRestore
                },
                {
                    id: 'cancel',
                    onClick: onCancel
                },
                {
                    id: 'save',
                    onClick: onSave
                },
            ].map(({ id, onClick }) =>
                <ChartSettingItem
                    key={ id }
                    className={ 'chart-setting-' + id }
                >
                    <Button
                        size='big'
                        outlined={ true }
                        onClick={ onClick }
                    >
                        { capitalizeWord(id) }
                    </Button>
                </ChartSettingItem>
            )
        }
    </menu>
)

const ChartSettingPopup = ({
    container,
    type,
    onPointerDown,
    onScroll,
    navigation,
    setNavigation,
    content,
    onRestore,
    onCancel,
    onSave
}) => (
    <div
        className='chart-setting'
        onPointerDown={ onPointerDown }
    >
        <ChartSettingHeader onClose={ onSave } />
        <ChartSettingMain
            container={ container }
            type={ type }
            navigation={ navigation }
            setNavigation={ setNavigation }
            content={ content }
            onScroll={ onScroll }
        />
        <ChartSettingFooter
            onRestore={ onRestore }
            onCancel={ onCancel }
            onSave={ onSave }
        />
    </div>
)

const ChartSettingSpanLabel = ({
    value,
    children,
    className = '',
    ...attributes
}) => (
    <span
        className={
            appendClassName('chart-setting-passivelabel', className)
        }
        { ...attributes }
    >
        { value || children }
    </span>
)

const ChartSettingLabel = ({
    value,
    children,
    className = '',
    ...attributes
}) => (
    <label
        className={
            appendClassName('chart-setting-activelabel', className)
        }
        { ...attributes }
    >
        { value || children }
    </label>
)

const ChartSettingItem = ({
    value,
    children,
    className = '',
    ...attributes
}) => (
    <li
        className={
            appendClassName('chart-setting-item', className)
        }
        { ...attributes }
    >
        { value || children }
    </li>
)

const ChartSettingLine = ({
    control,
    clear,
    line,
    setLine,
}) =>
    <>
        {
            Object.entries(line.value).map(([ id ]) =>
                <ChartSettingItem key={ 'line' + id }>
                    <ChartSettingLabel
                        htmlFor={ id + 'line' }
                        value={ capitalizeWords(id + ' ' + 'line') }
                    />
                    <CheckInput
                        id={ id + 'line' }
                        checked={ line.value[ id ] }
                        onChange={
                            useCallback(compose(
                                setLine,
                                assocPath([ 'value', id ])
                            ), [])
                        }
                    />
                    <Stroke
                        control={ control }
                        clear={ clear }
                        value={ line.stroke[ id ] }
                        onChange={
                            useCallback(compose(
                                setLine,
                                assocPath([ 'stroke', id ])
                            ), [])
                        }
                    />
                </ChartSettingItem>
            )
        }
    </>

const ChartSettingPrecision = ({
    control,
    container,
    clear,
    pricePrecision,
    setPricePrecision
}) =>
    <ChartSettingItem>
        <ChartSettingSpanLabel
            value='Price Precision'
        />
        <Select
            control={ control }
            container={ container }
            clear={ clear }
            preview={ pricePrecision >= 0 ? pricePrecision > 0 ? '1' + '/' + (pricePrecision + '') : 'Integer' : 'Default' }
            data={
                useMemo(() => (
                    pricePrecisions.map(precision => {
                        return {
                            center: precision >= 0 ? precision > 0 ? '1' + '/' + (precision + '') : 'Integer' : 'Default',
                            highlighted: precision === pricePrecision,
                            onClick: () => setPricePrecision(precision)
                        }
                    })
                ), [ pricePrecision ])
            }
        />
    </ChartSettingItem>

const ChartSettingTimeZone = ({
    control,
    container,
    clear,
    timeZone,
    setTimeZone
}) =>
    <ChartSettingItem>
        <ChartSettingSpanLabel
            value='Time Zone'
        />
        <Select
            control={ control }
            container={ container }
            clear={ clear }
            preview={ timeZoneToString(timeZone) }
            data={
                useMemo(() => (
                    timeZones.map((_, id) => {
                        return {
                            center: timeZoneToString(id),
                            highlighted: equals(id, timeZone),
                            onClick: () => setTimeZone(id)
                        }
                    })
                ), [ timeZone ])
            }
        />
    </ChartSettingItem>


const ChartSettingAreaType = ({
    control,
    container,
    clear,
    areaChart,
    setAreaChart
}) =>
    <>
        <ChartSettingItem>
            <ChartSettingSpanLabel
                value='Price Source'
            />
            <Select
                control={ control }
                container={ container }
                clear={ clear }
                preview={ priceSources[ areaChart.price ] }
                data={
                    useMemo(() => (
                        priceSources.map((text, idx) => {
                            return {
                                center: text,
                                highlighted: idx === areaChart.price,
                                onClick: () => setAreaChart(
                                    assoc('price', idx)
                                )
                            }
                        })
                    ), [ areaChart.price ])
                }
            />
        </ChartSettingItem>
        <ChartSettingItem>
            <ChartSettingSpanLabel
                value='Line'
            />
            <Stroke
                control={ control }
                clear={ clear }
                value={ areaChart.stroke }
                onChange={
                    useCallback(compose(
                        setAreaChart,
                        assoc('stroke')
                    ), [])
                }
            />
        </ChartSettingItem>
        <ChartSettingItem>
            <ChartSettingSpanLabel value='Fill' />
            <Fill
                control={ control }
                clear={ clear }
                value={ areaChart.fill }
                onChange={
                    useCallback(compose(
                        setAreaChart,
                        assoc('fill')
                    ), [])
                }
            />
        </ChartSettingItem>
    </>


const ChartSettingBarType = ({
    control,
    clear,
    barChart,
    setBarChart
}) =>
    <>
        <ChartSettingItem>
            <ChartSettingLabel
                htmlFor='previous'
                value={ capitalizeWords('color based on previous') }
            />
            <CheckInput
                id='previous'
                checked={ barChart.previous }
                onChange={
                    useCallback(compose(
                        setBarChart,
                        assoc('previous')
                    ), [])
                }
            />
        </ChartSettingItem>
        <ChartSettingItem>
            <ChartSettingLabel
                htmlFor='hlc'
                value='HLC Bars'
            />
            <CheckInput
                id='hlc'
                checked={ barChart.hlc }
                onChange={
                    useCallback(compose(
                        setBarChart,
                        assoc('hlc')
                    ), [])
                }
            />

        </ChartSettingItem>
        {
            ([ 'up', 'down' ]).map((label, idx) =>
                <ChartSettingItem key={ 'bar' + label }>
                    <ChartSettingSpanLabel
                        value={ capitalizeWords(label + ' ' + 'color') }
                    />
                    <Fill
                        control={ control }
                        clear={ clear }
                        value={ barChart.fill[ idx ] }
                        onChange={
                            useCallback(compose(
                                setBarChart,
                                assocPath([ 'fill', idx ])
                            ), [])
                        }
                    />
                </ChartSettingItem>
            )
        }
        <ChartSettingItem>
            <ChartSettingLabel
                htmlFor='barthin'
                value='Thin Bars'
            />
            <CheckInput
                id='barthin'
                checked={ barChart.thin }
                onChange={
                    useCallback(compose(
                        setBarChart,
                        assoc('thin')
                    ), [])
                }
            />
        </ChartSettingItem>
    </>


const ChartSettingBaselineType = ({
    control,
    container,
    clear,
    baselineChart,
    setBaselineChart
}) =>
    <>
        <ChartSettingItem key='baseline price'>
            <ChartSettingSpanLabel value='Price Source' />
            <Select
                control={ control }
                container={ container }
                clear={ clear }
                preview={ priceSources[ baselineChart.price ] }
                data={
                    useMemo(() => (
                        priceSources.map((source, idx) => {
                            return {
                                center: source,
                                highlighted: idx === baselineChart.price,
                                onClick: () => setBaselineChart(
                                    assoc('price', idx)
                                )
                            }
                        })
                    ), [ baselineChart.price ])
                }
            />
        </ChartSettingItem>
        {
            ([ 'top', 'bottom' ]).map(id =>
                <ChartSettingItem key={ 'baseline' + id + 'stroke' }>
                    <ChartSettingSpanLabel
                        value={ capitalizeWords(id + ' ' + 'line') }
                    />
                    <Stroke
                        control={ control }
                        clear={ clear }
                        value={ baselineChart[ id ].stroke }
                        onChange={
                            useCallback(compose(
                                setBaselineChart,
                                assocPath([ id, 'stroke' ])
                            ), [])
                        }
                    />
                </ChartSettingItem>
            )
        }
        {
            ([ 'top', 'bottom' ]).map(id =>
                <ChartSettingItem key={ 'baseline' + id + 'fill' }>
                    <ChartSettingSpanLabel
                        value={ capitalizeWords(id + ' ' + 'fill') }
                    />
                    {
                        baselineChart[ id ].fill.map((fill, key) =>
                            <Fill
                                control={ control }
                                key={ 'baseline' + id + 'fill' + (key + '') }
                                clear={ clear }
                                value={ fill }
                                onChange={
                                    useCallback(compose(
                                        setBaselineChart,
                                        assocPath([ id, 'fill', key ])
                                    ), [])
                                }
                            />
                        )
                    }
                </ChartSettingItem>
            )
        }
        <ChartSettingItem key='baseline level'>
            <ChartSettingLabel
                value='Base Level'
                htmlFor='baselevel'
            />
            <NumberInput
                style={ { width: '30%' } }
                id='baselevel'
                min={ 0 }
                max={ 100 }
                step={ 1 }
                value={ Math.round(baselineChart.level * 100) }
                onChange={
                    useCallback(compose(
                        setBaselineChart,
                        assoc('level'),
                        multiply(1 / 100)
                    ), [])
                }
            />
        </ChartSettingItem>
    </>


const ChartSettingColumnType = ({
    control,
    clear,
    container,
    columnChart,
    setColumnChart
}) =>
    <>
        <ChartSettingItem>
            <ChartSettingLabel
                htmlFor='previous'
                value={ capitalizeWords('color based on previous') }
            />
            <CheckInput
                id='previous'
                checked={ columnChart.previous }
                onChange={
                    useCallback(compose(
                        setColumnChart,
                        assoc('previous')
                    ), [])
                }
            />
        </ChartSettingItem>
        <ChartSettingItem>
            <ChartSettingSpanLabel value='Price Source' />
            <Select
                control={ control }
                container={ container }
                clear={ clear }
                preview={ priceSources[ columnChart.price ] }
                data={
                    useMemo(() => (
                        priceSources.map((source, key) => {
                            return {
                                center: source,
                                highlighted: key === columnChart.price,
                                onClick: () => setColumnChart(
                                    assoc('price', key)
                                )
                            }
                        })
                    ), [ columnChart.price ])
                }
            />
        </ChartSettingItem>
        {
            ([ 'up', 'down' ]).map((label, key) =>
                <ChartSettingItem key={ 'column' + label }>
                    <ChartSettingSpanLabel
                        value={ capitalizeWords(label + ' ' + 'color') }
                    />
                    <Fill
                        control={ control }
                        clear={ clear }
                        value={ columnChart.fill[ key ] }
                        onChange={
                            useCallback(compose(
                                setColumnChart,
                                assocPath([ 'fill', key ])
                            ), [])
                        }
                    />
                </ChartSettingItem>
            )
        }
    </>

const ChartSettingOHLCType = ({
    control,
    clear,
    name,
    state,
    setState
}) =>
    <>
        <ChartSettingItem>
            <ChartSettingLabel
                htmlFor='previous'
                value={ capitalizeWords('color based on previous') }
            />
            <CheckInput
                id='previous'
                checked={ state.previous }
                onChange={
                    useCallback(compose(
                        setState,
                        assoc('previous')
                    ), [])
                }
            />
        </ChartSettingItem>
        {
            [ 'body', 'border', 'wick' ].map((id, key) =>
                <ChartSettingItem key={ name + id + key }>
                    <ChartSettingLabel
                        value={ capitalizeWord(id) }
                        htmlFor={ name + id }
                    />
                    <CheckInput
                        id={ name + id }
                        checked={ state[ id ].value }
                        onChange={
                            useCallback(compose(
                                setState,
                                assocPath([ id, 'value' ])
                            ), [])
                        }
                    />
                    {
                        state[ id ].color.map((fill, key) =>
                            <Fill
                                control={ control }
                                key={ name + id + 'color' + (key + '') }
                                clear={ clear }
                                value={ fill }
                                onChange={
                                    useCallback(compose(
                                        setState,
                                        assocPath([ id, 'color', key ])
                                    ), [])
                                }
                            />
                        )
                    }
                </ChartSettingItem>
            )
        }
    </>

const ChartSettingHighLowType = ({
    control,
    clear,
    highLowChart,
    setHighLowChart
}) =>
    <>
        {
            [ 'body', 'border', 'label' ].map((id, key) =>
                <ChartSettingItem key={ 'highlow' + id + key }>
                    <ChartSettingLabel
                        value={ capitalizeWord(id) }
                        htmlFor={ 'highlow' + id }
                    />
                    <CheckInput
                        id={ 'highlow' + id }
                        checked={ highLowChart[ id ].value }
                        onChange={
                            useCallback(compose(
                                setHighLowChart,
                                assocPath([ id, 'value' ])
                            ), [])
                        }
                    />
                    <Fill
                        control={ control }
                        key={ 'highlow' + id + 'color' }
                        clear={ clear }
                        value={ highLowChart[ id ].color }
                        onChange={
                            useCallback(compose(
                                setHighLowChart,
                                assocPath([ id, 'color' ])
                            ), [])
                        }
                    />
                </ChartSettingItem>
            )
        }
    </>

const ChartSettingHLCType = ({
    control,
    clear,
    HLCChart,
    setHLCChart
}) =>
    <>
        {
            [ 'high', 'low', 'close' ].map((id, key) =>
                <ChartSettingItem key={ 'HLC' + id + key }>
                    <ChartSettingSpanLabel value={ `${capitalizeWord(id)} line` } />
                    <Stroke
                        control={ control }
                        clear={ clear }
                        value={ HLCChart[ id ] }
                        onChange={
                            useCallback(compose(
                                setHLCChart,
                                assoc(id)
                            ), [])
                        }
                    />
                </ChartSettingItem>
            )
        }
        {
            <ChartSettingItem key='HLC fill'>
                <ChartSettingSpanLabel value='Fill' />
                {
                    HLCChart.fill.map((fill, key) =>
                        <Fill
                            key={ 'HLC' + 'fill' + key }
                            control={ control }
                            clear={ clear }
                            value={ fill }
                            onChange={
                                useCallback(compose(
                                    setHLCChart,
                                    assocPath([ 'fill', key ])
                                ), [])
                            }
                        />
                    )
                }
            </ChartSettingItem>
        }
    </>

const ChartSettingLineType = ({
    control,
    container,
    clear,
    state,
    setState
}) =>
    <>
        <ChartSettingItem>
            <ChartSettingSpanLabel value='Price Source' />
            <Select
                control={ control }
                container={ container }
                clear={ clear }
                preview={ priceSources[ state.price ] }
                data={
                    useMemo(() => (
                        priceSources.map((source, idx) => {
                            return {
                                center: source,
                                highlighted: idx === state.price,
                                onClick: () => setState(
                                    assoc('price', idx)
                                )
                            }
                        })
                    ), [ state.price ])
                }
            />
        </ChartSettingItem>
        <ChartSettingItem>
            <ChartSettingSpanLabel value='Line' />
            <Stroke
                control={ control }
                clear={ clear }
                value={ state.stroke }
                onChange={
                    useCallback(compose(
                        setState,
                        assoc('stroke')
                    ), [])
                }
            />
        </ChartSettingItem>
    </>

const ChartSettingStatus = ({
    status,
    setStatus
}) =>
    <>
        {
            Object.entries(status).map(([ id, value ]) =>
                <ChartSettingItem key={ 'status' + id }>
                    <ChartSettingLabel
                        htmlFor={ id + 'status' }
                        value={ capitalizeWords(id + ' ' + 'status') }
                    />
                    <CheckInput
                        id={ id + 'status' }
                        checked={ value }
                        onChange={
                            useCallback(compose(
                                setStatus,
                                assoc(id)
                            ), [])
                        }
                    />
                </ChartSettingItem>
            )
        }
    </>

const ChartSettingAxis = ({
    container,
    control,
    clear,
    axis,
    setAxis
}) => (
    <>
        <ChartSettingItem>
            <ChartSettingSpanLabel value='Axis Font' />
            <Fill
                control={ control }
                clear={ clear }
                value={ axis.font.color }
                onChange={
                    useCallback(compose(
                        setAxis,
                        assocPath([ 'font', 'color' ])
                    ), [])
                }
            />
            <Select
                container={ container }
                control={ control }
                clear={ clear }
                data={
                    useMemo(() => (
                        textSizes
                            .map(size => {
                                return {
                                    center: size,
                                    highlighted: axis.font.size === size,
                                    onClick: () => setAxis(
                                        assocPath([ 'font', 'size' ], size)
                                    )
                                }
                            })
                    ), [ axis.font.size ])
                }
                preview={ axis.font.size }
            />
        </ChartSettingItem>
        <ChartSettingItem>
            <ChartSettingSpanLabel value='Axis Lines' />
            <Stroke
                control={ control }
                clear={ clear }
                value={ axis.stroke }
                onChange={
                    useCallback(compose(
                        setAxis,
                        assoc('stroke')
                    ), [])
                }
            />
        </ChartSettingItem>
    </>
)

const ChartSettingScale = ({
    control,
    container,
    clear,
    timeFormat,
    setTimeFormat,
    placement,
    setPlacement,
    label,
    setLabel,
}) =>
    <>
        {
            Object.entries(label.value).map(([ id ]) =>
                <ChartSettingItem key={ 'label' + id }>
                    <ChartSettingLabel
                        value={ capitalizeWords(id + ' ' + 'label') }
                        htmlFor={ id + 'label' }
                    />
                    <CheckInput
                        id={ id + 'label' }
                        checked={ label.value[ id ] }
                        onChange={
                            useCallback(compose(
                                setLabel,
                                assocPath([ 'value', id ])
                            ), [])
                        }
                    />
                    <Fill
                        control={ control }
                        clear={ clear }
                        value={ label.fill[ id ] }
                        onChange={
                            useCallback(compose(
                                setLabel,
                                assocPath([ 'fill', id ]),
                            ), [])
                        }
                    />
                </ChartSettingItem>
            )
        }
        <ChartSettingItem>
            <ChartSettingSpanLabel value='Date Format' />
            <Select
                control={ control }
                container={ container }
                clear={ clear }
                direction='left right'
                preview={ utcFormat(timeFormats[ timeFormat ])(defaultTimeFormatDate) }
                data={
                    useMemo(() => (
                        timeFormats.map((specifier, id) => {
                            return {
                                center: utcFormat(specifier)(defaultTimeFormatDate),
                                highlighted: timeFormat === id,
                                onClick: () => setTimeFormat(id)
                            }
                        })
                    ), [ timeFormat ])
                }
            />
        </ChartSettingItem>
        {
            [ [ 'time', [ 'top', 'bottom' ] ], [ 'price', [ 'left', 'right' ] ] ]
                .map(([ label, placements ], idx) =>
                    <ChartSettingItem key={ 'axis' + label }>
                        <ChartSettingSpanLabel
                            value={ capitalizeWords(label + ' ' + 'axis placement') }
                        />
                        <Select
                            control={ control }
                            container={ container }
                            clear={ clear }
                            preview={ capitalizeWord(placement[ idx ]) }
                            data={
                                placements.map(orientation => {
                                    return {
                                        center: capitalizeWord(orientation),
                                        highlighted: orientation === placement[ idx ],
                                        onClick: () => setPlacement(
                                            update(idx, orientation)
                                        )
                                    }
                                })
                            }
                        />
                    </ChartSettingItem>
                )
        }
    </>


const ChartSettingBackground = ({
    control,
    clear,
    background,
    setBackground
}) =>
    <ChartSettingItem>
        <ChartSettingSpanLabel value='Background' />
        {
            background.map((color, key) =>
                <Fill
                    control={ control }
                    clear={ clear }
                    key={ 'background' + key }
                    value={ color }
                    onChange={
                        useCallback(compose(
                            setBackground,
                            update(key)
                        ), [])
                    }
                />
            )
        }
    </ChartSettingItem>

const ChartSettingGrid = ({
    control,
    clear,
    grid,
    setGrid
}) =>
    <>
        {
            zip([ 'vertical', 'horizontal' ], grid)
                .map(([ orientation, stroke ], idx) =>
                    <ChartSettingItem key={ 'grid' + (idx + '') }>
                        <ChartSettingSpanLabel
                            value={ capitalizeWords(orientation + ' ' + 'grid') }
                        />
                        <Stroke
                            control={ control }
                            clear={ clear }
                            value={ stroke }
                            onChange={
                                useCallback(compose(
                                    setGrid,
                                    update(idx)
                                ), [])
                            }
                        />
                    </ChartSettingItem>
                )
        }
    </>

const ChartSettingSession = ({
    control,
    clear,
    session,
    setSession
}) =>
    <ChartSettingItem>
        <ChartSettingLabel
            value='Session Breaks'
            htmlFor='session'
        />
        <CheckInput
            id='session'
            checked={ session.value }
            onChange={
                useCallback(compose(
                    setSession,
                    assoc('value')
                ), [])
            }
        />
        <Stroke
            control={ control }
            clear={ clear }
            value={ session.stroke }
            onChange={
                useCallback(compose(
                    setSession,
                    assoc('stroke')
                ), [])
            }
        />
    </ChartSettingItem>



const ChartSettingCrossHair = ({
    control,
    clear,
    crosshair,
    setCrosshair
}) =>
    <ChartSettingItem>
        <ChartSettingSpanLabel value='Crosshair' />
        <Stroke
            control={ control }
            clear={ clear }
            value={ crosshair }
            onChange={ setCrosshair }
        />
    </ChartSettingItem>



const ChartSettingNavigationVisibility = ({
    control,
    clear,
    navigationVisibility,
    setNavigationVisibility
}) =>
    <ChartSettingItem>
        <ChartSettingSpanLabel value='Navigation Visibility' />
        <Select
            control={ control }
            clear={ clear }
            alignment='end'
            direction='top'
            data={
                useMemo(() => UIVisibilities.map((text, id) => {
                    return {
                        center: capitalizeWords(text),
                        highlighted: id === navigationVisibility,
                        onClick: () => setNavigationVisibility(id)
                    }
                }), [ navigationVisibility ])
            }
            preview={ capitalizeWords(UIVisibilities[ navigationVisibility ]) }
        />
    </ChartSettingItem >

const ChartTimeInterval = ({
    container,
    timeInterval,
    setTimeInterval,
    clear
}) => {
    const [ highlighted, setHighlighted ] = useState(false)
    const [ menu, setMenu ] = useState(() =>
        timeIntervals.map(([ group, values ], i0) => {
            return {
                type: 'collapse',
                collapsed: false,
                center: toUpper(group),
                onChange: () => setMenu(
                    modifyPath([ i0, 'collapsed' ], not)
                ),
                data: values.map(([ interval, label ], i1) => {
                    return {
                        type: 'favorite',
                        id: interval,
                        center: capitalizeWords(label),
                        highlighted: false,
                        favorited: false,
                        onChange: () => setMenu(
                            modifyPath([ i0, 'data', i1, 'favorited' ], not)
                        ),
                        onClick: () => {
                            setTimeInterval(interval)
                            setMenu(
                                map(({ data, ...rest }) => {
                                    return {
                                        ...rest,
                                        data: data.map(v => {
                                            return {
                                                ...v,
                                                highlighted: interval === v.id
                                            }
                                        })
                                    }
                                })
                            )
                        }
                    }
                })
            }
        })
    )

    const onToggle = useCallback(compose(
        setHighlighted,
        prop('visible')
    ), [])

    const displayList = menu.flatMap(({ data }) =>
        data.filter(({ highlighted, favorited }) => highlighted || favorited)
    )

    useEffect(timeInterval => setMenu(menu =>
        menu.map(obj => {
            return {
                ...obj,
                data: obj.data.map(obj => {
                    return {
                        ...obj,
                        highlighted: timeInterval === obj.id
                    }
                })
            }
        })
    ), [ timeInterval ])

    return (
        <menu className='chart-interval'>
            {
                displayList
                    .filter(() => displayList.length > 1)
                    .map(({ id, center, onClick, highlighted }) =>
                        <li className='chart-interval-item' key={ id }>
                            <TooltipPlacements
                                container={ container }
                                data={ center }
                                direction='bottom'
                                alignment='center'
                            >
                                <Button
                                    display='block'
                                    size='big'
                                    highlighted={ highlighted }
                                    onClick={ onClick }
                                >
                                    { id }
                                </Button>
                            </TooltipPlacements>
                        </li>
                    )
            }
            {
                takeLast(1, displayList).map(({ id, center }) =>
                    <li className='chart-interval-item' key='lasttimeinterval'>
                        <ToggleMenuPlacements
                            container={ container }
                            clear={ clear }
                            containerMargin='0 -45 0 0'
                            targetMargin='0 0 0 5'
                            alignment='start'
                            direction='bottom'
                            onToggle={ onToggle }
                            data={ menu }
                        >
                            <TooltipPlacements
                                container={ container }
                                targetMargin='0 0 0 5'
                                direction='bottom'
                                alignment='start'
                                data={ displayList.length > 1 ? 'Time interval' : center }
                            >
                                <Button
                                    display='block'
                                    size='big'
                                    highlighted={ highlighted }
                                >
                                    { displayList.length > 1 ? <Icon name='angledown' /> : id }
                                </Button>
                            </TooltipPlacements>
                        </ToggleMenuPlacements>
                    </li>
                )
            }
        </menu>
    )
}

const ChartType = ({
    container,
    type,
    setType,
    clear
}) => {
    const [ highlighted, setHighlighted ] = useState(false)
    const [ menu, setMenu ] = useState(() =>
        types.map((name, id) => {
            return {
                id: id,
                type: 'favorite',
                left: <Icon name={ 'chart' + id } />,
                center: capitalizeWords(name),
                highlighted: id === type,
                favorited: false,
                onChange: () => setMenu(
                    modifyPath([ id, 'favorited' ], not)
                ),
                onClick: () => {
                    setMenu(
                        map(v => {
                            return {
                                ...v,
                                highlighted: id === v.id
                            }
                        })
                    )
                    setType(id)
                }
            }
        })
    )

    const onToggle = useCallback(compose(
        setHighlighted,
        prop('visible')
    ), [])

    const displayList = menu.filter(({ highlighted, favorited }) => highlighted || favorited)

    return (
        <menu className='chart-type'>
            {
                displayList.filter(() => displayList.length > 1).map(({ id, center, left, onClick, highlighted }) =>
                    <li key={ id } className='chart-type-item'>
                        <TooltipPlacements
                            data={ center }
                            container={ container }
                            direction='bottom'
                            alignment='center'
                        >
                            <Button
                                display='block'
                                size='big'
                                highlighted={ highlighted }
                                onClick={ onClick }
                            >
                                { left }
                            </Button>
                        </TooltipPlacements>
                    </li>
                )
            }
            {
                takeLast(1, displayList).map(({ center, left }) =>
                    <li className='chart-type-item' key='lasttype'>
                        <ToggleMenuPlacements
                            container={ container }
                            clear={ clear }
                            containerMargin='0 -45 0 0'
                            targetMargin='5'
                            direction='bottom'
                            alignment='center'
                            onToggle={ onToggle }
                            data={ menu }
                        >
                            <TooltipPlacements
                                container={ container }
                                data={ displayList.length > 1 ? 'Types' : center }
                                direction='bottom'
                                alignment='center'
                            >
                                <Button display='block' size='big' highlighted={ highlighted }>
                                    { displayList.length > 1 ? <Icon name='angledown' /> : left }
                                </Button>
                            </TooltipPlacements>
                        </ToggleMenuPlacements>
                    </li>
                )
            }
        </menu>
    )
}

const ChartSetting = ({
    container,
    clear,
    setting,
    setSetting,
    navigationVisibility,
    setNavigationVisibility,
    type,
    line,
    setLine,
    pricePrecision,
    setPricePrecision,
    timeZone,
    setTimeZone,
    status,
    setStatus,
    label,
    setLabel,
    background,
    setBackground,
    placement,
    setPlacement,
    grid,
    setGrid,
    session,
    setSession,
    axis,
    setAxis,
    crosshair,
    setCrosshair,
    timeFormat,
    setTimeFormat,
    areaChart,
    setAreaChart,
    barChart,
    setBarChart,
    baselineChart,
    setBaselineChart,
    candleChart,
    setCandleChart,
    columnChart,
    setColumnChart,
    heikinashiChart,
    setHeikinashiChart,
    highLowChart,
    setHighLowChart,
    HLCChart,
    setHLCChart,
    hollowChart,
    setHollowChart,
    lineChart,
    setLineChart,
    markerChart,
    setMarkerChart,
    stepChart,
    setStepChart
}) => {

    const [ state, setState ] = useState(() => {
        const initial = {
            background,
            navigationVisibility,
            grid,
            status,
            session,
            axis,
            crosshair,
            label,
            line,
            pricePrecision,
            placement,
            timeZone,
            timeFormat,
            areaChart,
            barChart,
            baselineChart,
            candleChart,
            columnChart,
            heikinashiChart,
            highLowChart,
            HLCChart,
            hollowChart,
            lineChart,
            markerChart,
            stepChart
        }

        return { restore: initial, current: initial }
    })

    const [ navigation, setNavigation ] = useState(0)

    const [ event, setEvent ] = useState({})

    const [ control, setControl ] = useState({})

    const [ highlighted, setHighlighted ] = useState(false)

    const refreshState = useCallback(state => {
        setBackground(state.background)
        setNavigationVisibility(state.navigationVisibility)
        setGrid(state.grid)
        setStatus(state.status)
        setSession(state.session)
        setAxis(state.axis)
        setCrosshair(state.crosshair)
        setLabel(state.label)
        setLine(state.line)
        setPricePrecision(state.pricePrecision)
        setTimeZone(state.timeZone)
        setTimeFormat(state.timeFormat)
        setAreaChart(state.areaChart)
        setBarChart(state.barChart)
        setBaselineChart(state.baselineChart)
        setCandleChart(state.candleChart)
        setColumnChart(state.columnChart)
        setHeikinashiChart(state.heikinashiChart)
        setHighLowChart(state.highLowChart)
        setHLCChart(state.HLCChart)
        setHollowChart(state.hollowChart)
        setLineChart(state.lineChart)
        setMarkerChart(state.markerChart)
        setStepChart(state.stepChart)
        setPlacement(state.placement)
    }, [])

    const types = [
        <ChartSettingAreaType
            key={ 0 }
            control={ control }
            container={ container }
            clear={ event }
            areaChart={ areaChart }
            setAreaChart={ setAreaChart }
        />,
        <ChartSettingBarType
            key={ 1 }
            control={ control }
            clear={ event }
            barChart={ barChart }
            setBarChart={ setBarChart }
        />,
        <ChartSettingBaselineType
            key={ 2 }
            control={ control }
            container={ container }
            clear={ event }
            baselineChart={ baselineChart }
            setBaselineChart={ setBaselineChart }
        />,
        <ChartSettingOHLCType
            key={ 3 }
            control={ control }
            clear={ event }
            name='candle'
            state={ candleChart }
            setState={ setCandleChart }
        />,
        <ChartSettingColumnType
            key={ 4 }
            control={ control }
            clear={ event }
            container={ container }
            columnChart={ columnChart }
            setColumnChart={ setColumnChart }
        />,
        <ChartSettingOHLCType
            key={ 5 }
            control={ control }
            container={ container }
            clear={ event }
            name='heikinashi'
            state={ heikinashiChart }
            setState={ setHeikinashiChart }
        />,
        <ChartSettingHighLowType
            key={ 6 }
            control={ control }
            clear={ event }
            highLowChart={ highLowChart }
            setHighLowChart={ setHighLowChart }
        />,
        <ChartSettingHLCType
            key={ 7 }
            control={ control }
            clear={ event }
            HLCChart={ HLCChart }
            setHLCChart={ setHLCChart }
        />,
        <ChartSettingOHLCType
            key={ 8 }
            control={ control }
            container={ container }
            clear={ event }
            name='hollowcandle'
            state={ hollowChart }
            setState={ setHollowChart }
        />,
        <ChartSettingLineType
            key={ 9 }
            control={ control }
            container={ container }
            clear={ event }
            name='line'
            state={ lineChart }
            setState={ setLineChart }
        />,
        <ChartSettingLineType
            key={ 10 }
            control={ control }
            container={ container }
            clear={ event }
            name='marker'
            state={ markerChart }
            setState={ setMarkerChart }
        />,
        <ChartSettingLineType
            key={ 11 }
            control={ control }
            container={ container }
            clear={ event }
            name='step'
            state={ stepChart }
            setState={ setStepChart }
        />
    ]

    const typeTab = <>
        { types[ type ] }
        <ChartSettingLine
            control={ control }
            clear={ event }
            line={ line }
            setLine={ setLine }
        />
        <ChartSettingPrecision
            control={ control }
            container={ container }
            clear={ event }
            pricePrecision={ pricePrecision }
            setPricePrecision={ setPricePrecision }
        />
        <ChartSettingTimeZone
            control={ control }
            container={ container }
            clear={ event }
            timeZone={ timeZone }
            setTimeZone={ setTimeZone }
        />
    </>

    const statusTab = <ChartSettingStatus
        status={ status }
        setStatus={ setStatus }
    />

    const scaleTab = <ChartSettingScale
        control={ control }
        container={ container }
        clear={ event }
        timeFormat={ timeFormat }
        setTimeFormat={ setTimeFormat }
        placement={ placement }
        setPlacement={ setPlacement }
        label={ label }
        setLabel={ setLabel }
    />

    const generalTab = <>
        <ChartSettingBackground
            control={ control }
            clear={ event }
            background={ background }
            setBackground={ setBackground }
        />
        <ChartSettingGrid
            control={ control }
            clear={ event }
            grid={ grid }
            setGrid={ setGrid }
        />
        <ChartSettingAxis
            container={ container }
            control={ control }
            clear={ event }
            axis={ axis }
            setAxis={ setAxis }
        />
        <ChartSettingSession
            control={ control }
            clear={ event }
            session={ session }
            setSession={ setSession }
        />
        <ChartSettingCrossHair
            control={ control }
            clear={ event }
            crosshair={ crosshair }
            setCrosshair={ setCrosshair }
        />
        <ChartSettingNavigationVisibility
            control={ control }
            clear={ event }
            navigationVisibility={ navigationVisibility }
            setNavigationVisibility={ setNavigationVisibility }
        />
    </>

    const tabs = [
        typeTab,
        statusTab,
        scaleTab,
        generalTab
    ]

    const onClose = useCallback(() => setSetting({ visible: false, transition: false }), [])

    const onScroll = useCallback(() => setControl({ visible: false, transition: false }), [])

    const onRestore = batch([
        () => refreshState(state.restore),
        onClose
    ])

    const onCancel = batch([
        () => refreshState(state.current),
        onClose
    ])

    const onPointerDown = useCallback(({ currentTarget, target }) => setEvent(event =>
        eqBy(getOffsetParent, currentTarget, target)
            ? ({ target: target, transition: false })
            : event
    ), [])

    const onSave = batch([
        () => setState(
            assoc('current', {
                background,
                grid,
                status,
                session,
                axis,
                crosshair,
                placement,
                label,
                line,
                type,
                pricePrecision,
                timeZone,
                timeFormat,
                areaChart,
                barChart,
                baselineChart,
                candleChart,
                heikinashiChart,
                highLowChart,
                HLCChart,
                hollowChart,
                lineChart,
                markerChart,
                stepChart
            })
        ),
        onClose
    ])

    const onToggle = useCallback(compose(
        setHighlighted,
        prop('visible')
    ), [])

    return (
        <PopupPlacements
            container={ container }
            clear={ clear }
            onClose={ setControl }
            onToggle={ onToggle }
            control={ setting }
            data={
                <ChartSettingPopup
                    container={ container }
                    type={ type }
                    onPointerDown={ onPointerDown }
                    onScroll={ onScroll }
                    navigation={ navigation }
                    setNavigation={ setNavigation }
                    content={ tabs[ navigation ] }
                    onRestore={ onRestore }
                    onCancel={ onCancel }
                    onSave={ onSave }
                />
            }
        >
            <TooltipPlacements
                container={ container }
                data='Settings'
                alignment='center'
                direction='bottom'
            >
                <Button
                    display='block'
                    size='big'
                    highlighted={ highlighted }
                >
                    <Icon name='setting' />
                </Button>
            </TooltipPlacements>
        </PopupPlacements>
    )
}

const ChartFullScreen = ({
    container,
    setInfo,
    clear
}) => {

    const [ fullscreen, setFullscreen ] = useState(false)

    const onFullscreen = useCallback(curry((container, _) => {
        if(fscreen.fullscreenEnabled) {
            const exited = isNil(fscreen.fullscreenElement)
            const enable = () => fscreen.requestFullscreen(container)
            const disable = () => fscreen.exitFullscreen()

            const action = [ [ exited, enable ], [ !exited, disable ] ]

            action
                .filter(head)
                .map(last)
                .forEach(fn =>
                    fn().catch(() =>
                        setInfo({ value: 'Error while switching fullscreen mode.' })
                    )
                )
        } else {
            setInfo({ value: 'Your browser does not support fullscreen mode.' })
        }
    }), [])

    useEffect(_ => {
        const onFullscreenChange = () => {
            if(isNil(fscreen.fullscreenElement)) {
                setFullscreen(false)
            } else {
                setFullscreen(true)
            }
        }

        fscreen.addEventListener('fullscreenchange', onFullscreenChange)

        return () => fscreen.removeEventListener('fullscreenchange', onFullscreenChange)
    }, [])

    return (
        <TooltipPlacements
            container={ container }
            clear={ clear }
            alignment='center'
            direction='bottom'
            containerMargin='0 0 -10 0'
            targetMargin='0 0 0 5'
            data={ capitalizeWords(`${fullscreen ? 'exit' : 'enter'} fullscreen mode`) }
        >
            <Button
                display='block'
                size='big'
                highlighted={ fullscreen }
                onClick={ onFullscreen(container) }
            >
                <Icon name='fullscreen' />
            </Button>
        </TooltipPlacements>
    )
}

const ChartSnapShot = ({
    container,
    clear,
    setSnapshot
}) => (
    <TooltipPlacements
        container={ container }
        clear={ clear }
        targetMargin='0 0 0 5'
        alignment='end'
        direction='bottom'
        data='Take a Snapshot'
    >
        <Button
            display='block'
            size='big'
            onClick={ () => setSnapshot(new Date().getUTCSeconds()) }
        >
            <Icon name='camera' />
        </Button>
    </TooltipPlacements>
)

const ChartTop = ({
    timeInterval,
    setTimeInterval,
    container,
    clear,
    type,
    setType,
    setInfo,
    setSnapshot,
    ...props
}) => (
    <div className='chart-top'>
        <div className='chart-top-left'>
            <ChartTimeInterval
                container={ container }
                clear={ clear }
                timeInterval={ timeInterval }
                setTimeInterval={ setTimeInterval }
            />
            <Separator />
            <ChartType
                container={ container }
                clear={ clear }
                type={ type }
                setType={ setType }
            />
        </div>
        <div className='chart-top-right'>
            <Separator />
            <ChartSetting
                container={ container }
                clear={ clear }
                type={ type }
                setType={ setType }
                { ...props }
            />
            <ChartFullScreen
                container={ container }
                setInfo={ setInfo }
                clear={ clear }
            />
            <ChartSnapShot
                container={ container }
                clear={ clear }
                setSnapshot={ setSnapshot }
            />
        </div>
    </div>
)

const ChartInfo = memo(({ info }) => {
    const [ visible, setVisible ] = useState(false)

    useEffect(_ => {
        const show = setTimeout(() => setVisible(true), 0)

        const hide = setTimeout(() => setVisible(false), 10000)

        return () => [ show, hide ].forEach(clearTimeout)
    }, [ info ])

    return (
        <div
            className='chart-info'
            style={ {
                visibility: visible ? 'visible' : 'hidden',
                opacity: Number(visible)
            } }
            onClick={ () => setVisible(false) }
        >
            <span className='chart-info-icon'>
                <Icon name='info' />
            </span>
            <span className='chart-info-text'>
                { info.value || null }
            </span>
        </div>
    )
})

const Empty = <>&empty;</>

const ChartStatus = ({
    size,
    symbol,
    status,
    precision,
    algorithm,
    data,
    type,
    chart,
    interval,
    order,
    change,
    base,
    baselinePrice,
    loading
}) => {

    const defaultStats = [
        { id: 'symbol', label: '', value: symbol, color: defaultWhiteColor },
        { id: 'symbol', label: '', value: interval, color: defaultWhiteColor },
    ]

    const stats = loading
        ? defaultStats.filter(({ id }) => status[ id ]).concat([ { id: 'loader', label: '', value: <Loader />, color: defaultWhiteColor } ])
        : defaultStats.concat(
            chartStatus(type, {
                precision,
                algorithm,
                chart,
                change,
                base,
                data,
                order,
                baselinePrice
            }).map(v => {
                if(isEmpty(data)) {
                    return { ...v, value: isEmpty(data) ? Empty : v.value }
                } else {
                    return v
                }
            })
        ).filter(({ id }) => status[ id ])

    return (
        <ul
            className='chart-status'
            style={
                zipObj(
                    [ 'maxWidth', 'maxHeight' ],
                    size.map(v => pixelToRem(v) + 'rem')
                )
            }
        >
            {
                stats.map(({ id, label, value, color }, i) =>
                    <li
                        key={ id + label + value + i }
                        className='chart-status-item'
                    >
                        <span className='chart-status-label'>
                            { label ? capitalizeWords(label) : null }
                        </span>
                        <span style={ { color } } className='chart-status-value'>
                            { value || null }
                        </span>
                    </li>
                )
            }
        </ul>
    )
}

const ChartNavigation = memo(({
    container,
    onZoomIn,
    onZoomOut,
    onPanLeft,
    onPanRight,
    onReset,
    reset,
    visibility
}) => {

    const [ visible, setVisible ] = useState(true)

    const onNavigation = curry((value, _) =>
        setVisible(visible =>
            UIVisibilities[ visibility ] === 'visible on mouse over'
                ? value
                : visible
        )
    )

    useEffect(compose(
        setVisible,
        equals(1)
    ), [ visibility ])

    return (
        <menu
            className='chart-navigation'
            onPointerEnter={ onNavigation(true) }
            onPointerLeave={ onNavigation(false) }
        >
            {
                [
                    { id: 'minus', label: 'zoom out', onClick: onZoomOut, show: visible },
                    { id: 'plus', label: 'zoom in', onClick: onZoomIn, show: visible },
                    { id: 'angleleft', label: 'scroll to left', onClick: onPanLeft, show: visible },
                    { id: 'angleright', label: 'scroll to right', onClick: onPanRight, show: visible },
                    { id: 'reset', label: 'reset chart', onClick: onReset, show: visible && reset }
                ].map(({ id, label, onClick, show }) =>
                    <li key={ id } className='chart-navigation-item' style={ { visibility: show ? 'visible' : 'hidden', opacity: Number(show) } }>
                        <TooltipPlacements
                            container={ container }
                            data={ capitalizeWords(label) }
                            alignment='center'
                            direction='top'
                        >
                            <Button
                                className='chart-navigation-button'
                                outlined={ true }
                                onClick={ onClick }
                            >
                                <Icon size='medium' name={ id } />
                            </Button>
                        </TooltipPlacements>
                    </li>
                )
            }
        </menu>
    )
})

const ChartTimeScroll = memo(({ container, onTimeScroll }) =>
    <div className='chart-scroll'>
        <TooltipPlacements
            container={ container }
            direction='top'
            alignment='center'
            containerMargin='-10 0 -10 0'
            data={ capitalizeWords('scroll to the most recent') }
        >
            <Button
                className='chart-scroll-button'
                outlined={ true }
                onClick={ onTimeScroll }
            >
                <Icon size='medium' name='scrollright' />
            </Button>
        </TooltipPlacements>
    </div>
)

const ChartLevel = memo(({ level, setLevel }) => {
    const [ ref, setRef ] = useState({})

    useEffect(ref => {
        const selection = select(ref)
        const container = ref.parentElement
        const onDrag = ({ y }) => setLevel(
            clamp(
                0,
                1,
                Math.round((1 - y / getNodeHeight(container)) * 100) / 100
            )
        )
        selection.call(
            drag().on('drag', onDrag)
        )

        return () => selection.on('.drag', null)
    }, [ ref ])

    return (
        <div
            className='chart-level'
            ref={ setRef }
            style={ {
                top: 100 - (level * 100) + '%',
                left: 50 + '%'
            } }
        />
    )
})

const ChartMain = memo(({
    container,
    clear,
    menu,
    onResize,
    onZoomStart,
    onZoom,
    onZoomEnd,
    onContext,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    enableLevel,
    level,
    setLevel
}) =>
    <ContextMenuPlacements
        container={ container }
        data={ menu }
        clear={ clear }
    >
        <Canvas
            className='chart-main'
            onResize={ onResize }
            onZoomStart={ onZoomStart }
            onZoom={ onZoom }
            onZoomEnd={ onZoomEnd }
            onContext={ onContext }
            onPointerEnter={ onPointerEnter }
            onPointerMove={ onPointerMove }
            onPointerLeave={ onPointerLeave }
        >
            {
                enableLevel
                    ? <ChartLevel level={ level } setLevel={ setLevel } />
                    : null
            }
        </Canvas>
    </ContextMenuPlacements>
)

const ChartHorizontal = memo(({
    container,
    clear,
    onZoomStart,
    onZoom,
    onZoomEnd,
    onResize,
    onContext,
    menu
}) =>
    <ContextMenuPlacements
        container={ container }
        data={ menu }
        clear={ clear }
    >
        <Canvas
            className='chart-horizontal'
            onResize={ onResize }
            onZoomStart={ onZoomStart }
            onZoom={ onZoom }
            onZoomEnd={ onZoomEnd }
            onContext={ onContext }
        />
    </ContextMenuPlacements>
)

const ChartVertical = memo(({
    container,
    menu,
    clear,
    onResize,
    onZoomStart,
    onZoom,
    onZoomEnd,
    onContext
}) =>
    <ContextMenuPlacements
        container={ container }
        data={ menu }
        clear={ clear }
    >
        <Canvas
            className='chart-vertical'
            onResize={ onResize }
            onZoomStart={ onZoomStart }
            onZoom={ onZoom }
            onZoomEnd={ onZoomEnd }
            onContext={ onContext }
        />
    </ContextMenuPlacements>
)

const ChartOption = memo(({
    container,
    menu,
    clear,
    tooltip,
    orientation
}) => {
    const [ highlighted, setHighlighted ] = useState(false)
    const onToggle = useCallback(o(
        setHighlighted,
        prop('visible')
    ), [])
    return (
        <ToggleMenuPlacements
            container={ container }
            data={ menu }
            clear={ clear }
            direction='top bottom'
            alignment='end start'
            onToggle={ onToggle }
        >
            <TooltipPlacements
                container={ container }
                data={ tooltip }
                direction={ orientation === 'bottom' ? 'top' : 'bottom' }
                alignment='end start'
                targetMargin={ orientation === 'bottom' ? '0 5 0 0' : '0 0 0 5' }
            >
                <Button display='block' highlighted={ highlighted }>
                    <Icon name='sunray' size='medium' />
                </Button>
            </TooltipPlacements>
        </ToggleMenuPlacements>
    )
})

const ChartDeficit = () => (
    <div className='chart-deficit'>
        No Data Available to Display Chart.
    </div>
)

const ChartCenter = ({
    info,
    container,
    clear,
    socket,
    axis,
    symbol,
    grid,
    snapshot,
    status,
    timeFormat,
    background,
    type,
    timeInterval,
    timeZone,
    setTimeZone,
    pricePrecision,
    priceAlgorithm,
    setPriceAlgorithm,
    session,
    setSession,
    crosshair,
    line,
    setLine,
    label,
    setLabel,
    setSetting,
    placement,
    setPlacement,
    navigationVisibility,
    chart,
    timeDestination,
    setTimeRange,
    level,
    setLevel,
    maps
}) => {
    const [ plot, setPlot ] = useState(() => {
        return {
            size: defaultPlotSize,
            data: [],
            start: [],
            end: [],
            source: [],
            view: [],
            transform: defaultTransform,
            showTimeTooltip: false,
            autoFit: true,
            invert: false,
            loading: true,
            request: [],
            completed: false,
            lock: [ false, false ],
            transition: [],
            transit: [],
            destination: [],
            pending: [],
            price: defaultPriceSource,
            inverted: [ 0, 0 ],
            pointer: [],
            cursor: [],
            selected: [],
            selectedChange: 0,
            recent: [],
            recentChange: 0,
            type: defaultType,
            log: false,
            timeScale: defaultTimeScale(),
            priceScale: defaultPriceScale(false),
            volumeScale: defaultVolumeScale(),
            timeDomain: defaultDomain,
            priceDomain: defaultDomain,
            volumeDomain: defaultDomain,
            scaleExtent: defaultScaleExtent,
            deficit: false,
            timeRange: [],
            zoom: false
        }
    })

    const [ frame, setFrame ] = useState(0)

    const [ now, setNow ] = useState(Date.now)

    const [ [ mainBack, mainFront ], setMainContext ] = useState([])

    const [ [ verticalBack, verticalFront ], setVerticalContext ] = useState([])

    const [ [ horizontalBack, horizontalFront ], setHorizontalContext ] = useState([])

    const [ verticalSize, setVerticalSize ] = useState([])

    const [ horizontalSize, setHorizontalSize ] = useState([])

    const [ menu, setMenu ] = useState({
        horizontal: [],
        vertical: [],
        main: []
    })

    const name = symbol ? splitSymbol(symbol).map(v => maps[ v ] || v).join('/') : ''

    const getBorder = (stroke, placement) => {
        const keys = placement.map(v => placementsText[ v ])
        const value = `${stroke.thickness}px ${stroke.style} ${stroke.color}`
        return keys.map(key => {
            return {
                [ 'border' + capitalizeWord(key) ]: value
            }
        })
    }

    const [ borderX, borderY ] = getBorder(axis.stroke, placement)

    const textRatio = textScale(axis.font.size)

    const defaultPrecision = plot.loading
        ? 0
        : absDiff(
            ...take(
                2,
                plot.priceScale.ticks(
                    Math.floor(
                        last(plot.size) / (textRatio * defaultYTickSpace)
                    )
                ).map(v =>
                    plot.log
                        ? v * price(plot.price, plot.start)
                        : v
                )
            )
        )

    const precision = precisionFixed(
        pricePrecision >= 0
            ? Math.min(pricePrecision, 1 / pricePrecision)
            : defaultPrecision
    )

    const decimalRatio = [ plot.log ? 'change' : 'price', 'high', 'low' ].some(v => label.value[ v ])
        ? precisionScale(precision)
        : 1

    const xAxisHeight = pixelToRem(defaultXAxisHeight * textRatio) + 'rem'

    const yAxisWidth = pixelToRem(defaultYAxisWidth * textRatio * decimalRatio) + 'rem'

    const [ gridTemplateRows, gridTemplateCols ] = formatGridTemplate(
        getGridTemplate(placement, [
            [ `calc(100% - ${xAxisHeight})`, `${xAxisHeight}` ],
            [ `calc(100% - ${yAxisWidth})`, `${yAxisWidth}` ]
        ])
    )

    const timeOffset = getTimeZoneOffset(
        [ '1W', '1M' ].includes(timeInterval) ? defaultTimeZone : timeZone
    )

    const enableReset = !identical(head(plot.transform), defaultXtransform)

    const enableScroll = plot.loading
        ? false
        : !eqBy(P.mts, plot.end, plot.recent)

    const enableLevel = types[ type ] === 'baseline'

    const order = plot.priceScale.domain().reduce((a, b) =>
        clamp(-1, 1, a - b)
    )

    const baselinePrice = enableLevel
        ? plot.priceScale.invert(
            (1 - level) * last(plot.size)
        )
        : 0

    const resetTransform = axis => setPlot(plot => {
        const calculate = o(calculatePlotTimeRange, calculatePlotScale)
        return calculate({
            ...plot,
            showTimeTooltip: false,
            autoFit: axis.includes('y') || plot.autoFit,
            transform: zipWithCall(
                [ 'x', 'y' ].map(v => axis.includes(v) ? head : last),
                zip(defaultTransform, plot.transform)
            )
        })
    })

    const setSize = useCallback(size => setPlot(plot => {
        const [ tx, width ] = [ plot.transform, size ].map(head)
        if(plot.loading) {
            return { ...plot, size }
        } else {
            const scaleExtent = pair(
                calculateScaleExtent(
                    1,
                    width / 2,
                    scaleTimeInterval(plot.timeScale, plot.source),
                    tx.k
                ),
                defaultYScaleExtent
            )
            const calculate = compose(
                calculatePlotTimeRange,
                calculatePlotRequest,
                calculatePlotScale
            )
            return calculate({
                ...plot,
                size,
                transform: zipWith(
                    (a, b) => scaleZoom(clamp(...a, b.k), b),
                    scaleExtent,
                    plot.transform
                )
            })
        }
    }), [])

    const setTransform = fns => setPlot(plot => {
        const transform = zipWithCall(
            [ last, plot.log ? head : last ],
            zip(
                plot.transform,
                applyTransform(
                    fns,
                    zip(plot.scaleExtent, plot.transform)
                )
            )
        )
        const result = {
            ...plot,
            showTimeTooltip: false,
            transform: transform,
            autoFit: last(transform).k === 1
        }
        return calculatePlotScale(result)
    })

    const setTransition = curry((ms, fns) =>
        setPlot(plot => {
            return {
                ...plot,
                showTimeTooltip: false,
                transition: [
                    ms,
                    pair(
                        plot.transform,
                        applyTransform(
                            fns,
                            zip(plot.scaleExtent, plot.transform)
                        )
                    )
                ]
            }
        })
    )

    const onPointerMove = useCallback(e => setPlot(plot => {
        if(plot.zoom) {
            return plot
        } else {
            const calculate = o(calculatePlotSelected, calculatePlotCursor)
            return calculate({
                ...plot,
                pointer: pointer(e, e.currentTarget || e.target.parentElement)
            })
        }
    }), [])

    const onPointerEnter = onPointerMove

    const onPointerLeave = useCallback(_ => setPlot(plot =>
        calculatePlotSelected({
            ...plot,
            pointer: [],
            cursor: [],
            inverted: plot.cursor
        })
    ), [])

    const onZoomStart = useCallback(() => setPlot(
        assoc('zoom', true)
    ), [])

    const onZoomEnd = useCallback(() => setPlot(
        compose(
            calculatePlotRequest,
            calculatePlotTimeRange,
            assoc('zoom', false)
        )
    ), [])

    const onMainZoom = useCallback(({
        scaled,
        wheeled,
        dx,
        dy,
        dk,
        px,
        py,
        width,
    }) => {
        const xt = scaled
            ? ([ e, t ]) => scaleZoomTo(
                [ wheeled ? defaultPlotWidth : defaultPlotWidth - width + px, 0 ],
                clamp(...e, dk * t.k),
                t
            )
            : o(translateZoomBy([ dx, 0 ]), last)

        const yt = scaled
            ? last
            : o(
                unless(
                    propEq(1, 'k'),
                    chain(
                        translateZoomBy,
                        compose(
                            pair(0),
                            multiply(dy),
                            prop('k')
                        )
                    )
                ),
                last
            )

        setTransform([ xt, yt ])

        setPlot(plot => {
            const calculate = o(calculatePlotSelected, calculatePlotCursor)
            return calculate({ ...plot, pointer: [ px, py ] })
        })
    }, [])

    const onHorizontalZoom = useCallback(({
        wheeled,
        scaled,
        px,
        dk,
        dxk,
        width
    }) => {
        const xt = ([ e, t ]) => scaleZoomTo(
            [ wheeled || !scaled ? defaultPlotWidth : defaultPlotWidth - width + px, 0 ],
            clamp(...e, (scaled ? dk : dxk) * t.k),
            t
        )

        const yt = last

        setTransform([ xt, yt ])
    }, [])

    const onVerticalZoom = useCallback(({
        wheeled,
        scaled,
        dk,
        dyk,
        py,
        height
    }) => {
        const xt = last
        const yt = ([ e, t ]) => scaleZoomTo(
            [ 0, wheeled || !scaled ? defaultPlotHeight / 2 : (py / height) * defaultPlotHeight ],
            clamp(...e, (scaled ? dk : dyk) * t.k),
            t
        )

        setTransform([ xt, yt ])
    }, [])

    const onZoomOut = useCallback(() => {
        const xt = ([ e, t ]) => scaleZoomTo([ defaultPlotWidth, 0 ], clamp(...e, t.k * 0.8), t)
        const yt = last

        setTransition(200, [ xt, yt ])
    }, [])

    const onZoomIn = useCallback(() => {
        const xt = ([ e, t ]) => scaleZoomTo([ defaultPlotWidth, 0 ], clamp(...e, t.k * 1.2), t)
        const yt = last

        setTransition(200, [ xt, yt ])
    }, [])

    const onPanLeft = useCallback(() => setPlot(plot => {
        const xt = translateZoomBy([ scaleTimeInterval(plot.timeScale, plot.view), 0 ])
        const yt = identity
        const transform = zipWithCall([ xt, yt ], plot.transform)
        const calculate = compose(
            calculatePlotTimeRange,
            calculatePlotRequest,
            calculatePlotScale
        )
        return calculate({ ...plot, transform, showTimeTooltip: false })
    }), [])

    const onPanRight = useCallback(() => setPlot(plot => {
        const xt = translateZoomBy([ -scaleTimeInterval(plot.timeScale, plot.view), 0 ])
        const yt = identity
        const transform = zipWithCall([ xt, yt ], plot.transform)
        const calculate = o(calculatePlotTimeRange, calculatePlotScale)
        return calculate({ ...plot, transform, showTimeTooltip: false })
    }), [])

    const onReset = useCallback(() => resetTransform('xy'), [])

    const onTimeScroll = useCallback(() => {
        const xt = ([ , t ]) => translateZoomBy([ (t.invertX(defaultPlotWidth) - defaultPlotWidth) * t.k, 0 ], t)
        const yt = last

        setTransition(500, [ xt, yt ])
    }, [])

    const getMenu = useCallback(({
        placement: [ placementX, placementY ],
        lock,
        session,
        line,
        label,
        price,
        invert,
        autoFit,
        timeZone
    }) => ({
        horizontal: [
            {
                left: Reset,
                center: 'Reset Time Scale',
                onClick: () => resetTransform('x')
            },
            { type: 'separator' },
            {
                center: `Move Time Axis to ${capitalizeWord(placementsText[ placementX ])}`,
                onClick: () => setPlacement([
                    placementsText[ placementX ],
                    placementY
                ])
            },
            { type: 'separator' },
            {
                type: 'branch',
                center: 'Time Zone',
                data: timeZones.map((_, id) => {
                    return {
                        type: 'check',
                        checked: equals(id, timeZone),
                        center: timeZoneToString(id),
                        onClick: () => setTimeZone(id)
                    }
                })
            },
            {
                type: 'check',
                checked: session,
                center: 'Session Breaks',
                onClick: () => setSession(
                    assoc('value', !session)
                )
            }
        ],
        vertical: [
            {
                left: Reset,
                center: 'Reset Price Scale',
                onClick: () => resetTransform('y')
            },
            { type: 'separator' },
            {
                type: 'check',
                checked: autoFit,
                center: 'Auto(Fits Data To Screen)',
                onClick: () => setPlot(
                    compose(
                        calculatePlotScale,
                        assoc('autoFit', !autoFit)
                    )
                )
            },
            {
                type: 'check',
                checked: invert,
                center: 'Invert Scale',
                onClick: () => setPlot(
                    compose(
                        calculatePlotScale,
                        assoc('invert', !invert)
                    )
                )
            },
            { type: 'separator' },
            ...priceAlgorithms.map(([ long ], id) => {
                return {
                    type: 'check',
                    checked: price === id,
                    center: capitalizeWord(long),
                    onClick: () => setPriceAlgorithm(id)
                }
            }),
            {
                center: `Move Price Axis to ${capitalizeWord(placementsText[ placementY ])}`,
                onClick: () => setPlacement([
                    placementX,
                    placementsText[ placementY ]
                ])
            },
            { type: 'separator' },
            {
                type: 'branch',
                center: 'Labels',
                data: Object.entries(label).map(([ id, value ]) => {
                    return {
                        type: 'check',
                        checked: value,
                        center: capitalizeWord(id),
                        onClick: () => setLabel(
                            assocPath([ 'value', id ], !value)
                        )
                    }
                })
            },
            {
                type: 'branch',
                center: 'Lines',
                data: Object.entries(line).map(([ id, value ]) => {
                    return {
                        type: 'check',
                        checked: value,
                        center: capitalizeWord(id),
                        onClick: () => setLine(
                            assocPath([ 'value', id ], !value)
                        )
                    }
                })
            },
            { type: 'separator' },
            {
                left: <Icon name='setting' />,
                center: 'Settings',
                onClick: () => setSetting({
                    visible: true,
                    transition: false
                })
            }
        ],
        main: [
            {
                left: Reset,
                center: 'Reset Chart',
                onClick: () => resetTransform('xy')
            },
            { type: 'separator' },
            {
                center: `Move Price Axis to ${capitalizeWord(placementsText[ placementY ])}`,
                onClick: () => setPlacement([
                    placementX,
                    placementsText[ placementY ]
                ])
            },
            {
                center: `Move Time Axis to ${capitalizeWord(placementsText[ placementX ])}`,
                onClick: () => setPlacement([
                    placementsText[ placementX ],
                    placementY
                ])
            },
            { type: 'separator' },
            ...zip([ 'vertical', 'horizontal' ], lock).map(([ id, lock ], i) => {
                return {
                    type: 'check',
                    checked: lock,
                    center: capitalizeWords(`lock ${id} cursor`),
                    onClick: () => setPlot(
                        assocPath([ 'lock', i ], !lock)
                    )
                }
            }),
            { type: 'separator' },
            {
                type: 'branch',
                center: 'Lines',
                data: Object.entries(line).map(([ id, value ]) => {
                    return {
                        type: 'check',
                        checked: value,
                        center: capitalizeWord(id),
                        onClick: () => setLine(
                            assocPath([ 'value', id ], !value)
                        )
                    }
                })
            },
            {
                left: <Icon name='setting' />,
                center: 'Settings',
                onClick: () => setSetting({
                    visible: true,
                    transition: false
                })
            }
        ]
    }), [])

    useEffect((symbol, timeInterval) => { // jaggy caused by state change and drawing operation begin without waiting for pending to complete.
        const onSnapshot = data => {
            if(data.length > 0) {
                setPlot(
                    compose(
                        calculatePlot,
                        calculatePlotScale,
                        calculatePlotSource,
                        mergeLeft({
                            data: data,
                            loading: false,
                            deficit: false
                        })
                    )
                )
            } else {
                setPlot(
                    assoc('deficit', true)
                )
            }
        }

        const onUpdate = update => setPlot(plot => {
            const shouldAppend = on(
                compose(Boolean, absDiff),
                compose(P.mts, last)
            )
            const data = plot.data
                .slice(0, shouldAppend(update, plot.data) ? -1 : -2)
                .concat(update)

            const calculate = compose(
                calculatePlotTimeRange,
                calculatePlotSelected,
                calculatePlotCursor,
                calculatePlotScale,
                calculatePlotSource
            )

            return calculate({ ...plot, data })
        })

        const onFrame = setFrame

        const sortByTimeStamp = sort(
            ascend(head)
        )

        const source = stream({
            socket: socket,
            payload: {
                channel: 'candles',
                key: `trade:${timeInterval}:${symbol}`
            }
        })

        const snapshot = source.pipe(
            rx.filter(([ type ]) => type === 'snapshot'),
            rx.map(last),
            rx.map(sortByTimeStamp),
            rx.share()
        )

        const update = source.pipe(
            rx.filter(([ type ]) => type === 'update'),
            rx.map(last),
            rx.bufferCount(2),
            rx.distinctUntilChanged(equals),
            rx.map(sortByTimeStamp),
            rx.share()
        )

        const frame = rx.concat(snapshot, update).pipe(
            rx.switchMap(() =>
                animationFrames(2000)
            )
        )

        const subs = [
            snapshot.subscribe(onSnapshot),
            update.subscribe(onUpdate),
            frame.subscribe(onFrame)
        ]

        return () => {
            setPlot(
                mergeLeft({
                    transform: defaultTransform,
                    loading: true,
                    completed: false,
                    inverted: [ 0, 0 ],
                    pointer: [],
                    cursor: [],
                    selected: [],
                    selectedChange: 0,
                    recent: [],
                    recentChange: 0,
                    deficit: false,
                    showTimeTooltip: false
                })
            )
            subs.forEach(sub =>
                sub.unsubscribe()
            )
        }
    }, [ symbol, timeInterval ])

    useEffect(transit => setPlot(plot => {
        const result = { ...plot, transit }
        if(plot.loading || plot.deficit) {
            return result
        } else {
            return calculatePlot(result)
        }
    }), [ timeDestination ])

    useEffect((symbol, timeInterval, [ start, end ]) => {
        fetchJSON(`/candles/trade:${timeInterval}:${symbol}/hist?start=${start}&end=${end}&sort=${1}&limit=10000`)
            .then(update =>
                setPlot(plot => {
                    const result = {
                        ...plot,
                        data: concat(
                            dropLastWhile(
                                on(
                                    lte,
                                    P.mts,
                                    head(plot.data)
                                ),
                                update
                            ),
                            plot.data
                        ),
                        request: [],
                        pending: [],
                        destination: plot.pending,
                        completed: isEmpty(update) || P.mts(head(update)) > start
                    }
                    if(plot.loading || plot.deficit) {
                        return result
                    } else {
                        const calculate = o(calculatePlot, calculatePlotSource)
                        return calculate(result)
                    }
                })
            ).catch(() =>
                setPlot(
                    assoc('request', [])
                )
            )
    }, [ symbol, timeInterval, plot.request ])

    useEffect(([ ms, values ]) => {
        const frames = animationFrames(ms)
        const calculatePlotTransform = compose(
            assoc('transform'),
            calculateZoomTransition(...values),
            easeCubicIn
        )
        const onTransition = compose(
            setPlot,
            o(calculatePlotScale),
            calculatePlotTransform
        )
        const onTransitionEnd = compose(
            setPlot,
            o(
                compose(
                    assoc('transition', []),
                    calculatePlotTimeRange,
                    calculatePlotRequest,
                    calculatePlotSelected,
                    calculatePlotCursor,
                    calculatePlotScale,
                )
            ),
            calculatePlotTransform
        )
        const transition = frames.pipe(
            rx.skip(1),
            rx.skipLast(1),
        )
        const transitionEnd = frames.pipe(
            rx.takeLast(1)
        )
        const transitions = [
            transition.subscribe(onTransition),
            transitionEnd.subscribe(onTransitionEnd)
        ]
        return () => transitions.forEach(transition =>
            transition.unsubscribe()
        )
    }, [ plot.transition ])

    useEffect(price => setPlot(plot => {
        const result = { ...plot, price }
        if(plot.loading || plot.deficit) {
            return result
        } else {
            return calculatePlotScale(result)
        }
    }), [ chart.price ])

    useEffect(type => setPlot(plot => {
        const transform = [ type, plot.type ].some(isHeikinashi)
            ? defaultTransform
            : plot.transform
        const result = { ...plot, type, transform }
        if(plot.loading || plot.deficit) {
            return result
        } else {
            const calculate = o(calculatePlotScale, calculatePlotSource)
            return calculate(result)
        }
    }), [ type ])

    useEffect(algorithm => setPlot(plot => {
        const log = isLogAlgorithm(algorithm)
        const autoFit = log || plot.autoFit
        const result = { ...plot, log, autoFit }
        if(plot.loading || plot.deficit) {
            return result
        } else {
            return calculatePlotScale(result)
        }
    }), [ priceAlgorithm ])

    useEffect(setTimeRange, [ plot.timeRange ])

    useEffect(compose(
        setMenu,
        getMenu,
        unapply(
            zipObj([
                'placement',
                'lock',
                'session',
                'line',
                'label',
                'price',
                'invert',
                'autoFit',
                'timeZone'
            ])
        )
    ), [ placement, plot.lock, session.value, line.value, label.value, priceAlgorithm, plot.invert, plot.autoFit, timeZone ])

    useLayoutEffect(countdown => {
        if(countdown) {
            const interval = setInterval(() => setNow(Date.now), 1000)

            setNow(Date.now)

            return () => clearInterval(interval)
        }
    }, [ label.value.countdown ])

    useLayoutEffect((
        context,
        size,
        frame,
        symbol,
        timeScale,
        priceScale,
        volumeScale,
        timeOffset,
        data,
        log,
        type,
        chart,
        recent,
        recentChange,
        start,
        end,
        session,
        line,
        label,
        font,
        grid,
        showTimeTooltip,
        timeFormat,
        order,
        baselinePrice,
        direction
    ) => {
        context.scale(devicePixelRatio, devicePixelRatio)

        drawMainChart({
            context,
            size,
            frame,
            symbol,
            timeScale,
            priceScale,
            volumeScale,
            timeOffset,
            data,
            log,
            type,
            chart,
            recent,
            recentChange,
            start,
            end,
            session,
            line,
            label,
            font,
            placement,
            grid,
            showTimeTooltip,
            timeFormat,
            order,
            baselinePrice,
            direction
        })

        return () => resetCanvas(context, size)
    }, [
        mainBack,
        plot.size,
        frame,
        symbol,
        plot.timeScale,
        plot.priceScale,
        plot.volumeScale,
        timeOffset,
        plot.view,
        plot.log,
        type,
        chart,
        plot.recent,
        plot.recentChange,
        plot.start,
        plot.end,
        session,
        line,
        label,
        axis.font,
        grid,
        plot.showTimeTooltip,
        timeFormat,
        order,
        baselinePrice,
        last(placement)
    ])

    useLayoutEffect((
        context,
        size,
        timeScale,
        priceScale,
        crosshair,
        cursor
    ) => {
        context.scale(devicePixelRatio, devicePixelRatio)

        drawMainCursor({
            context,
            size,
            timeScale,
            priceScale,
            crosshair,
            cursor
        })

        return () => resetCanvas(context, size)
    }, [
        mainFront,
        plot.size,
        plot.timeScale,
        plot.priceScale,
        crosshair,
        plot.cursor
    ])

    useLayoutEffect((
        context,
        size,
        now,
        priceAlgorithm,
        pricePrecision,
        priceScale,
        volumeScale,
        label,
        type,
        chart,
        data,
        start,
        end,
        recent,
        recentChange,
        font,
        order,
        baselinePrice,
        orientation
    ) => {
        context.scale(devicePixelRatio, devicePixelRatio)

        drawVerticalAxis({
            context,
            size,
            now,
            priceAlgorithm,
            pricePrecision,
            priceScale,
            volumeScale,
            label,
            type,
            chart,
            data,
            start,
            end,
            recent,
            recentChange,
            font,
            order,
            baselinePrice,
            orientation
        })

        return () => resetCanvas(context, size)
    }, [
        verticalBack,
        verticalSize,
        now,
        priceAlgorithm,
        precision,
        plot.priceScale,
        plot.volumeScale,
        label,
        type,
        chart,
        plot.view,
        plot.start,
        plot.end,
        plot.recent,
        plot.recentChange,
        axis.font,
        order,
        baselinePrice,
        last(placement)
    ])

    useLayoutEffect((
        context,
        size,
        priceScale,
        priceAlgorithm,
        pricePrecision,
        cursor,
        font,
        orientation
    ) => {
        context.scale(devicePixelRatio, devicePixelRatio)

        drawVerticalCursor({
            context,
            size,
            priceScale,
            priceAlgorithm,
            pricePrecision,
            cursor,
            font,
            orientation
        })

        return () => resetCanvas(context, size)
    }, [
        verticalFront,
        verticalSize,
        plot.priceScale,
        priceAlgorithm,
        precision,
        plot.cursor,
        axis.font,
        last(placement)
    ])

    useLayoutEffect((
        context,
        size,
        timeScale,
        timeOffset,
        data,
        font
    ) => {
        context.scale(devicePixelRatio, devicePixelRatio)

        drawHorizontalAxis({
            context,
            size,
            timeScale,
            timeOffset,
            data,
            font
        })

        return () => resetCanvas(context, size)
    }, [
        horizontalBack,
        horizontalSize,
        plot.timeScale,
        timeOffset,
        plot.view,
        axis.font
    ])

    useLayoutEffect((
        context,
        size,
        timeScale,
        timeOffset,
        timeFormat,
        cursor,
        font,
        orientation
    ) => {
        context.scale(devicePixelRatio, devicePixelRatio)

        drawHorizontalCursor({
            context,
            size,
            timeScale,
            timeOffset,
            timeFormat,
            cursor,
            font,
            orientation
        })

        return () => resetCanvas(context, size)
    }, [
        horizontalFront,
        horizontalSize,
        plot.timeScale,
        timeOffset,
        timeFormat,
        plot.cursor,
        axis.font,
        head(placement)
    ])

    useEffect((main, vertical, horizontal, _) => {
        const image = new OffscreenCanvas(main.canvas.width + vertical.canvas.width, main.canvas.height + horizontal.canvas.height)
        const imageContext = image.getContext('2d')

        const axisLines = {
            bottom: [ [ 0, main.canvas.height ], [ image.width, main.canvas.height ] ],
            top: [ [ 0, horizontal.canvas.height ], [ image.width, horizontal.canvas.height ] ],
            right: [ [ main.canvas.width, 0 ], [ main.canvas.width, image.height ] ],
            left: [ [ vertical.canvas.width, 0 ], [ vertical.canvas.width, image.height ] ]
        }

        const canvases = getGridAreas(placement, [
            [ main.canvas, vertical.canvas ],
            [ horizontal.canvas, new OffscreenCanvas(vertical.canvas.width, horizontal.canvas.height) ]
        ])

        const ref = head(
            head(canvases)
        )

        const draws = zipWith(
            (canvas, [ x, y ]) => ({ canvas, x, y }),
            canvases.flat(),
            [ [ 0, 0 ], [ ref.width, 0 ], [ 0, ref.height ], [ ref.width, ref.height ] ]
        )

        const linearGradient = imageContext.createLinearGradient(0, 0, 0, image.height)

        background.forEach((color, i) =>
            linearGradient.addColorStop(i, color)
        )

        imageContext.fillStyle = linearGradient

        imageContext.fillRect(0, 0, image.width, image.height)

        draws.forEach(({ canvas, x, y }) =>
            imageContext.drawImage(canvas, x, y, canvas.width, canvas.height)
        )

        drawLines({
            context: imageContext,
            stroke: axis.stroke,
            lines: placement.map(v => axisLines[ v ])
        })

        image.convertToBlob().then(blob => {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            const format = formatTime(`%e %b '%y`)
            link.download = `Krypton-${capitalizeWord(types[ type ])}-(${format(new Date())}).png`
            link.href = url

            link.click()
            URL.revokeObjectURL(url)
        })

    }, [ mainBack, verticalBack, horizontalBack, snapshot ])

    return (
        plot.deficit
            ? <ChartDeficit />
            : <div
                className='chart-center'
                style={ {
                    background: `linear-gradient(${background.join(', ')})`,
                    pointerEvents: plot.loading ? 'none' : 'auto',
                    opacity: plot.loading ? .5 : 1,
                    display: 'grid',
                    gridTemplateRows: gridTemplateRows,
                    gridTemplateColumns: gridTemplateCols,
                    gridTemplateAreas: formatGridAreas(
                        getGridAreas(placement, [
                            [ 'a00', 'a01' ],
                            [ 'a10', 'a11' ]
                        ])
                    )
                } }
            >
                <div
                    className='chart-center-grid'
                    style={ { gridArea: 'a00' } }
                >
                    <ChartMain
                        container={ container }
                        clear={ clear }
                        menu={ menu.main }
                        onResize={ setSize }
                        onZoomStart={ onZoomStart }
                        onZoom={ onMainZoom }
                        onZoomEnd={ onZoomEnd }
                        onContext={ setMainContext }
                        onPointerEnter={ onPointerEnter }
                        onPointerMove={ onPointerMove }
                        onPointerLeave={ onPointerLeave }
                        enableLevel={ enableLevel }
                        level={ level }
                        setLevel={ setLevel }
                    />
                    <ChartStatus
                        size={ plot.size }
                        symbol={ name }
                        order={ order }
                        baselinePrice={ baselinePrice }
                        base={ plot.start }
                        data={ plot.selected }
                        change={ plot.selectedChange }
                        algorithm={ priceAlgorithm }
                        chart={ chart }
                        precision={ precision }
                        type={ type }
                        status={ status }
                        interval={ timeInterval }
                        loading={ plot.loading }
                    />
                    <ChartInfo info={ info } />
                    <ChartNavigation
                        container={ container }
                        onZoomIn={ onZoomIn }
                        onZoomOut={ onZoomOut }
                        onPanLeft={ onPanLeft }
                        onPanRight={ onPanRight }
                        onReset={ onReset }
                        reset={ enableReset }
                        visibility={ navigationVisibility }
                    />
                    {
                        enableScroll
                            ? <ChartTimeScroll
                                container={ container }
                                onTimeScroll={ onTimeScroll }
                            />
                            : null
                    }
                </div>
                <div
                    className='chart-center-grid'
                    style={ { gridArea: 'a01', ...borderY } }
                >
                    <ChartVertical
                        container={ container }
                        clear={ clear }
                        menu={ menu.vertical }
                        onResize={ setVerticalSize }
                        onZoomStart={ onZoomStart }
                        onZoom={ onVerticalZoom }
                        onZoomEnd={ onZoomEnd }
                        onContext={ setVerticalContext }
                    />
                </div>
                <div
                    className='chart-center-grid'
                    style={ { gridArea: 'a10', ...borderX } }
                >
                    <ChartHorizontal
                        container={ container }
                        clear={ clear }
                        onZoomStart={ onZoomStart }
                        onZoom={ onHorizontalZoom }
                        onZoomEnd={ onZoomEnd }
                        onResize={ setHorizontalSize }
                        onContext={ setHorizontalContext }
                        menu={ menu.horizontal }
                    />
                </div>
                <div
                    className='chart-center-grid'
                    style={ { gridArea: 'a11', ...borderX, ...borderY } }
                >
                    <ChartOption
                        container={ container }
                        orientation={ head(placement) }
                        clear={ clear }
                        menu={ menu.vertical }
                        tooltip={ name + ' ' + timeInterval }
                    />
                </div>
            </div>
    )
}

const ChartTimeRange = ({
    container,
    clear,
    timeInterval,
    setTimeInterval,
    time,
    setTime
}) => {

    const [ collapsed, setCollapsed ] = useState(false)

    const data = timeRanges.map(timeRange => {
        return {
            center: timeRange.label,
            highlighted: equals(
                [ timeInterval, time ],
                [ timeRange.interval, timeRange.generate(now()) ]
            ),
            onClick: () => {
                setTimeInterval(timeRange.interval)
                setTime(
                    timeRange.generate(
                        now()
                    )
                )
            }
        }
    })

    const shortenLabel = compose(
        slice(0, 2),
        join(''),
        split(' ')
    )

    useEffect(container => {
        const subscription = resizeObserver([ container ]).subscribe(() =>
            setCollapsed(
                getNodeWidth(container) < 600
            )
        )

        return () => subscription.unsubscribe()
    }, [ container ])

    return collapsed
        ? (
            <Select
                container={ container }
                clear={ clear }
                preview='Time Range'
                data={ data }
                containerMargin='0 0 0 -45'
                targetMargin='5'
                outlined={ false }
                display='block'
            />
        )
        : (
            <menu className='chart-range'>
                {
                    data.map(({ center, onClick, highlighted }, key) =>
                        <li
                            key={ key }
                            className='chart-range-item'
                        >
                            <TooltipPlacements
                                container={ container }
                                clear={ clear }
                                data={ center }
                                targetMargin='0 5 0 0'
                                containerMargin='-5 0 0 0'
                                alignment='center'
                                direction='top'
                            >
                                <Button
                                    display='block'
                                    size='big'
                                    highlighted={ highlighted }
                                    onClick={ onClick }
                                >
                                    { shortenLabel(center) }
                                </Button>
                            </TooltipPlacements>
                        </li>
                    )
                }
            </menu>
        )
}

const ChartCalendarHeader = ({ onClose }) => (
    <div className='chart-calendar-header draggable'>
        <h3 className='chart-calendar-title'>
            Go To
        </h3>
        <Button title='Close Calendar' display='inline' size='big' onClick={ onClose }>
            <Icon name='close' />
        </Button>
    </div>
)

const ChartCalendarForm = ({
    id,
    container,
    control,
    clear,
    value,
    min,
    max,
    onChange,
    onFocus,
    focus,
    clock
}) => (
    <div className='chart-calendar-form'>
        <TimeDate
            id={ id }
            min={ min }
            max={ max }
            value={ value }
            onChange={ onChange }
            focus={ focus }
            onFocus={ onFocus }
        />
        <TimeClock
            display='inline'
            container={ container }
            control={ control }
            clear={ clear }
            min={ min }
            max={ max }
            value={ value }
            onChange={ onChange }
            disabled={ !clock }
        />
    </div>
)

const ChartCalendarSingle = ({
    container,
    active,
    value,
    clear,
    onChange,
    control,
    clock
}) => (
    <>
        <ChartCalendarForm
            id='singledate'
            container={ container }
            clear={ clear }
            min={ 0 }
            max={ today }
            value={ value }
            control={ control }
            focus={ active }
            onChange={ onChange }
            clock={ clock }
        />
        <TimeCalendar
            min={ 0 }
            max={ today }
            value={ value }
            onChange={ onChange }
        />
    </>
)


const ChartCalendarMultiple = ({
    container,
    active,
    value,
    clear,
    onChange,
    control,
    clock
}) => {

    const [ focus, setFocus ] = useState(() => 0)

    const ids = [ 'mindate', 'maxdate' ]

    const extent = [
        [ 0, last(value) ],
        [ head(value), Infinity ]
    ]

    const onFormChange = curry((idx, vs, v) =>
        onChange(
            update(idx, v, vs)
        )
    )

    const onCalendarChange = curry((idx, vs, v) => {
        onFormChange(idx, vs, v)
        setFocus(idx || 1)
    })

    useEffect(() => setFocus(0), [ active ])

    return (
        <>
            {
                value.map((ms, key) =>
                    <ChartCalendarForm
                        key={ key }
                        id={ ids[ key ] }
                        container={ container }
                        control={ control }
                        clear={ clear }
                        min={ head(extent[ key ]) }
                        max={ last(extent[ key ]) }
                        value={ ms }
                        focus={ focus === key && active }
                        onFocus={ () => setFocus(key) }
                        onChange={ onFormChange(key, value) }
                        clock={ clock }
                    />
                )
            }
            <TimeCalendar
                value={ value[ focus ] }
                min={ head(extent[ focus ]) }
                max={ last(extent[ focus ]) }
                onChange={ onCalendarChange(focus, value) }
            />
        </>
    )
}

const ChartCalendarMain = ({
    control,
    container,
    clear,
    onChange,
    value,
    clock
}) => {

    const [ tab, setTab ] = useState(() => 0)

    const [ single, setSingle ] = useState(() =>
        utcHour.floor(
            now()
        )
    )

    const [ multiple, setMultiple ] = useState(() => {
        const end = utcHour.floor(
            now()
        )
        const start = utcDay.offset(end, -7)
        return [ start, end ]
    })

    const onSingleChange = useCallback(batch([
        setSingle,
        o(onChange, singleton)
    ]), [])

    const onMultipleChange = useCallback(batch([
        setMultiple,
        onChange
    ]), [])

    useEffect(setMultiple, [ value ])

    const props = {
        clear,
        container,
        clock,
        control: control.visible ? ({}) : control
    }

    const contents = [
        <ChartCalendarSingle
            active={ tab === 0 && control.visible }
            value={ single }
            onChange={ onSingleChange }
            { ...props }
        />,
        <ChartCalendarMultiple
            active={ tab === 1 && control.visible }
            value={ multiple }
            onChange={ onMultipleChange }
            { ...props }
        />
    ]

    return (
        <div className='chart-calendar-main'>
            <menu className='chart-calendar-tab'>
                {
                    [ 'date', 'custom range' ].map((id, key) =>
                        <li
                            key={ key }
                            className='chart-calendar-item'
                        >
                            <Button
                                size='big'
                                highlighted={ key === tab }
                                onClick={ () => setTab(key) }
                            >
                                { capitalizeWords(id) }
                            </Button>
                        </li>
                    )
                }
            </menu>
            <div className='chart-calendar-content'>
                { contents[ tab ] }
            </div>
        </div>
    )
}

const ChartCalendarFooter = ({
    onCancel,
    onDone
}) => (
    <menu className='chart-calendar-footer'>
        {
            [
                [ 'cancel', onCancel ],
                [ 'go to', onDone ]
            ].map(([ id, onClick ]) =>
                <li
                    key={ id }
                    className='chart-calendar-item'
                >
                    <Button
                        size='big'
                        outlined={ true }
                        onClick={ onClick }
                    >
                        { capitalizeWords(id) }
                    </Button>
                </li>
            )
        }
    </menu>
)

const ChartCalendarPopup = ({
    container,
    control,
    time,
    timeZone,
    clock,
    onCancel,
    onClose,
    onDone
}) => {

    const [ output, setOutput ] = useState([])

    const [ clear, setClear ] = useState({})

    const onPointerDown = useCallback(({ target }) => setClear({
        target: target,
        transition: false
    }), [])

    const timeOffset = getTimeZoneOffset(timeZone)

    const done = compose(
        onDone,
        map(
            add(-timeOffset)
        )
    )

    const value = useMemo(() => time.map(
        add(timeOffset)
    ), [ time, timeOffset ])

    return (
        <div
            className='chart-calendar'
            onPointerDown={ onPointerDown }
        >
            <ChartCalendarHeader onClose={ onClose } />
            <ChartCalendarMain
                container={ container }
                control={ control }
                clear={ clear }
                onChange={ setOutput }
                value={ value }
                clock={ clock }
            />
            <ChartCalendarFooter
                onCancel={ onCancel }
                onDone={ () => done(output) }
            />
        </div>
    )
}

const ChartCalendar = ({
    container,
    clear,
    clock,
    timeZone,
    time,
    setTime
}) => {

    const [ control, setControl ] = useState({})

    const [ event, setEvent ] = useState({})

    const [ highlighted, setHighlighted ] = useState(false)

    const onToggle = useCallback(batch([
        compose(
            setHighlighted,
            prop('visible')
        ),
        setEvent
    ]), [])

    const onClose = useCallback(() => setControl({
        visible: false,
        transition: false
    }), [])

    const onDone = useCallback(batch([ setTime, onClose ]), [])

    return (
        <PopupPlacements
            container={ container }
            clear={ clear }
            control={ control }
            onToggle={ onToggle }
            data={
                <ChartCalendarPopup
                    container={ container }
                    onCancel={ onClose }
                    onClose={ onClose }
                    onDone={ onDone }
                    control={ event }
                    time={ time }
                    timeZone={ timeZone }
                    clock={ clock }
                />
            }
        >
            <TooltipPlacements
                container={ container }
                clear={ clear }
                data='Go To'
                alignment='center'
                direction='top'
            >
                <Button
                    display='block'
                    size='big'
                    highlighted={ highlighted }
                >
                    <Icon name='arrowcalendar' />
                </Button>
            </TooltipPlacements>
        </PopupPlacements>
    )
}

const ChartTimeZone = ({
    container,
    clear,
    timeZone,
    setTimeZone
}) => {

    const [ time, setTime ] = useState(now)

    const [ highlighted, setHighlighted ] = useState(false)

    const data = timeZones.map((_, id) => {
        return {
            type: 'check',
            checked: equals(id, timeZone),
            center: timeZoneToString(id),
            onClick: () => setTimeZone(id)
        }
    })

    const onToggle = useCallback(compose(
        setHighlighted,
        prop('visible')
    ), [])

    useEffect(() => {
        const interval = setInterval(compose(setTime, now), 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <ToggleMenuPlacements
            container={ container }
            clear={ clear }
            containerMargin='0 0 0 -45'
            targetMargin='0 5 0 0'
            alignment='center'
            direction='top'
            onToggle={ onToggle }
            data={ data }
        >
            <TooltipPlacements
                container={ container }
                direction='top'
                alignment='center'
                data='Time Zone'
            >
                <Button
                    display='block'
                    size='big'
                    highlighted={ highlighted }
                >
                    { millisecondsToClock(getTimeZoneOffset(timeZone) + time) + getTimeZoneUTC(timeZone) }
                </Button>
            </TooltipPlacements>
        </ToggleMenuPlacements>
    )
}

const ChartAlgorithm = ({
    container,
    clear,
    priceAlgorithm,
    setPriceAlgorithm
}) => (
    <menu className='chart-algorithm'>
        {
            priceAlgorithms.slice(0, -1).map(([ long, short ], id) =>
                <li
                    key={ id }
                    className='chart-algorithm-item'
                >
                    <TooltipPlacements
                        container={ container }
                        clear={ clear }
                        data={ 'Toggle' + ' ' + capitalizeWord(long) + ' ' + 'Scale' }
                        alignment='center'
                        direction='top'
                        targetMargin='0 5 0 0'
                        containerMargin='0 0 -10 0'
                    >
                        <Button
                            display='block'
                            size='big'
                            highlighted={ id === priceAlgorithm }
                            onClick={ () => setPriceAlgorithm(id) }
                        >
                            { short }
                        </Button>
                    </TooltipPlacements>
                </li>
            )
        }
    </menu>
)

const Separator = () => (
    <svg
        className='separator'
        viewBox='0 0 25 25'
    >
        <line
            x1={ 12.5 }
            y1={ 0 }
            x2={ 12.5 }
            y2={ 25 }
            stroke='rgb(255, 255, 255, .2)'
        />
    </svg>
)

const ChartBottom = memo(({
    container,
    clear,
    timeZone,
    setTimeZone,
    priceAlgorithm,
    setPriceAlgorithm,
    timeInterval,
    setTimeInterval,
    time,
    setTime
}) =>
    <div className='chart-bottom'>
        <div className='chart-bottom-left'>
            <ChartTimeRange
                container={ container }
                clear={ clear }
                timeInterval={ timeInterval }
                setTimeInterval={ setTimeInterval }
                time={ time }
                setTime={ setTime }
            />
            <Separator />
            <ChartCalendar
                container={ container }
                clear={ clear }
                time={ time }
                setTime={ setTime }
                timeZone={ [ 'W', 'M' ].some(v => timeInterval.includes(v)) ? defaultTimeZone : timeZone }
                clock={ [ 'm', 'h' ].some(v => timeInterval.includes(v)) }
            />
        </div>
        <div className='chart-bottom-right'>
            <ChartTimeZone
                container={ container }
                clear={ clear }
                timeZone={ timeZone }
                setTimeZone={ setTimeZone }
            />
            <Separator />
            <ChartAlgorithm
                container={ container }
                clear={ clear }
                priceAlgorithm={ priceAlgorithm }
                setPriceAlgorithm={ setPriceAlgorithm }
            />
        </div>
    </div>
)

const Chart = ({ socket, maps, symbol }) => {

    const [ container, setContainer ] = useState({})

    const [ clear, setClear ] = useState({})

    const [ info, setInfo ] = useState({})

    const [ setting, setSetting ] = useState({})

    const [ snapshot, setSnapshot ] = useState({})

    const [ placement, setPlacement ] = useState([ 'bottom', 'right' ])

    const [ navigationVisibility, setNavigationVisibility ] = useState(defaultUIVisibility)

    const [ background, setBackground ] = useState([ 'transparent', 'transparent' ])

    const [ grid, setGrid ] = useState([
        {
            color: defaultGridColor,
            thickness: 1,
            style: 'solid'
        },
        {
            color: defaultGridColor,
            thickness: 1,
            style: 'solid'
        }
    ])

    const [ status, setStatus ] = useState({
        symbol: true,
        ohlc: true,
        change: true,
        volume: true
    })

    const [ session, setSession ] = useState({
        value: false,
        stroke: {
            color: defaultColor,
            thickness: 1,
            style: 'dashed'
        }
    })

    const [ axis, setAxis ] = useState({
        stroke: {
            color: defaultAxisColor,
            thickness: 1,
            style: 'solid'
        },
        font: {
            family: 'krypton-sans-serif',
            color: defaultColor,
            size: 12,
            weight: 400
        }
    })

    const [ crosshair, setCrosshair ] = useState({
        color: defaultColor,
        thickness: 1,
        style: 'dashed'
    })

    const [ label, setLabel ] = useState({
        value: {
            symbol: false,
            price: true,
            change: false,
            high: false,
            low: false,
            volume: false,
            countdown: false
        },
        fill: {
            symbol: '',
            price: '',
            change: '',
            high: defaultBlueLabel,
            low: defaultBlueLabel,
            volume: '',
            countdown: ''
        }
    })

    const [ line, setLine ] = useState({
        value: {
            price: true,
            high: false,
            low: false
        },
        stroke: {
            price: {
                color: '',
                thickness: 1,
                style: 'dotted'
            },
            high: {
                color: defaultColor,
                thickness: 1,
                style: 'dotted'
            },
            low: {
                color: defaultColor,
                thickness: 1,
                style: 'dotted'
            }
        }
    })

    const [ areaChart, setAreaChart ] = useState({
        previous: false,
        price: defaultPriceSource,
        stroke: {
            color: defaultBlueColor,
            thickness: defaultLineThickness
        },
        fill: defaultAreaFill
    })

    const [ barChart, setBarChart ] = useState({
        previous: false,
        price: defaultPriceSource,
        fill: defaultChartColors,
        thin: true,
        hlc: false
    })

    const [ baselineChart, setBaselineChart ] = useState({
        previous: false,
        top: {
            fill: defaultChartColors,
            stroke: {
                color: defaultDownColor,
                thickness: defaultLineThickness
            }
        },
        bottom: {
            fill: defaultChartColors,
            stroke: {
                color: defaultUpColor,
                thickness: defaultLineThickness,
                style: 'solid'
            }
        },
        price: defaultPriceSource,
        level: .5
    })

    const [ candleChart, setCandleChart ] = useState({
        previous: false,
        price: defaultPriceSource,
        body: {
            color: defaultChartColors,
            value: true
        },
        border: {
            color: defaultChartColors,
            value: true
        },
        wick: {
            color: defaultChartColors,
            value: true
        }
    })

    const [ columnChart, setColumnChart ] = useState({
        previous: true,
        fill: defaultChartColors,
        price: defaultPriceSource
    })

    const [ heikinashiChart, setHeikinashiChart ] = useState({
        previous: false,
        price: defaultPriceSource,
        body: {
            color: defaultChartColors,
            value: true
        },
        border: {
            color: defaultChartColors,
            value: true
        },
        wick: {
            color: defaultChartColors,
            value: true
        }
    })

    const [ highLowChart, setHighLowChart ] = useState({
        previous: false,
        price: defaultHighLowPriceSource,
        body: { color: defaultBlueColor, value: true },
        border: { color: defaultBlueColor, value: true },
        label: { color: defaultBlueColor, value: true }
    })

    const [ HLCChart, setHLCChart ] = useState(() => {
        return {
            previous: false,
            price: defaultPriceSource,
            high: {
                color: defaultUpColor,
                thickness: defaultLineThickness
            },
            low: {
                color: defaultDownColor,
                thickness: defaultLineThickness
            },
            close: {
                color: defaultHLCCloseColor,
                thickness: defaultLineThickness
            },
            fill: defaultChartColors.map(v =>
                colord(v).alpha(.25).toHex()
            )
        }
    })

    const [ hollowChart, setHollowChart ] = useState(() => {
        return {
            previous: true,
            price: defaultPriceSource,
            body: {
                color: [ colord(defaultUpColor).alpha(0).toHex(), defaultDownColor ],
                value: true
            },
            border: {
                color: defaultChartColors,
                value: true
            },
            wick: {
                color: defaultChartColors,
                value: true
            }
        }
    })

    const [ lineChart, setLineChart ] = useState({
        previous: false,
        price: defaultPriceSource,
        stroke: {
            color: defaultBlueColor,
            thickness: defaultLineThickness
        }
    })

    const [ markerChart, setMarkerChart ] = useState({
        previous: false,
        price: defaultPriceSource,
        stroke: {
            color: defaultBlueColor,
            thickness: defaultLineThickness
        }
    })

    const [ stepChart, setStepChart ] = useState({
        previous: false,
        price: defaultPriceSource,
        stroke: {
            color: defaultBlueColor,
            thickness: defaultLineThickness
        }
    })

    const [ type, setType ] = useState(defaultType)

    const [ pricePrecision, setPricePrecision ] = useState(defaultPricePrecision)

    const [ priceAlgorithm, setPriceAlgorithm ] = useState(defaultPriceAlgorithm)

    const [ timeZone, setTimeZone ] = useState(defaultTimeZone)

    const [ timeFormat, setTimeFormat ] = useState(defaultTimeFormat)

    const [ timeInterval, setTimeInterval ] = useState(defaultTimeInterval)

    const [ timeDestination, setTimeDestination ] = useState([])

    const [ timeRange, setTimeRange ] = useState([])

    const clearMenu = e => setClear(clear =>
        isPlacementEvent(e)
            ? clear
            : ({ target: e.target, transition: false })
    )

    const setLevel = useCallback(value => setBaselineChart(chart => {
        const l0 = chart.level
        const l1 = is(Function, value) ? value(l0) : value
        return equals(l0, l1) ? chart : ({ ...chart, level: l1 })
    }), [])

    const charts = [
        areaChart,
        barChart,
        baselineChart,
        candleChart,
        columnChart,
        heikinashiChart,
        highLowChart,
        HLCChart,
        hollowChart,
        lineChart,
        markerChart,
        stepChart
    ]

    const chart = charts[ type ]

    return (
        <div
            id='chart'
            className='chart'
            ref={ setContainer }
            onClick={ clearMenu }
            onContextMenu={ clearMenu }
        >
            <ChartTop
                timeInterval={ timeInterval }
                setTimeInterval={ setTimeInterval }
                container={ container }
                clear={ clear }
                navigationVisibility={ navigationVisibility }
                setNavigationVisibility={ setNavigationVisibility }
                setSnapshot={ setSnapshot }
                type={ type }
                setType={ setType }
                line={ line }
                setLine={ setLine }
                label={ label }
                setLabel={ setLabel }
                setInfo={ setInfo }
                status={ status }
                setStatus={ setStatus }
                background={ background }
                setBackground={ setBackground }
                session={ session }
                setSession={ setSession }
                axis={ axis }
                setAxis={ setAxis }
                crosshair={ crosshair }
                setCrosshair={ setCrosshair }
                grid={ grid }
                setGrid={ setGrid }
                timeZone={ timeZone }
                setTimeZone={ setTimeZone }
                priceAlgorithm={ priceAlgorithm }
                setPriceAlgorithm={ setPriceAlgorithm }
                pricePrecision={ pricePrecision }
                setPricePrecision={ setPricePrecision }
                setting={ setting }
                setSetting={ setSetting }
                timeFormat={ timeFormat }
                setTimeFormat={ setTimeFormat }
                areaChart={ areaChart }
                setAreaChart={ setAreaChart }
                barChart={ barChart }
                setBarChart={ setBarChart }
                baselineChart={ baselineChart }
                setBaselineChart={ setBaselineChart }
                candleChart={ candleChart }
                setCandleChart={ setCandleChart }
                columnChart={ columnChart }
                setColumnChart={ setColumnChart }
                heikinashiChart={ heikinashiChart }
                setHeikinashiChart={ setHeikinashiChart }
                highLowChart={ highLowChart }
                setHighLowChart={ setHighLowChart }
                HLCChart={ HLCChart }
                setHLCChart={ setHLCChart }
                hollowChart={ hollowChart }
                setHollowChart={ setHollowChart }
                lineChart={ lineChart }
                setLineChart={ setLineChart }
                markerChart={ markerChart }
                setMarkerChart={ setMarkerChart }
                stepChart={ stepChart }
                setStepChart={ setStepChart }
                placement={ placement }
                setPlacement={ setPlacement }
            />
            <ChartCenter
                info={ info }
                container={ container }
                clear={ clear }
                socket={ socket }
                symbol={ symbol }
                navigationVisibility={ navigationVisibility }
                timeInterval={ timeInterval }
                axis={ axis }
                type={ type }
                background={ background }
                grid={ grid }
                status={ status }
                snapshot={ snapshot }
                timeFormat={ timeFormat }
                session={ session }
                setSession={ setSession }
                crosshair={ crosshair }
                line={ line }
                setLine={ setLine }
                label={ label }
                setLabel={ setLabel }
                timeZone={ timeZone }
                setTimeZone={ setTimeZone }
                pricePrecision={ pricePrecision }
                priceAlgorithm={ priceAlgorithm }
                setPriceAlgorithm={ setPriceAlgorithm }
                setSetting={ setSetting }
                chart={ chart }
                setTimeRange={ setTimeRange }
                timeDestination={ timeDestination }
                placement={ placement }
                setPlacement={ setPlacement }
                level={ baselineChart.level }
                setLevel={ setLevel }
                maps={ maps }
            />
            <ChartBottom
                container={ container }
                clear={ clear }
                timeZone={ timeZone }
                setTimeZone={ setTimeZone }
                priceAlgorithm={ priceAlgorithm }
                setPriceAlgorithm={ setPriceAlgorithm }
                timeInterval={ timeInterval }
                setTimeInterval={ setTimeInterval }
                time={ timeRange }
                setTime={ setTimeDestination }
            />
        </div>
    )
}

export default Chart