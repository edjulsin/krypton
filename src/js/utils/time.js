import { utcDay, utcFormat, utcHour, utcMinute, utcMonth, utcSecond, utcWeek, utcYear } from 'd3'
import { map } from 'ramda'

const secondsToMilliseconds = seconds => Number(seconds) * 1000
const minutesToMilliseconds = minutes => Number(minutes) * secondsToMilliseconds(60)
const hoursToMilliseconds = hour => Number(hour) * minutesToMilliseconds(60)
const daysToMilliseconds = day => Number(day) * hoursToMilliseconds(24)
const weeksToMilliseconds = week => Number(week) * daysToMilliseconds(7)
const monthsToMilliseconds = months => Number(months) * daysToMilliseconds(30)
const yearsToMilliseconds = years => Number(years) * daysToMilliseconds(365)

const millisecondsToSeconds = ms => Number(ms) / secondsToMilliseconds(1)
const millisecondsToMinutes = ms => Number(ms) / minutesToMilliseconds(1)
const millisecondsToHours = ms => Number(ms) / hoursToMilliseconds(1)
const millisecondsToDays = ms => Number(ms) / daysToMilliseconds(1)
const millisecondsToWeeks = ms => Number(ms) / weeksToMilliseconds(1)
const millisecondsToMonths = ms => Number(ms) / monthsToMilliseconds(1)
const millisecondsToYears = ms => Number(ms) / yearsToMilliseconds(1)

const millisecondsToClock = utcFormat('%H:%M:%S')

const formatMillisecond = utcFormat(".%L")
const formatSecond = utcFormat(":%S")
const formatMinute = utcFormat("%I:%M")
const formatHour = utcFormat("%H:%M")
const formatDay = utcFormat("%e")
const formatWeek = utcFormat("%b %d")
const formatMonth = utcFormat("%B")
const formatYear = utcFormat("%Y")

const dateFormatter = date =>
    (utcSecond(date) < date ? formatMillisecond
        : utcMinute(date) < date ? formatSecond
            : utcHour(date) < date ? formatMinute
                : utcDay(date) < date ? formatHour
                    : utcMonth(date) < date ? (utcWeek(date) < date ? formatDay : formatWeek)
                        : utcYear(date) < date ? formatMonth
                            : formatYear)(date)


const getTime = v => new Date(v).getTime()

const getTimes = map(getTime)

export {
    secondsToMilliseconds,
    minutesToMilliseconds,
    hoursToMilliseconds,
    daysToMilliseconds,
    weeksToMilliseconds,
    monthsToMilliseconds,
    yearsToMilliseconds,
    millisecondsToSeconds,
    millisecondsToMinutes,
    millisecondsToHours,
    millisecondsToDays,
    millisecondsToWeeks,
    millisecondsToMonths,
    millisecondsToYears,
    millisecondsToClock,
    dateFormatter,
    getTime,
    getTimes
}