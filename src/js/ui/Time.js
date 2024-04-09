import React from 'react'

import { identity, compose, last, head, slice, juxt, eqBy, join, equals, o, map, curry, isNil, not, filter, allPass, chain, clamp, all, split, __, take, prop, path, add, props, apply, adjust, useWith, multiply, nth } from 'ramda'
import { useState } from 'react'
import { constrain, appendClassName, capitalizeWord, capitalizeWords, daysToMilliseconds, millisecondsToClock, minutesToMilliseconds, noDefault, now, propEqual, rangeGenerator, zipWithCall } from '../utils'

import Button from './Button'
import { useEffect } from './hooks'
import Icon from './Icon'
import { ToggleMenuPlacements } from './Placement'

const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december'
]

const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
]

const utc = (...time) => {
    const value = new Date(...time)
    return {
        year: value.getUTCFullYear(),
        month: value.getUTCMonth(),
        date: value.getUTCDate(),
        hours: value.getUTCHours(),
        minutes: value.getUTCMinutes(),
        seconds: value.getUTCSeconds(),
        milliseconds: value.getUTCMilliseconds(),
        day: value.getUTCDay(),
        monthString: months[ value.getUTCMonth() ],
        dayString: days[ value.getUTCDay() ],
        time: value.getTime()
    }
}

const day = daysToMilliseconds(1)

const minute = minutesToMilliseconds(1)

const getCalendarStart = start =>
    days[ new Date(start).getUTCDay() ] === 'sunday'
        ? start
        : getCalendarStart(start - day)

const getCalendarEnd = end =>
    days[ new Date(end).getUTCDay() ] === 'saturday'
        ? end
        : getCalendarEnd(end + day)

const getCalendar = value => {
    const { year, month } = utc(value)
    const start = getCalendarStart(
        Date.UTC(year, month, 1)
    )
    const end = getCalendarEnd(
        Date.UTC(year, month + 1, 0)
    )
    return rangeGenerator(v => v + day, start, end)
}

const formatDay = o(
    capitalizeWord,
    slice(0, 3)
)

const defaultDate = new Date().setUTCHours(0, 0, 0, 0)
const defaultMin = 0
const defaultMax = Infinity
const defaultStep = 1

const defaultClockStep = 15

const defaultOnChange = identity

const sameMonth = eqBy(
    o(
        props([ 'year', 'month' ]),
        utc
    )
)

const sameDate = eqBy(
    o(
        props([ 'year', 'month', 'date' ]),
        utc
    )
)

const normalizeValue = value => {
    const parsed = new Date(value).setUTCHours(0, 0, 0, 0)
    return isNaN(parsed) ? value : parsed
}

const constrainDate = useWith(constrain, [
    normalizeValue,
    normalizeValue,
    multiply(day),
    normalizeValue
])

const TimeCalendar = ({
    defaultValue = defaultDate,
    value = null,
    min = defaultMin,
    max = defaultMax,
    step = defaultStep,
    onChange = defaultOnChange,
    className = '',
    ...attributes
}) => {

    const [ selected, setSelected ] = useState(defaultValue)

    const [ calendar, setCalendar ] = useState(() =>
        generateCalendar({
            min: min,
            max: max,
            step: step,
            value: defaultValue,
            date: defaultValue,
            today: now()
        })
    )

    const refValue = isNil(value) ? selected : value

    const refCallback = isNil(value) ? setSelected : onChange

    function generateCalendar({ today, min, max, step, date, value }) {
        return getCalendar(value).map(ms => {
            return {
                value: ms,
                date: new Date(ms).getUTCDate(),
                highlighted: sameDate(date, ms),
                underlined: sameDate(today, ms),
                disabled: sameMonth(value, ms)
                    ? constrainDate(min, max, step, ms) !== ms
                    : true
                ,
                onClick: () => refCallback(ms)
            }
        })
    }

    const getCalendarTitle = compose(
        capitalizeWords,
        join(' '),
        juxt([
            prop('monthString'),
            prop('year')
        ]),
        utc,
        prop('value'),
        nth(15)
    )

    const onMonthChange = ({ min, max, step, value, date }, _) => {
        setCalendar(
            generateCalendar({
                today: now(),
                min: min,
                max: max,
                step: step,
                value: value,
                date: date
            })
        )
    }

    const onDecrement = _ => onMonthChange({ min, max, step, value: head(calendar).value - day, date: refValue })

    const onIncrement = _ => onMonthChange({ min, max, step, value: last(calendar).value + day, date: refValue })

    useEffect(setSelected, [ defaultValue ])

    useEffect((min, max, step, value) => setCalendar(
        generateCalendar({
            today: now(),
            min: min,
            max: max,
            step: step,
            value: value,
            date: value
        })
    ), [ min, max, step, refValue ])

    return (
        <div
            className={ appendClassName('time-calendar', className) }
            { ...attributes }
        >
            <div className='time-calendar-months'>
                <Button
                    title='Previous Month'
                    outlined={ true }
                    size='big'
                    onClick={ onDecrement }
                >
                    <Icon name='angleleft' />
                </Button>
                <span className='time-calendar-month'>
                    { getCalendarTitle(calendar) }
                </span>
                <Button
                    title='Next Month'
                    outlined={ true }
                    size='big'
                    onClick={ onIncrement }
                >
                    <Icon name='angleright' />
                </Button>
            </div>
            <ul className='time-calendar-days'>
                {
                    days.map(day =>
                        <li
                            key={ day }
                            className='time-calendar-day'
                        >
                            { formatDay(day) }
                        </li>
                    )
                }
            </ul>
            <menu className='time-calendar-dates'>
                {
                    calendar.map(({
                        value,
                        date,
                        highlighted,
                        underlined,
                        disabled,
                        onClick
                    }) =>
                        <li
                            key={ value }
                            className='time-calendar-date'
                        >
                            <Button
                                display='block'
                                highlighted={ highlighted }
                                underlined={ underlined }
                                disabled={ disabled }
                                onClick={ onClick }
                            >
                                { date }
                            </Button>
                        </li>
                    )
                }
            </menu>
        </div>
    )
}

const TimeClock = ({
    defaultValue = defaultDate,
    value = null,
    min = defaultMin,
    max = defaultMax,
    step = defaultClockStep,
    disabled = true,
    onChange = defaultOnChange,
    ...attributes
}) => {
    const [ time, setTime ] = useState(defaultValue)

    const [ highlighted, setHighlighted ] = useState(false)

    const refValue = isNil(value) ? time : value

    const refCallback = isNil(value) ? setTime : onChange

    const getMenu = curry((min, max, step, value) => {
        const s = clamp(minute, day, minute * step)
        const b = normalizeValue(value)
        return rangeGenerator(add(s), 0, day - s)
            .map(ms => {
                return {
                    center: millisecondsToClock(ms).slice(0, -3),
                    highlighted: equals(value, b + ms),
                    disabled: clamp(min, max, b + ms) !== b + ms,
                    onClick: () => refCallback(b + ms)
                }
            })
    })

    const onToggle = compose(
        setHighlighted,
        prop('visible')
    )


    const menu = getMenu(min, max, step, refValue)

    useEffect(setTime, [ defaultValue ])

    return (
        <ToggleMenuPlacements
            data={ menu }
            onToggle={ onToggle }
            { ...attributes }
        >
            <Button
                display='block'
                size='wide'
                disabled={ disabled }
                highlighted={ highlighted }
                outlined={ true }
            >
                <span className='time-clock'>
                    <span className='time-clock-preview'>
                        { millisecondsToClock(refValue).slice(0, -3) }
                    </span>
                    <span className='time-clock-icon'>
                        <Icon name='clock' />
                    </span>
                </span>
            </Button>
        </ToggleMenuPlacements>
    )
}

const clampMonth = clamp(1, 12)

const clampFullYear = clamp(1970, Infinity)

const clampDate = clamp(1, 31)

const isInteger = Number.isInteger

const validateFullYear = allPass([
    isInteger,
    compose(not, isNaN, Date.parse),
    chain(equals, clampFullYear)
])

const validateMonth = allPass([
    isInteger,
    chain(equals, clampMonth)
])

const validateDate = allPass([
    isInteger,
    chain(equals, clampDate)
])

const allowedChars = [
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

const sanitize = compose(
    join(''),
    filter(v => allowedChars.includes(v)),
    split('')
)

const sanitizeDateInput = compose(
    join('-'),
    map(sanitize),
    take(3),
    split('-'),
    v => v + ''
)

const validateDateInput = compose(
    allPass([
        propEqual('length', 3),
        all(v => v),
    ]),
    zipWithCall([
        validateFullYear,
        validateMonth,
        validateDate
    ]),
    map(Number),
    split('-'),
    v => v + ''
)

const valueToString = compose(
    join('-'),
    map(v => v < 10 ? '0' + v : v + ''),
    juxt([
        prop('year'),
        compose(
            add(1),
            prop('month')
        ),
        prop('date')
    ]),
    utc
)

const stringToValue = compose(
    apply(Date.UTC),
    adjust(1, add(-1)),
    map(Number),
    split('-')
)

const TimeDate = ({
    title = '',
    id = '',
    className = '',
    defaultValue = defaultDate,
    value = null,
    focus = false,
    onChange = null,
    min = defaultMin,
    max = defaultMax,
    step = defaultStep,
    ...attributes
}) => {

    const [ ref, setRef ] = useState({})

    const [ input, setInput ] = useState('')

    const setInputFromValue = compose(
        setInput,
        valueToString,
        normalizeValue
    )

    const refValue = isNil(value) ? defaultValue : value

    const refCallback = isNil(value) ? setInputFromValue : onChange

    const onInputChange = compose(
        setInput,
        sanitizeDateInput,
        path([ 'target', 'value' ])
    )

    const formatValue = compose(
        constrainDate(min, max, step),
        normalizeValue
    )

    const onFailure = () => setInputFromValue(refValue)

    const callback = v =>
        v === formatValue(refValue)
            ? setInputFromValue(v)
            : refCallback(v)

    const onSuccess = compose(
        callback,
        formatValue,
        stringToValue
    )

    const onBlurChange = () =>
        validateDateInput(input)
            ? onSuccess(input)
            : onFailure(input)

    const onPointerDown = noDefault(() => ref.focus())

    useEffect(setInputFromValue, [ defaultValue ])

    useEffect(setInputFromValue, [ value ])

    useEffect((ref, focus) => ref[ focus ? 'focus' : 'blur' ](), [ ref, focus ])

    return (
        <div
            className={ appendClassName('time-date', className) }
            { ...attributes }
        >
            <input
                ref={ setRef }
                title={ title }
                className='time-date-input'
                id={ id }
                type='text'
                required={ true }
                value={ input }
                onChange={ onInputChange }
                onBlur={ onBlurChange }
            />
            <Icon
                name='calendar'
                onPointerDown={ onPointerDown }
            />
        </div>
    )
}

export { TimeCalendar, TimeClock, TimeDate }