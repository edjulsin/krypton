import React, { useCallback, useState } from 'react'
import Select from './Select'
import { useEffect } from './hooks'
import { appendClassName, batch, fetchJSON, getNodeHeight, getNodeWidth, noPropagation, pixelToRem, resizeObserver, splitSymbol } from '../utils'
import { assoc, assocPath, compose, curry, hasPath, head, isEmpty, isNil, keys, last, nth, o, path, prop, reduce, toUpper, update, values, zipWith } from 'ramda'
import Icon from './Icon'
import Button from './Button'
import CryptoIcon from './CryptoIcon'

const formatPrice = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 8 }).format

const formatVolume = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, roundingMode: 'trunc' }).format

const formatChange = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'never', roundingMode: 'trunc' }).format

const formatChangeRelative = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'never', roundingMode: 'trunc' }).format

const P = {
    symbol: nth(0),
    bid: nth(1),
    ask: nth(3),
    change: nth(5),
    changeRelative: nth(6),
    price: nth(7),
    volume: nth(8),
    high: nth(9),
    low: nth(10)
}

const extractSymbol = o(splitSymbol, P.symbol)

const symbolName = o(head, extractSymbol)

const priceName = o(last, extractSymbol)

const exchangeVolume = curry((rate, currency, data) =>
    P.volume(data) * (currency === 'SELF' ? 1 : rate[ symbolName(data) ][ currency ])
)

const prices = [
    'any',
    'usd',
    'btc',
    'eur',
    'jpy',
    'eth',
    'gbp',
    'usdt',
    'cnht',
    'eurt',
    'xaut',
    'mim',
    'mxnt',
    'try'
].map(toUpper)

const defaultPrice = 'ANY'

const volumes = [ 'self', 'btc', 'usd', 'eth', 'try', 'jpy' ].map(toUpper)

const volumesIndex = {
    SELF: 0,
    BTC: 1,
    USD: 2,
    ETH: 3,
    TRY: 4,
    JPY: 5
}

const defaultVolume = 'USD'

const defaultListHeight = 25

const TableStat = ({ rate, maps, volume, data }) => {
    const color = P.change(data) > 0 ? 'up' : 'down'
    return (
        <ul className='table-stat'>
            <li className='table-stat-item'>
                <span className='table-stat-value'>
                    { extractSymbol(data).map(v => maps[ v ] || v).join('/') }
                </span>
            </li>
            <li className='table-stat-item'>
                <span className='table-stat-value'>
                    {
                        formatPrice(
                            P.price(data)
                        )
                    }
                </span>
            </li>
            <li className='table-stat-item'>
                <span className='table-stat-label'>
                    VOL
                </span>
                <span className='table-stat-value'>
                    {
                        formatVolume(
                            exchangeVolume(rate, volume, data)
                        )
                    }
                </span>
                <span className='table-stat-label'>
                    { volume }
                </span>
            </li>
            <li className={
                appendClassName(
                    'table-stat-item',
                    `table-stat-${color}`
                )
            }>
                <span className='table-stat-value'>
                    {
                        formatChange(
                            P.change(data)
                        )
                    }
                </span>
                <span className='table-stat-value'>
                </span>
                <span className='table-stat-value'>
                    {
                        formatChangeRelative(
                            P.changeRelative(data)
                        )
                    }
                </span>
            </li>
            <li className='table-stat-item'>
                <span className='table-stat-label'>
                    LOW
                </span>
                <span className='table-stat-value'>
                    {
                        formatPrice(
                            P.low(data)
                        )
                    }
                </span>
            </li>
            <li className='table-stat-item'>
                <span className='table-stat-label'>
                    HIGH
                </span>
                <span className='table-stat-value'>
                    {
                        formatPrice(
                            P.high(data)
                        )
                    }
                </span>
            </li>
        </ul>
    )
}

const TableInfo = ({ rate, maps, volume, data }) => (
    <div className='table-info'>
        <CryptoIcon size={ 32 } name={ maps[ symbolName(data) ] || symbolName(data) } />
        <TableStat rate={ rate } maps={ maps } volume={ volume } data={ data } />
    </div>
)

const TableInput = ({ input, setInput }) => (
    <div className='table-input'>
        <input
            title='Search Trading Pair'
            id='table-input-form'
            className='table-input-form'
            type='text'
            value={ input }
            onChange={ e => setInput(e.target.value + '') }
        />
        <Button onClick={ () => setInput(input ? '' : input) }>
            <Icon name={ input ? 'close' : 'search' } />
        </Button>
    </div>
)

const TableSelect = ({ container, price, setPrice }) => {
    const [ control, setControl ] = useState({})

    const onMouseLeave = () => setControl({
        visible: false,
        transition: false
    })

    return (
        <Select
            container={ container }
            control={ control }
            direction='bottom'
            alignment='center'
            onMouseLeave={ onMouseLeave }
            data={
                prices.map(text => {
                    return {
                        center: toUpper(text),
                        highlighted: text === price,
                        onClick: () => setPrice(text)
                    }
                })
            }
            preview={ toUpper(price) }
        />
    )
}

const TableForm = ({ container, form, setForm }) => {
    const setInput = o(
        setForm,
        assoc('symbol')
    )
    const setPrice = o(
        setForm,
        assoc('price')
    )
    const setFavorited = o(
        setForm,
        assoc('favorited')
    )
    return (
        <div className='table-form'>
            <TableInput
                input={ form.symbol }
                setInput={ setInput }
            />
            <TableSelect
                container={ container }
                price={ form.price }
                setPrice={ setPrice }
            />
            <Button title='Show Favorites' display='inline' onClick={ () => setFavorited(!form.favorited) }>
                <Icon name={ form.favorited ? 'blackstar' : 'whitestar' } />
            </Button>
        </div>
    )
}

const TableHeader = ({ sort, setSort, volume, setVolume }) => {
    const Sort = ({ order }) => (
        <span
            className={ 'table-header-' + (order === 0 ? 'sort' : order > 0 ? 'asc' : 'dsc') }
        >
        </span>
    )

    const Item = ({ name, order, onClick }) => (
        <li className='table-header-item'>
            <Button size='big' onClick={ onClick } >
                <span className='table-header-split'>
                    <span className='table-header-name'>
                        { name }
                    </span>
                    <Sort order={ order } />
                </span>
            </Button>
        </li>
    )

    const sortBy = name => setSort(({ prop, order }) => {
        return {
            prop: name,
            order: name === prop ? (order > 0 ? -1 : order + 1) : 1
        }
    })

    const changeVolume = () => setVolume(volume => {
        const position = volumesIndex[ volume ]
        const index = position + 1 === volumes.length ? 0 : position + 1
        return volumes[ index ]
    })

    const sortByVolume = () => sortBy('volume')

    return (
        <menu className='table-header'>
            <Item name='NAME' order={ sort.prop === 'symbol' ? sort.order : 0 } onClick={ () => sortBy('symbol') } />
            <Item name='LAST' order={ sort.prop === 'price' ? sort.order : 0 } onClick={ () => sortBy('price') } />
            <Item name='24H' order={ sort.prop === 'changeRelative' ? sort.order : 0 } onClick={ () => sortBy('changeRelative') } />
            <li className='table-header-item'>
                <Button
                    size='big'
                    onClick={ sortByVolume }
                >
                    <span className='table-header-split'>
                        <span className='table-header-name'>
                            VOL
                        </span>
                        <span
                            className='table-header-volume'
                            onClick={ noPropagation(changeVolume) }
                        >
                            { volume }
                        </span>
                        <Sort order={ sort.prop === 'volume' ? sort.order : 0 } />
                    </span>
                </Button>
            </li>
        </menu >
    )
}

const TableList = ({ rate, maps, filter, sort, volume, data, onSelect }) => {
    const [ container, setContainer ] = useState({})
    const [ [ start, end ], setSlice ] = useState(() =>
        ([ 0, data.length ])
    )

    const [ columns, setColumns ] = useState([ 0, 0, 0, 0 ])

    const [ favorite, setFavorite ] = useState(() =>
        data.reduce((a, b) => ({
            ...a,
            [ extractSymbol(b).map(v => maps[ v ] || v).map(toUpper).join('') ]: false
        }), {})
    )

    const onScroll = ({ target }) => setSlice(() => {
        const start = Math.max(
            0,
            Math.floor(target.scrollTop / defaultListHeight) - 1
        )
        const end = Math.min(
            data.length,
            start + Math.ceil(getNodeHeight(target) / defaultListHeight) + 2
        )
        return [ start, end ]
    })

    useEffect(container => {
        const subscription = resizeObserver([ container ]).subscribe(() =>
            onScroll({ target: container })
        )

        setColumns(() => {
            const elements = [ ...container.firstElementChild.children ]
            const columns = elements.reduce(
                (a, b) => zipWith(Math.max, [ ...b.firstElementChild.firstElementChild.children ].map(getNodeWidth), a),
                [ 0, 0, 0, 0 ]
            )
            return columns.map(Math.round)
        })

        return () => subscription.unsubscribe()
    }, [ container ])

    const filtered = data.filter(value => {
        const [ symbol, price ] = extractSymbol(value).map(v => maps[ v ] || v).map(toUpper)
        const [ sFilter, pFilter ] = [ filter.symbol, filter.price === 'ANY' ? '' : filter.price ].map(toUpper)
        const matchBySymbol = (symbol + price).includes(sFilter)
        const matchByPrice = price.endsWith(pFilter)
        const matchByFavorite = !filter.favorited || filter.favorited === favorite[ symbol + price ]
        return matchBySymbol && matchByPrice && matchByFavorite
    })

    const fn = sort.prop === 'volume'
        ? exchangeVolume(rate, volume)
        : sort.prop === 'symbol' ? symbolName : P[ sort.prop ]

    const sorted = sort.order === 0
        ? filtered
        : filtered.toSorted(
            sort.order === 1
                ? (a, b) => fn(a) > fn(b) ? 1 : -1
                : (a, b) => fn(b) > fn(a) ? 1 : -1
        )

    const sliced = sorted.slice(start, end)

    const gridTemplateColumns = columns
        .map(v => v > 0 ? pixelToRem(v) + 'rem' : 'auto')
        .join(' ')

    return (
        <div
            className='table-list'
            ref={ setContainer }
            onScroll={ onScroll }
        >
            <menu className='table-list-menu' style={ { height: pixelToRem(filtered.length * defaultListHeight) + 'rem' } }>
                {
                    sliced.map((value, i) => {
                        const [ symbol, price ] = extractSymbol(value).map(v => maps[ v ] || v)
                        const duplicated = i > 0 ? symbol === extractSymbol(sliced[ i - 1 ]).map(v => maps[ v ] || v).at(0) : false
                        const id = toUpper(symbol + price)
                        const favorited = favorite[ id ]
                        return (
                            <li
                                className='table-list-item'
                                key={ id }
                                style={ {
                                    top: pixelToRem((start + i) * defaultListHeight) + 'rem',
                                    height: pixelToRem(defaultListHeight) + 'rem'
                                } }
                            >
                                <Button
                                    display='block'
                                    color='white'
                                    onClick={ () => onSelect(value) }
                                >
                                    <span
                                        className='table-list-grid'
                                        style={ {
                                            display: 'grid',
                                            gridTemplateColumns: gridTemplateColumns
                                        } }
                                    >
                                        <span className='table-list-symbol'>
                                            <span className='table-list-icon'>
                                                { duplicated ? null : <CryptoIcon size={ 16 } name={ symbol } /> }
                                            </span>
                                            <span className='table-list-name'>
                                                { duplicated ? null : symbol }
                                            </span>
                                        </span>
                                        <span className='table-list-price'>
                                            <span className='table-list-value'>
                                                {
                                                    formatPrice(
                                                        P.price(value)
                                                    )
                                                }
                                            </span>
                                            <span className='table-list-currency'>
                                                { price }
                                            </span>
                                        </span>
                                        <span className={
                                            appendClassName(
                                                'table-list-change',
                                                `table-list-${P.changeRelative(value) > 0 ? 'up' : 'down'}`
                                            )
                                        }>
                                            {
                                                formatChangeRelative(
                                                    P.changeRelative(value)
                                                )
                                            }
                                        </span>
                                        <span className='table-list-volume'>
                                            {
                                                formatVolume(
                                                    exchangeVolume(rate, volume, value)
                                                )
                                            }
                                        </span>
                                    </span>
                                </Button>
                                <Button title='Add To Favorites' onClick={ () => setFavorite({ ...favorite, [ id ]: !favorited }) }>
                                    <Icon name={ favorited ? 'blackstar' : 'whitestar' } />
                                </Button>
                            </li>
                        )
                    })
                }
            </menu>
        </div>
    )
}

const Table = ({ maps, onSymbolChange }) => {
    const [ container, setContainer ] = useState({})
    const [ data, setData ] = useState([])
    const [ rate, setRate ] = useState({})
    const [ selected, setSelected ] = useState([])
    const [ volume, setVolume ] = useState(defaultVolume)
    const [ filter, setFilter ] = useState({ symbol: '', price: defaultPrice, favorited: false })
    const [ sort, setSort ] = useState({ prop: '', order: 0 })


    const onSelect = useCallback(batch([
        setSelected,
        o(onSymbolChange, P.symbol)
    ]), [])

    useEffect(() => {
        const symbols = () => fetchJSON('/conf/pub:list:pair:exchange').then(([ symbols ]) =>
            new Set(symbols)
        )

        const data = () => fetchJSON('/tickers?symbols=ALL')

        const table = reduce((acc, curr) =>
            assocPath(extractSymbol(curr), curr, acc)
        )

        const stream = () =>
            Promise.all([ symbols(), data() ]).then(([ symbols, data ]) =>
                data.filter(v => {
                    const symbol = P.symbol(v).slice(1)
                    return !symbol.includes('TEST') && !symbol.includes('ALT') && symbols.has(symbol)
                })
            ).then(v => {
                const formatted = table({}, v)
                const symbols = Object.keys(formatted).reduce((arr, key) => {
                    if('USD' in formatted[ key ]) {
                        return arr
                    } else {
                        return arr.concat([ 't' + key + (key.length > 3 ? ':' : '') + 'USD' ])
                    }
                }, [])
                if(symbols.length) {
                    const fix = v => v.map(v => {
                        if(isNil(P.price(v))) {
                            return update(7, P.ask(v) || P.bid(v) || 0, v)
                        } else {
                            return v
                        }
                    })
                    return fetchJSON('/tickers?symbols=' + symbols.join(',')).then(fix).then(
                        table(formatted)
                    )
                } else {
                    return formatted
                }
            }).then(table => {
                const data = values(table).filter(obj =>
                    Object.values(obj).some(v =>
                        P.volume(v) >= .1
                    )
                ).flatMap(values).filter(v =>
                    !v.includes(null)
                )

                const vols = volumes.slice(1)
                const exchange = {
                    UST: {
                        BTC: 1 / P.price(table.BTC.UST),
                        USD: P.price(table.UST.USD),
                        ETH: 1 / P.price(table.ETH.UST),
                        TRY: 1 / P.price(table.TRY.UST),
                        JPY: 1 / P.price(table.JPY.UST)
                    },
                    BTC: {
                        BTC: 1,
                        USD: P.price(table.BTC.USD),
                        ETH: 1 / P.price(table.ETH.BTC),
                        TRY: P.price(table.BTC.TRY),
                        JPY: P.price(table.BTC.JPY)
                    },
                    USD: {
                        BTC: 1 / P.price(table.BTC.USD),
                        USD: 1,
                        ETH: 1 / P.price(table.ETH.USD),
                        TRY: 1 / P.price(table.TRY.USD),
                        JPY: 1 / P.price(table.JPY.USD)
                    }
                }

                const rate = keys(table).reduce((acc, symbol) => ({
                    ...acc,
                    [ symbol ]: vols.reduce((obj, volume) => {
                        if(symbol === volume) {
                            return { ...obj, [ volume ]: 1 }
                        } else {
                            const strategies = [
                                [ [ symbol, volume ], () => P.price(table[ symbol ][ volume ]) ],
                                [ [ volume, symbol ], () => 1 / P.price(table[ volume ][ symbol ]) ],
                                [ [ symbol, 'UST' ], () => P.price(table[ symbol ].UST) * exchange.UST[ volume ] ],
                                [ [ symbol, 'BTC' ], () => P.price(table[ symbol ].BTC) * exchange.BTC[ volume ] ],
                                [ [ symbol, 'USD' ], () => P.price(table[ symbol ].USD) * exchange.USD[ volume ] ],
                            ]
                            return {
                                ...obj,
                                [ volume ]: strategies.find(([ path ]) => hasPath(path, table))?.at(1)() ?? 0
                            }
                        }
                    }, {})
                }), {})

                return { table, rate, data }
            })

        const updateSelected = table => setSelected(value =>
            path(extractSymbol(value), table)
        )

        const init = () => stream().then(
            batch([
                compose(
                    setRate,
                    prop('rate')
                ),
                compose(
                    setData,
                    prop('data')
                ),
                compose(
                    setSelected,
                    head,
                    prop('data')
                ),
                compose(
                    onSymbolChange,
                    P.symbol,
                    head,
                    prop('data')
                )
            ])
        )

        const task = () => stream().then(
            batch([
                compose(
                    updateSelected,
                    prop('table')
                ),
                compose(
                    setRate,
                    prop('rate')
                ),
                compose(
                    setData,
                    prop('data')
                )
            ])
        )

        const noop = () => { }

        const interval = init().then(() =>
            setInterval(() => task().catch(noop), 15000)
        )

        return () => interval.then(clearInterval).catch(noop)
    }, [])

    return (
        <div
            ref={ setContainer }
            id='table'
            className='table'
        >
            {
                isEmpty(selected)
                    ? null
                    : (
                        <>
                            <TableInfo
                                volume={ volume }
                                data={ selected }
                                rate={ rate }
                                maps={ maps }

                            />
                            <TableForm
                                container={ container }
                                form={ filter }
                                setForm={ setFilter }
                            />
                            <TableHeader
                                sort={ sort }
                                setSort={ setSort }
                                volume={ volume }
                                setVolume={ setVolume }
                            />
                            <TableList
                                rate={ rate }
                                volume={ volume }
                                maps={ maps }
                                filter={ filter }
                                data={ data }
                                onSelect={ onSelect }
                                sort={ sort }
                            />
                        </>
                    )
            }
        </div>
    )
}

export default Table