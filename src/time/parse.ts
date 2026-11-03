import type { Dayjs } from 'dayjs'

import { assert } from '#helpers'
import { type Err, err, ok, type Result } from '#result'

import { dayjs } from './dayjs'
import { TimeParseError } from './errors'

const DATE = String.raw`(\d{4}-\d{2}-\d{2})`
const CLOCK = String.raw`(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?`
const OFFSET = String.raw`(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)`

// RFC 3339 and its common ISO 8601 forms. A time without an offset is local time.
const ISO = new RegExp(`^${DATE}(?:[T ]${CLOCK}${OFFSET}?)?$`, 'i')

// dayjs reads the fraction digits of a time without an offset as milliseconds: `.5` as 5 ms.
const FRACTION = /\.(\d+)/
const ESCAPED = /\[[^\]]*]/g
const CALENDAR_DATE = 'YYYY-MM-DD'

/** Reads an ISO 8601 time, and rejects a day that the month does not have. */
export const parseIso = (text: string): Result<Dayjs, TimeParseError> => {
  const day = ISO.exec(text)?.[1]
  if (!day) return notIso(text)

  // `Date` and dayjs both move 2023-02-30 to March 2, and dayjs reads year 50 as 1950.
  // Strict mode rejects both.
  if (!dayjs(day, CALENDAR_DATE, true).isValid()) {
    return err(new TimeParseError(text, 'is not a calendar date'))
  }

  const date = dayjs(text.replace(FRACTION, toMilliseconds))
  return date.isValid() ? ok(date) : notIso(text)
}

/** Reads a time that matches a `customParseFormat` template exactly, such as `'DD.MM.YYYY'`. */
export const parseFormat = (text: string, format: string): Result<Dayjs, TimeParseError> => {
  // Strict mode compares the text with the value formatted at the host offset.
  assert(!format.replace(ESCAPED, '').includes('Z'), `Time: "${format}" has an offset token`)

  const date = dayjs(text, format, true)
  return date.isValid() ? ok(date) : err(new TimeParseError(text, `does not match "${format}"`))
}

const notIso = (text: string): Err<TimeParseError> => {
  return err(new TimeParseError(text, 'is not an ISO 8601 time'))
}

const toMilliseconds = (_: string, digits: string): string => {
  return `.${digits.padEnd(3, '0').slice(0, 3)}`
}
