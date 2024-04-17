import { colord, extend } from 'colord'
import a11yPlugin from "colord/plugins/a11y"
import namesPlugin from 'colord/plugins/names'
import { compose, juxt, nth, sum, curry, head, last, multiply, o, on, zip, apply, isEmpty, sort, subtract, call, take, init, tail, identity, toUpper, is } from 'ramda'
import absDiff from './absDiff'
import { extent, scaleLinear, utcMonday, utcMonth } from 'd3'
import { zipWithCall } from './zipUtility'
import { daysToMilliseconds, hoursToMilliseconds, millisecondsToHours, weeksToMilliseconds } from './time'
import rangeGenerator from './rangeGenerator'

extend([ a11yPlugin, namesPlugin ])

const strokePattern = {
    solid: [],
    dashed: [ 4, 4 ],
    dotted: [ 2, 2 ]
}

const defaultXTickSpace = 150

const defaultYTickSpace = 45

const defaultColor = 'rgba(255, 255, 255, 0.5)'

const defaultWhiteColor = '#f3e8ee'

const defaultBlackColor = '#1e222b'

const defaultUpColor = '#089981'

const defaultDownColor = '#f23645'

const defaultBlueColor = '#2962ff'

const defaultLabelFill = 'rgba(45, 54, 64)'

const defaultChartColors = [ defaultUpColor, defaultDownColor ]

const defaultFont = 'krypton-sans-serif'

const round = Math.round
const floor = Math.floor
const ceil = Math.ceil

const crisp = curry((offset, value) => floor(value) + offset)

const odd = value => {
    const floored = floor(value)
    const offset = Number(floored % 2 === 0)
    return floored - offset
}

const even = value => {
    const floored = floor(value)
    const offset = Number(floored % 2 !== 0)
    return floored - offset
}

const readableTextColor = background =>
    colord('white').isReadable(background)
        ? defaultWhiteColor
        : defaultBlackColor

const extractRem = rem => is(String, rem)
    ? Number(
        rem.slice(0, -3)
    )
    : rem

const extractPixel = px => is(String, px)
    ? Number(
        px.slice(0, -2)
    )
    : px

const extractFontSize = size =>
    is(String, size)
        ? size.includes('rem')
            ? extractRem(size)
            : extractPixel(size)
        : size


const remToPixel = v => extractRem(v) * 10

const pixelToRem = v => extractPixel(v) / 10

const P = {
    mts: nth(0),
    open: nth(1),
    close: nth(2),
    high: nth(3),
    low: nth(4),
    volume: nth(5)
}

const textSizes = rangeGenerator(v => v + 2, 10, 40)

const textScale = scaleLinear()
    .domain(
        extent(textSizes)
    )
    .range([ 1, 2.8 ])

const priceSources = [
    'Open',
    'High',
    'Low',
    'Close',
    '(H + L) / 2',
    '(H + L + C) / 3',
    '(O + H + L + C) / 4'
]

const priceReducers = [
    P.open,
    P.high,
    P.low,
    P.close,
    compose(
        multiply(1 / 2),
        sum,
        juxt([ P.high, P.low ])
    ),
    compose(
        multiply(1 / 3),
        sum,
        juxt([ P.high, P.low, P.close ])
    ),
    compose(
        multiply(1 / 4),
        sum,
        juxt([ P.open, P.high, P.low, P.close ])
    ),
    P.volume
]

const price = curry((source, data) =>
    nth(source, priceReducers)(data)
)

const priceExtent = curry((props, [ first, ...rest ]) => {
    const [ min, max ] = rest.reduce((a, b) =>
        zipWithCall(
            [ apply(Math.min), apply(Math.max) ],
            zip(props(b), a)
        ),
        props(first)
    )
    if(min === max) {
        return [ min - min * .5, max + max * .5 ]
    } else {
        return [ min, max ]
    }
})

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

const lines = [ 0, 2, 9, 10, 11 ]

const isLine = v => lines.includes(v)

const OHLCs = [ 1, 3, 5, 6, 7, 8 ]

const isOHLC = v => OHLCs.includes(v)

const isHeikinashi = v => v === 5

const sortLabel = curry((prop, median, data) =>
    sort((a, b) =>
        subtract(
            absDiff(prop(a), median),
            absDiff(prop(b), median)
        ),
        data
    )
)

const scaleTickInterval = curry((fn, [ a, b ]) =>
    on(absDiff, fn, a, b)
)

const dataTimeInterval = compose(
    apply(
        on(absDiff, P.mts)
    ),
    take(2)
)

const formatTimeTicks = curry((interval, offset, ticks) => {
    if(interval > daysToMilliseconds(1)) {
        const round = interval > weeksToMilliseconds(1)
            ? utcMonth.round
            : utcMonday.round
        return ticks.map(round)
    } else {
        const delta = hoursToMilliseconds(
            (24 + millisecondsToHours(offset)) % millisecondsToHours(interval)
        )
        return ticks.map(v => new Date(v.getTime() + delta))
    }
})

const isLinesOverlap = curry(([ y0, y1 ], [ y2, y3 ]) =>
    (y0 === y2 && y1 === y3)
    || (y0 > y2 && y0 < y3)
    || (y1 > y2 && y1 < y3)
    || (y2 > y0 && y2 < y1)
    || (y3 > y0 && y3 < y1)
)

const adjustLabel = ([ v0, line ], lines) => {
    if(isEmpty(lines)) {
        return line
    } else {
        const sortClosestSolution = curry((line, lines) =>
            sort((a, b) =>
                subtract(
                    absDiff(
                        head(line),
                        head(a)
                    ),
                    absDiff(
                        head(line),
                        head(b)
                    )
                ),
                lines
            )
        )
        const length = absDiff(...line)
        const solutions = [
            line,
            ...sortClosestSolution(
                line,
                lines.flatMap(([ v1, [ start, end ] ]) =>
                    call(v0 < v1 ? init : v0 > v1 ? tail : identity, [
                        [ start - length, start ],
                        [ end, end + length ]
                    ])
                )
            )
        ]

        const solution = solutions
            .find(solution =>
                !lines.some(([ _, position ]) =>
                    isLinesOverlap(position, solution)
                )
            )

        return solution
    }
}

const linePriceColor = ({ chart }) => chart.stroke.color

const ohlcPriceColor = ({ chart, change, data }) => {
    const index = Number(
        chart.previous ? change < 0 : P.open(data) > P.close(data)
    )
    return chart.border.color[ index ]
}

const baselinePriceColor = ({ baselinePrice, order, data, chart }) => {
    const key = order > 0
        ? price(chart.price, data) > baselinePrice ? 'top' : 'bottom'
        : price(chart.price, data) > baselinePrice ? 'bottom' : 'top'
    return chart[ key ].stroke.color
}

const columnPriceColor = ({ chart, change, data }) => {
    const index = Number(
        chart.previous ? change < 0 : P.open(data) > P.close(data)
    )
    return chart.fill[ index ]
}

const highLowPriceColor = ({ chart }) => chart.border.color

const HLCPriceColor = ({ chart }) => chart.close.color

const chartPriceColor = curry((type, props) => {
    const fns = [
        linePriceColor,
        columnPriceColor,
        baselinePriceColor,
        ohlcPriceColor,
        columnPriceColor,
        ohlcPriceColor,
        highLowPriceColor,
        HLCPriceColor,
        ohlcPriceColor,
        linePriceColor,
        linePriceColor,
        linePriceColor
    ]
    const color = fns[ type ](props)
    return colord(color).alpha(1).toHex()
})

const lineOffset = thickness => (thickness % 2) / 2

const drawLines = ({ context, stroke = {}, lines = [] }) => {
    const offset = lineOffset(stroke.thickness)
    context.lineWidth = stroke.thickness || 1
    context.strokeStyle = stroke.color || defaultColor
    context.setLineDash(strokePattern[ stroke.style || 'solid' ])
    context.lineDashOffset = offset
    context.beginPath()
    lines.forEach(([ [ x0, y0 ], [ x1, y1 ] ]) => {
        context.moveTo(floor(x0) + offset, floor(y0) + offset)
        context.lineTo(floor(x1) + offset, floor(y1) + offset)
    })
    context.stroke()
}

const drawMultiLines = ({ context, lines }) =>
    lines.forEach(({ stroke, line: [ [ x0, y0 ], [ x1, y1 ] ] }) => {
        const offset = lineOffset(stroke.thickness)
        context.lineWidth = stroke.thickness
        context.strokeStyle = stroke.color
        context.lineDashOffset = offset
        context.setLineDash(strokePattern[ stroke.style ])
        context.beginPath()
        context.moveTo(floor(x0) + offset, floor(y0) + offset)
        context.lineTo(floor(x1) + offset, floor(y1) + offset)
        context.stroke()
    })

const drawPulse = ({ context, pulse, frame }) => {
    context.lineWidth = 1
    context.strokeStyle = colord(pulse.color).alpha(1 - frame * frame).toRgbString()
    context.setLineDash(strokePattern.solid)

    context.beginPath()
    context.arc(round(pulse.x), round(pulse.y), 2.5 + frame * 15, 0, 2 * Math.PI)
    context.closePath()
    context.stroke()
}

const declareFont = font => `${font.weight || 400} ${pixelToRem(font.size || 12) + 'rem'} ${font.family || defaultFont}`

const drawTexts = ({ context, font = {}, texts }) => {
    context.font = declareFont(font)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = font.color || defaultColor

    texts.forEach(({ message, x, y }) =>
        context.fillText(
            message,
            round(x),
            round(y)
        )
    )
}

const drawLabels = ({ context, font = {}, labels }) => {
    context.font = declareFont(font)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    labels.forEach(({ x, y, width, height, message, fill, color, radius = 5 }) => {
        const rect = new Path2D()
        rect.roundRect(
            round(x - width / 2),
            round(y - height / 2),
            round(width),
            round(height),
            radius
        )
        context.fillStyle = colord(fill).alpha(1).toRgbString()
        context.fill(rect)
        context.fillStyle = color ? color : defaultChartColors.includes(fill) ? defaultWhiteColor : readableTextColor(fill)
        context.fillText(
            message,
            round(x),
            round(y)
        )
    })
}

const drawClippedShape = ({ context, clip, stroke, fill, fillPath, strokePath }) => {
    context.fillStyle = fill
    context.lineWidth = stroke.thickness
    context.strokeStyle = stroke.color
    context.save()
    context.clip(clip)
    context.fill(fillPath)
    context.stroke(strokePath)
    context.restore()
}

const drawTooltip = ({ context, fill = defaultLabelFill, font = {}, messages, x, y }) => {
    const metrics = messages.map(message =>
        context.measureText(
            toUpper(message)
        )
    )

    const colWidth = odd(metrics.reduce((a, b) => Math.max(a, b.width), 0) * 1.2)
    const rowHeight = round((font.size || 12) * 2)
    const verticalOffset = 7

    const path = new Path2D()

    const xOrigin = x - colWidth / 2
    const yOrigin = y - rowHeight * messages.length - verticalOffset
    const rectWidth = colWidth
    const rectHeight = round(rowHeight * messages.length)

    path.roundRect(round(xOrigin), round(yOrigin), rectWidth, rectHeight, 5)

    path.moveTo(round((x - colWidth / 2) + 5), round(yOrigin + 2))
    path.lineTo(round((x + colWidth / 2) - 5), round(yOrigin + 2))
    path.lineTo(floor(x) + .5, floor(y - 2) + .5)
    path.closePath()

    context.fillStyle = fill
    context.fill(path)

    context.font = declareFont(font)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = defaultWhiteColor

    messages.forEach((message, row) =>
        context.fillText(
            message,
            round(x),
            round(yOrigin + rowHeight * row + rowHeight / 2)
        )
    )
}

const areaChart = ({
    context,
    data,
    timeScale,
    priceScale,
    chart,
    height
}) => {
    const ts = compose(round, timeScale, P.mts)
    const ps = compose(
        round,
        priceScale,
        price(chart.price)
    )
    const [ s, ...rest ] = data
    const e = last(rest)

    const x = ts(s)
    const y = ps(s)

    const m = ts(e)
    const n = ps(e)

    const fill = context.createLinearGradient(0, 0, 0, height)

    fill.addColorStop(0, chart.fill)
    fill.addColorStop(1, 'transparent')

    const strokePath = new Path2D()

    strokePath.moveTo(x, y)

    rest.forEach(d =>
        strokePath.lineTo(
            ts(d),
            ps(d)
        )
    )

    const fillPath = new Path2D(strokePath)

    fillPath.lineTo(m, height)
    fillPath.lineTo(x, height)

    context.fillStyle = fill
    context.strokeStyle = chart.stroke.color
    context.lineWidth = chart.stroke.thickness
    context.setLineDash(strokePattern.solid)
    context.lineJoin = 'round'

    context.fill(fillPath)
    context.stroke(strokePath)

    context.fillStyle = chart.stroke.color
    context.beginPath()
    context.arc(m, n, 2.5, 0, 2 * Math.PI)
    context.closePath()
    context.fill()
    context.stroke()
}

const barChart = ({ context, data, timeScale, priceScale, chart }) => {
    const interval = scaleTickInterval(o(timeScale, P.mts), data)
    const width = Math.max(odd(interval * .8), 1)
    const thickness = Math.max(chart.thin ? 1 : odd(interval * .3), 1)
    const offset = lineOffset(thickness)

    const paths = [ new Path2D(), new Path2D() ]

    const stroke = interval < width

    const ts = o(crisp(offset), timeScale)
    const ph = o(crisp(offset), priceScale)
    const pv = o(round, priceScale)

    if(stroke) {
        data.forEach(([ mts, open, close, high, low ], i) => {
            const color = Number(
                chart.previous && i > 0
                    ? P.close(data[ i - 1 ]) > close
                    : open > close
            )

            const x = ts(mts)
            const h = pv(high)
            const l = pv(low)

            const shl = Math.min(h, l)
            const ehl = Math.max(h, l)
            const o = shl === ehl ? 1 : 0

            paths[ color ].moveTo(x, shl)
            paths[ color ].lineTo(x, ehl + o)
        })
    } else {
        if(chart.hlc) {
            data.forEach(([ mts, open, close, high, low ], i) => {
                const x = ts(mts)
                const h = pv(high)
                const l = pv(low)
                const c = ph(close)

                const color = Number(
                    chart.previous && i > 0
                        ? P.close(data[ i - 1 ]) > close
                        : open > close
                )

                paths[ color ].moveTo(x, Math.min(h, l))
                paths[ color ].lineTo(x, Math.max(h, l))

                paths[ color ].moveTo(x - thickness / 2, c)
                paths[ color ].lineTo(x + width / 2, c)
            })
        } else {
            data.forEach(([ mts, open, close, high, low ], i) => {
                const x = ts(mts)
                const o = ph(open)
                const h = pv(high)
                const l = pv(low)
                const c = ph(close)

                const color = Number(
                    chart.previous && i > 0
                        ? P.close(data[ i - 1 ]) > close
                        : open > close
                )

                paths[ color ].moveTo(x - width / 2, o)
                paths[ color ].lineTo(x + thickness / 2, o)

                paths[ color ].moveTo(x, Math.min(h, l))
                paths[ color ].lineTo(x, Math.max(h, l))

                paths[ color ].moveTo(x - thickness / 2, c)
                paths[ color ].lineTo(x + width / 2, c)
            })
        }
    }

    context.lineWidth = thickness
    context.setLineDash(strokePattern.solid)

    paths.forEach((path, color) => {
        context.strokeStyle = chart.fill[ color ]
        context.stroke(path)
    })
}

const baselineChart = ({
    context,
    data,
    timeScale,
    priceScale,
    chart,
    width,
    height,
}) => {
    const ts = compose(round, timeScale, P.mts)
    const ps = compose(
        round,
        priceScale,
        price(chart.price)
    )

    const [ s, ...rest ] = data
    const e = last(rest)

    const x = ts(s)
    const y = ps(s)

    const m = ts(e)
    const n = ps(e)

    const k = round((1 - chart.level) * height)

    const stroke = chart[ n > k ? 'bottom' : 'top' ].stroke

    const strokePath = new Path2D()

    const topClip = new Path2D()
    const bottomClip = new Path2D()

    const topFill = context.createLinearGradient(0, 0, 0, k)
    const bottomFill = context.createLinearGradient(0, k, 0, height)

    topClip.rect(0, 0, width, k)
    bottomClip.rect(0, k, width, height)

    chart.top.fill.map((c, i) => topFill.addColorStop(i, colord(c).alpha(.5).toRgbString()))
    chart.bottom.fill.map((c, i) => bottomFill.addColorStop(i, colord(c).alpha(.5).toRgbString()))

    strokePath.moveTo(x, y)

    rest.map(d =>
        strokePath.lineTo(
            ts(d),
            ps(d)
        )
    )

    const fillPath = new Path2D(strokePath)

    fillPath.lineTo(m, k)
    fillPath.lineTo(x, k)

    context.setLineDash(strokePattern.solid)
    context.lineJoin = 'round'

    drawClippedShape({
        context: context,
        stroke: chart.top.stroke,
        fill: topFill,
        clip: topClip,
        fillPath: fillPath,
        strokePath: strokePath
    })

    drawClippedShape({
        context: context,
        stroke: chart.bottom.stroke,
        fill: bottomFill,
        clip: bottomClip,
        fillPath: fillPath,
        strokePath: strokePath
    })

    context.strokeStyle = defaultWhiteColor
    context.lineWidth = 1
    context.lineDashOffset = .5
    context.setLineDash(strokePattern.dotted)
    context.beginPath()
    context.moveTo(.5, k - .5)
    context.lineTo(width - .5, k - .5)
    context.stroke()

    context.fillStyle = stroke.color
    context.strokeStyle = stroke.color
    context.lineWidth = stroke.thickness
    context.lineDashOffset = 0
    context.setLineDash(strokePattern.solid)
    context.beginPath()
    context.arc(m, n, 2.5, 0, 2 * Math.PI)
    context.closePath()
    context.stroke()
    context.fill()
}

const OHLCChart = ({ context, data, timeScale, priceScale, chart }) => {
    const interval = round(
        scaleTickInterval(o(timeScale, P.mts), data)
    )
    const width = Math.max(odd(interval * .8), 1)
    const stroke = interval < width
    const bodyPaths = [ new Path2D(), new Path2D() ]
    const borderPaths = [ new Path2D(), new Path2D() ]
    const wickPaths = [ new Path2D(), new Path2D() ]

    const ts = o(crisp(.5), timeScale)
    const ps = o(round, priceScale)

    const draw = [
        [ 'body', stroke ? 'stroke' : 'fill', bodyPaths ],
        [ 'border', 'stroke', borderPaths ],
        [ 'wick', 'stroke', wickPaths ]
    ]

    const drawWick = ({ path, x, soc, eoc, shl, ehl }) => {
        path.moveTo(x, shl)
        path.lineTo(x, soc)
        path.moveTo(x, eoc)
        path.lineTo(x, ehl)
    }

    if(stroke) {
        data.forEach(([ mts, open, close, high, low ], i) => {
            const x = ts(mts)

            const color = Number(
                chart.previous && i > 0
                    ? P.close(data[ i - 1 ]) > close
                    : open > close
            )

            const o = ps(open)
            const h = ps(high)
            const l = ps(low)
            const c = ps(close)

            const shl = Math.min(h, l)
            const ehl = Math.max(h, l)

            const soc = Math.min(o, c)
            const eoc = Math.max(o, c)

            const offset = shl === ehl ? 1 : 0

            const eocOffset = eoc + offset
            const ehlOffset = ehl + offset

            bodyPaths[ color ].moveTo(x, soc)
            bodyPaths[ color ].lineTo(x, eocOffset)

            borderPaths[ color ].moveTo(x, soc)
            borderPaths[ color ].lineTo(x, eocOffset)

            drawWick({
                path: wickPaths[ color ],
                x: x,
                soc: soc,
                eoc: eocOffset,
                shl: shl,
                ehl: ehlOffset
            })
        })
    } else {
        data.forEach(([ mts, open, close, high, low ], i) => {
            const x = ts(mts)

            const color = Number(
                chart.previous && i > 0
                    ? P.close(data[ i - 1 ]) > close
                    : open > close
            )

            const o = ps(open)
            const h = ps(high)
            const l = ps(low)
            const c = ps(close)

            const shl = Math.min(h, l)
            const ehl = Math.max(h, l)

            const soc = Math.min(o, c)
            const eoc = Math.max(o, c)

            const xStart = x - width / 2
            const yStart = soc

            const height = absDiff(o, c)

            bodyPaths[ color ].rect(
                xStart,
                yStart,
                width,
                height
            )

            borderPaths[ color ].rect(
                xStart + .5,
                yStart + .5,
                width - 1,
                height - 1
            )

            drawWick({
                path: wickPaths[ color ],
                x: x,
                soc: soc,
                eoc: eoc,
                shl: shl,
                ehl: ehl
            })
        })
    }

    context.lineWidth = 1
    context.setLineDash(strokePattern.solid)

    draw.filter(([ key ]) => chart[ key ].value).forEach(([ key, type, paths ]) =>
        paths.forEach((path, idx) => {
            context[ type + 'Style' ] = chart[ key ].color[ idx ]
            context[ type ](path)
        })
    )
}

const columnChart = ({ context, data, timeScale, priceScale, chart, height }) => {
    const interval = scaleTickInterval(o(timeScale, P.mts), data)
    const width = Math.max(odd(interval - .5), 1)

    const paths = [ new Path2D(), new Path2D() ]

    const type = width < 3 ? 'stroke' : 'fill'

    const ts = compose(
        crisp(.5),
        timeScale,
        P.mts
    )

    const ps = compose(
        round,
        priceScale,
        price(chart.price)
    )

    if(type === 'stroke') {
        data.forEach((d, i) => {
            const color = Number(
                chart.previous && i > 0
                    ? P.close(data[ i - 1 ]) > P.close(d)
                    : P.open(d) > P.close(d)
            )

            const x = ts(d)
            const y = ps(d)

            paths[ color ].moveTo(x, y)
            paths[ color ].lineTo(x, height)
        })

    } else {
        data.forEach((d, i) => {
            const color = Number(
                chart.previous && i > 0
                    ? P.close(data[ i - 1 ]) > P.close(d)
                    : P.open(d) > P.close(d)
            )

            const x = ts(d)
            const y = ps(d)

            paths[ color ].rect(
                x - width / 2,
                y,
                width,
                height - y
            )
        })
    }

    context.lineWidth = 1
    context.setLineDash(strokePattern.solid)

    paths.forEach((path, color) => {
        context[ type + 'Style' ] = colord(chart.fill[ color ]).alpha(.5).toRgbString()
        context[ type ](path)
    })
}

const highLowTextScale = scaleLinear().rangeRound([ 10, 35 ]).clamp(true)

const highLowChart = ({ context, data, timeScale, priceScale, chart, width }) => {
    const interval = scaleTickInterval(o(timeScale, P.mts), data)
    const rectWidth = odd(interval * .8)
    const textSize = highLowTextScale(interval / (width / 2))
    const textOffset = round(textSize * .7)
    const showLabel = chart.label.value && rectWidth >= 30
    const stroke = rectWidth < 3
    const bodyPath = new Path2D()
    const borderPath = new Path2D()

    const ts = compose(
        crisp(.5),
        timeScale,
        P.mts
    )

    const ps = compose(
        round,
        priceScale
    )

    const draw = [
        [ 'body', stroke ? 'stroke' : 'fill', bodyPath ],
        [ 'border', 'stroke', borderPath ]
    ]

    if(stroke) {
        data.forEach(d => {
            const high = P.high(d)
            const low = P.low(d)

            const x = ts(d)
            const h = ps(high)
            const l = ps(low)

            const s = Math.min(h, l)
            const e = Math.max(h, l)

            const offset = s === e ? 1 : 0

            bodyPath.moveTo(x, s)
            bodyPath.lineTo(x, e + offset)

            borderPath.moveTo(x, s)
            borderPath.lineTo(x, e + offset)
        })
    } else {
        if(showLabel) {
            context.fillStyle = chart.label.color
            context.font = `500 ${pixelToRem(textSize)}rem ${defaultFont}`
            context.textAlign = 'center'
            context.textBaseline = 'middle'

            data.forEach(d => {
                const high = P.high(d)
                const low = P.low(d)

                const x = ts(d)
                const h = ps(high)
                const l = ps(low)

                const xr = round(x)

                const xs = x - rectWidth / 2

                const ys = Math.min(h, l)

                const rectHeight = absDiff(h, l)

                bodyPath.rect(xs, ys, rectWidth, rectHeight)

                borderPath.rect(xs + .5, ys + .5, rectWidth - 1, rectHeight - 1)

                context.fillText(
                    high,
                    xr,
                    h + textOffset * (h < l ? -1 : 1)
                )

                context.fillText(
                    low,
                    xr,
                    l + textOffset * (l < h ? -1 : 1)
                )
            })
        } else {
            data.forEach(d => {
                const high = P.high(d)
                const low = P.low(d)

                const h = ps(high)
                const l = ps(low)

                const xs = ts(d) - rectWidth / 2
                const ys = Math.min(h, l)

                const rectHeight = absDiff(h, l)

                bodyPath.rect(xs, ys, rectWidth, rectHeight)

                borderPath.rect(xs + .5, ys + .5, rectWidth - 1, rectHeight - 1)
            })
        }
    }

    context.lineWidth = 1
    context.setLineDash(strokePattern.solid)

    draw.filter(([ key ]) => chart[ key ].value).forEach(([ key, type, path ]) => {
        context[ type + 'Style' ] = chart[ key ].color
        context[ type ](path)
    })
}

const HLCChart = ({ context, data, timeScale, priceScale, chart, height, order }) => {
    const ts = compose(round, timeScale, P.mts)
    const ps = o(round, priceScale)
    const [ min, max ] = order < 0 ? ([ 0, height ]) : ([ height, 0 ])
    const [ s, ...rest ] = data
    const e = last(rest)

    const x = ts(s)

    const h = ps(
        P.high(s)
    )
    const l = ps(
        P.low(s)
    )
    const c = ps(
        P.close(s)
    )

    const m = ts(e)

    const highStroke = new Path2D()
    const lowStroke = new Path2D()
    const closeStroke = new Path2D()

    highStroke.moveTo(x, h)
    lowStroke.moveTo(x, l)
    closeStroke.moveTo(x, c)

    rest.forEach(d => {
        const x = ts(d)

        highStroke.lineTo(
            x,
            ps(
                P.high(d)
            )
        )
        lowStroke.lineTo(
            x,
            ps(
                P.low(d)
            )
        )
        closeStroke.lineTo(
            x,
            ps(
                P.close(d)
            )
        )
    })

    const highClip = new Path2D(highStroke)
    const lowClip = new Path2D(lowStroke)

    const highFill = new Path2D(closeStroke)
    const lowFill = new Path2D(closeStroke)

    highClip.lineTo(m, min)
    highClip.lineTo(x, min)

    lowClip.lineTo(m, max)
    lowClip.lineTo(x, max)

    highFill.lineTo(m, max)
    highFill.lineTo(x, max)

    lowFill.lineTo(m, min)
    lowFill.lineTo(x, min)

    context.save()
    context.clip(highClip)
    context.clip(lowClip)
    context.fillStyle = head(chart.fill)
    context.fill(highFill)
    context.fillStyle = last(chart.fill)
    context.fill(lowFill)
    context.restore()

    context.setLineDash(strokePattern.solid)
    context.lineJoin = 'round'

    context.lineWidth = chart.close.thickness
    context.strokeStyle = chart.close.color
    context.stroke(closeStroke)

    context.lineWidth = chart.high.thickness
    context.strokeStyle = chart.high.color
    context.stroke(highStroke)

    context.lineWidth = chart.low.thickness
    context.strokeStyle = chart.low.color
    context.stroke(lowStroke)
}

const lineChart = ({ context, data, timeScale, priceScale, chart }) => {
    const ts = compose(round, timeScale, P.mts)
    const ps = compose(
        round,
        priceScale,
        price(chart.price)
    )
    const [ s, ...rest ] = data
    const e = last(data)

    context.beginPath()
    context.moveTo(
        ts(s),
        ps(s)
    )

    rest.map(d =>
        context.lineTo(
            ts(d),
            ps(d)
        )
    )

    context.lineWidth = chart.stroke.thickness
    context.strokeStyle = chart.stroke.color
    context.setLineDash(strokePattern.solid)
    context.lineJoin = 'round'
    context.stroke()

    context.fillStyle = chart.stroke.color
    context.beginPath()
    context.arc(
        ts(e),
        ps(e),
        2.5,
        0,
        2 * Math.PI
    )
    context.closePath()
    context.stroke()
    context.fill()
}

const markerChart = ({ context, data, timeScale, priceScale, chart, width, height }) => {
    const ts = compose(round, timeScale, P.mts)
    const ps = compose(
        round,
        priceScale,
        price(chart.price)
    )
    if(scaleTickInterval(o(timeScale, P.mts), data) > 20) {
        const linePath = new Path2D()
        const arcPath = new Path2D()

        const [ s, ...rest ] = data

        const r = 5 * (1 + (chart.stroke.thickness / 4) - 0.25)

        const x = ts(s)
        const y = ps(s)

        linePath.moveTo(x, y)
        arcPath.arc(x, y, 5, 0, 2 * Math.PI)
        arcPath.closePath()

        rest.forEach(d => {
            const x = ts(d)
            const y = ps(d)

            linePath.lineTo(x, y)
            arcPath.arc(x, y, r, 0, 2 * Math.PI)
            arcPath.closePath()
        })

        context.fillStyle = chart.stroke.color
        context.strokeStyle = chart.stroke.color
        context.lineWidth = chart.stroke.thickness
        context.setLineDash(strokePattern.solid)
        context.lineJoin = 'round'

        context.stroke(linePath)
        context.fill(arcPath)

    } else {
        lineChart({
            context,
            data,
            chart,
            timeScale,
            priceScale,
            width,
            height
        })
    }
}

const stepChart = ({ context, data, timeScale, priceScale, chart }) => {
    const offset = lineOffset(chart.stroke.thickness)
    const ts = o(timeScale, P.mts)
    const ps = compose(
        crisp(offset),
        priceScale,
        price(chart.price)
    )

    const halfWidth = scaleTickInterval(ts, data) / 2

    const [ s, ...rest ] = data

    const e = last(data)

    const x = ts(s)
    const y = ps(s)

    const m = ts(e)
    const n = ps(e)

    context.beginPath()
    context.moveTo(round(x - halfWidth), y)
    context.lineTo(floor(x + halfWidth) + offset, y)

    rest.forEach(d => {
        const x = ts(d)
        const y = ps(d)

        context.lineTo(floor(x - halfWidth) + offset, y)
        context.lineTo(Math.min(round(m), floor(x + halfWidth) + offset), y)
    })

    context.fillStyle = chart.stroke.color
    context.lineWidth = chart.stroke.thickness
    context.strokeStyle = chart.stroke.color
    context.setLineDash(strokePattern.solid)
    context.lineJoin = 'round'
    context.stroke()

    context.beginPath()
    context.arc(round(m), round(n), 2.5, 0, 2 * Math.PI)
    context.closePath()
    context.fill()
    context.stroke()
}

const charts = [
    areaChart,
    barChart,
    baselineChart,
    OHLCChart,
    columnChart,
    OHLCChart,
    highLowChart,
    HLCChart,
    OHLCChart,
    lineChart,
    markerChart,
    stepChart
]

const drawChart = curry((type, chart) =>
    charts[ type ](chart)
)

export {
    P,
    priceSources,
    extractFontSize,
    defaultWhiteColor,
    defaultBlueColor,
    remToPixel,
    pixelToRem,
    isLine,
    isOHLC,
    defaultChartColors,
    defaultUpColor,
    defaultFont,
    defaultDownColor,
    isHeikinashi,
    defaultXTickSpace,
    defaultYTickSpace,
    defaultColor,
    defaultLabelFill,
    price,
    priceExtent,
    isLinesOverlap,
    sortLabel,
    adjustLabel,
    types,
    drawChart,
    drawLines,
    drawMultiLines,
    drawPulse,
    drawTexts,
    drawLabels,
    drawTooltip,
    areaChart,
    barChart,
    baselineChart,
    columnChart,
    highLowChart,
    HLCChart,
    lineChart,
    markerChart,
    OHLCChart,
    stepChart,
    textSizes,
    dataTimeInterval,
    formatTimeTicks,
    textScale,
    chartPriceColor,
    strokePattern
}

