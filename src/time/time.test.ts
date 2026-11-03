import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import dayjs from 'dayjs'
import 'dayjs/locale/uk.js'

import { errorOf, valueOf } from '#tests'

import { TimeField, TimeInclusivity, TimeUnit } from './enums'
import { TimeParseError } from './errors'
import { Time } from './time'

const MARCH_3 = '2023-03-03T00:00:00.000Z'
const MARCH_3_MS = 1677801600000
const KYIV = 'Europe/Kyiv'

describe('Time', () => {
  describe('from', () => {
    test.each([
      ['milliseconds', MARCH_3_MS],
      ['a Date', new Date(MARCH_3_MS)],
      ['an ISO string', MARCH_3],
      ['an offset', '2023-03-03T02:00:00+02:00'],
      ['a space before the time', '2023-03-03 00:00Z'],
    ])('should read %s', (_, value) => {
      expect(Time.from(value).iso).toBe(MARCH_3)
    })

    test('should read text without an offset as local time', () => {
      expect(Time.from('2023-03-03').ms).toBe(new Date(2023, 2, 3).getTime())
    })

    test('should read a bare number as milliseconds, not seconds', () => {
      expect(Time.from(1000).iso).toBe('1970-01-01T00:00:01.000Z')
    })

    test('should return the same Time for a Time', () => {
      const time = Time.from(MARCH_3)

      expect(Time.from(time)).toBe(time)
    })

    test.each([NaN, Infinity, new Date(NaN), 'wrong input', '2023-02-30'])(
      'should throw a TypeError for %p',
      value => {
        expect(() => Time.from(value)).toThrow(TypeError)
      },
    )
  })

  describe('fromUnix', () => {
    test('should read seconds', () => {
      expect(Time.fromUnix(MARCH_3_MS / 1000).ms).toBe(MARCH_3_MS)
    })
  })

  describe('parse', () => {
    test('should read ISO 8601 text', () => {
      expect(valueOf(Time.parse(MARCH_3)).ms).toBe(MARCH_3_MS)
    })

    test.each([
      ['.5', 500],
      ['.05', 50],
      ['.123456789', 123],
    ])('should read the fraction %p as %d ms without an offset', (fraction, ms) => {
      const time = valueOf(Time.parse(`2023-03-03T00:00:00${fraction}`))

      expect(time.get(TimeField.Millisecond)).toBe(ms)
    })

    test.each([
      '',
      'wrong input',
      '03.03.2023',
      '2023-02-30',
      '2023-02-29',
      '2023-13-01',
      '0050-01-01',
      '2023-03-03T24:00',
      '2023-03-03Z',
      ' 2023-03-03',
    ])('should return a TimeParseError for %p', text => {
      expect(errorOf(Time.parse(text))).toBeInstanceOf(TimeParseError)
    })

    test('should read the leap day of a leap year', () => {
      expect(valueOf(Time.parse('2024-02-29')).get(TimeField.Day)).toBe(29)
    })

    test('should read text that matches a format as local time', () => {
      const time = valueOf(Time.parse('03.03.2023 10:30', 'DD.MM.YYYY HH:mm'))

      expect(time.format('YYYY-MM-DD HH:mm')).toBe('2023-03-03 10:30')
    })

    test.each(['3.3.2023 10:30', '30.02.2023 10:30', '03.03.2023'])(
      'should return a TimeParseError for %p that does not match the format',
      text => {
        expect(errorOf(Time.parse(text, 'DD.MM.YYYY HH:mm'))).toBeInstanceOf(TimeParseError)
      },
    )

    test('should throw a TypeError for a format with an offset token', () => {
      expect(() => Time.parse('03.03.2023 +02:00', 'DD.MM.YYYY Z')).toThrow(TypeError)
    })

    test('should allow a Z inside an escaped part of the format', () => {
      expect(Time.parse('03.03.2023 Zone A', 'DD.MM.YYYY [Zone A]').ok).toBe(true)
    })
  })

  describe('output', () => {
    test('should give whole seconds as unix', () => {
      expect(Time.from(MARCH_3_MS + 999).unix).toBe(MARCH_3_MS / 1000)
    })

    test('should write RFC 3339 in UTC for a value in another time zone', () => {
      expect(Time.from(MARCH_3).tz(KYIV).rfc3339).toBe('2023-03-03T00:00:00Z')
    })

    test('should format in the time zone of the value', () => {
      const time = Time.from(MARCH_3).tz(KYIV)

      expect(time.format('YYYY-MM-DD HH:mm Z')).toBe('2023-03-03 02:00 +02:00')
    })

    test('should write the ISO string to JSON', () => {
      expect(JSON.stringify({ at: Time.from(MARCH_3) })).toBe(`{"at":"${MARCH_3}"}`)
    })

    test('should return a new Date', () => {
      expect(Time.from(MARCH_3).toDate()).toEqual(new Date(MARCH_3_MS))
    })

    test('should keep English when the shared dayjs locale changes', () => {
      dayjs.locale('uk')

      try {
        expect(Time.from(MARCH_3).utc().format('MMMM dddd')).toBe('March Friday')
      } finally {
        dayjs.locale('en')
      }
    })
  })

  describe('get', () => {
    test.each([
      [TimeField.Year, 2023],
      [TimeField.Month, 3],
      [TimeField.Day, 3],
      [TimeField.Weekday, 5],
      [TimeField.Hour, 10],
      [TimeField.Minute, 30],
      [TimeField.Second, 15],
      [TimeField.Millisecond, 250],
    ] as const)('should return the %s', (field, value) => {
      expect(Time.from('2023-03-03T10:30:15.250Z').utc().get(field)).toBe(value)
    })
  })

  describe('tz', () => {
    test('should keep the instant', () => {
      expect(Time.from(MARCH_3).tz('Asia/Tokyo').ms).toBe(MARCH_3_MS)
    })

    test('should throw a RangeError for an unknown zone', () => {
      expect(() => Time.from(MARCH_3).tz('Nowhere/Zone')).toThrow(RangeError)
    })

    test('should go back to UTC', () => {
      expect(Time.from(MARCH_3).tz('Asia/Tokyo').utc().get(TimeField.Hour)).toBe(0)
    })
  })

  describe('add', () => {
    test('should leave the value unchanged', () => {
      const time = Time.from(MARCH_3)

      time.add(1, TimeUnit.Day)

      expect(time.iso).toBe(MARCH_3)
    })

    test.each([
      [1, TimeUnit.Millisecond, '2023-03-03T00:00:00.001Z'],
      [1, TimeUnit.Minute, '2023-03-03T00:01:00.000Z'],
      [1, TimeUnit.Week, '2023-03-10T00:00:00.000Z'],
      [-1, TimeUnit.Day, '2023-03-02T00:00:00.000Z'],
    ] as const)('should add %d %s', (value, unit, iso) => {
      expect(Time.from(MARCH_3).utc().add(value, unit).iso).toBe(iso)
    })

    test('should keep the last day of a shorter month', () => {
      const time = Time.from('2023-01-31T12:00Z').utc().add(1, TimeUnit.Month)

      expect(time.iso).toBe('2023-02-28T12:00:00.000Z')
    })

    test.each([NaN, Infinity, 1.5])('should throw a TypeError for %p', value => {
      expect(() => Time.from(MARCH_3).add(value, TimeUnit.Day)).toThrow(TypeError)
    })
  })

  describe('subtract', () => {
    test('should subtract a day', () => {
      expect(Time.from(MARCH_3).utc().subtract(1, TimeUnit.Day).iso).toBe(
        '2023-03-02T00:00:00.000Z',
      )
    })
  })

  describe('startOf', () => {
    test('should round down to the unit', () => {
      const month = Time.from('2023-03-03T10:30:00Z').utc().startOf(TimeUnit.Month)

      expect(month.iso).toBe('2023-03-01T00:00:00.000Z')
    })

    test('should use the time zone of the value', () => {
      expect(Time.from(MARCH_3).tz(KYIV).startOf(TimeUnit.Day).iso).toBe('2023-03-02T22:00:00.000Z')
    })
  })

  describe('on a host in another zone', () => {
    const hostZone = process.env.TZ

    beforeAll(() => {
      process.env.TZ = 'America/New_York'
    })

    afterAll(() => {
      process.env.TZ = hostZone ?? 'UTC'
    })

    test('should add an hour of real time across the DST start', () => {
      const time = Time.from('2023-03-26T00:30Z').tz(KYIV).add(1, TimeUnit.Hour)

      expect(time.format()).toBe('2023-03-26T04:30:00+03:00')
    })

    test.each([
      ['2023-03-25T12:00Z', 1, '2023-03-26T14:00:00+03:00'],
      ['2023-03-26T12:00Z', -1, '2023-03-25T15:00:00+02:00'],
      ['2023-10-28T12:00Z', 1, '2023-10-29T15:00:00+02:00'],
      ['2023-03-25T01:30Z', 1, '2023-03-26T04:30:00+03:00'],
    ])('should move %s by %d day on the wall clock', (iso, days, text) => {
      expect(Time.from(iso).tz(KYIV).add(days, TimeUnit.Day).format()).toBe(text)
    })

    test.each([
      ['2023-03-26T12:00Z', '2023-03-26T00:00:00+02:00'],
      ['2023-10-29T12:00Z', '2023-10-29T00:00:00+03:00'],
    ])('should start the day of %s with the offset of midnight', (iso, text) => {
      expect(Time.from(iso).tz(KYIV).startOf(TimeUnit.Day).format()).toBe(text)
    })

    test('should pick the calendar day in the zone of the value', () => {
      const text = Time.from('2023-03-03T12:00Z').utc().calendar('2023-03-04T02:00Z')

      expect(text).toBe('Yesterday at 12:00 PM')
    })
  })

  describe('compare', () => {
    test.each([
      ['isSame', '2023-03-03', true],
      ['isSame', '2023-03-04', false],
      ['isBefore', '2023-03-04', true],
      ['isBefore', '2023-03-03', false],
      ['isAfter', '2023-03-02', true],
      ['isAfter', '2023-03-03', false],
      ['isSameOrBefore', '2023-03-03', true],
      ['isSameOrBefore', '2023-03-02', false],
      ['isSameOrAfter', '2023-03-03', true],
      ['isSameOrAfter', '2023-03-04', false],
    ] as const)('should check %s against %s', (method, other, expected) => {
      expect(Time.from('2023-03-03')[method](Time.from(other))).toBe(expected)
    })

    test('should compare to the unit', () => {
      const time = Time.from('2023-03-03T10:00Z').utc()

      expect(time.isSame('2023-03-03T22:00Z', TimeUnit.Day)).toBe(true)
    })

    test('should accept any TimeInput', () => {
      expect(Time.from(MARCH_3).isBefore(MARCH_3_MS + 1)).toBe(true)
    })
  })

  describe('isBetween', () => {
    test('should exclude both ends by default', () => {
      expect(Time.from(MARCH_3).isBetween(MARCH_3, '2023-03-04T00:00Z')).toBe(false)
    })

    test('should include the ends that the inclusivity names', () => {
      const between = Time.from(MARCH_3).isBetween(MARCH_3, '2023-03-04T00:00Z', {
        inclusivity: TimeInclusivity.StartOnly,
      })

      expect(between).toBe(true)
    })

    test('should return false outside the range', () => {
      expect(Time.from('2023-06-03').isBetween('2023-03-02', '2023-03-04')).toBe(false)
    })
  })

  describe('diff', () => {
    test('should return milliseconds by default', () => {
      expect(Time.from('2023-03-03T00:00Z').diff('2023-03-04T00:00Z')).toBe(-86400000)
    })

    test('should cut toward zero in the unit', () => {
      expect(Time.from('2023-03-04T00:00Z').diff('2023-03-03T12:00Z', TimeUnit.Day)).toBe(0)
    })

    test('should keep the fraction with float', () => {
      const days = Time.from('2023-03-04T00:00Z').diff('2023-03-03T12:00Z', TimeUnit.Day, {
        float: true,
      })

      expect(days).toBe(0.5)
    })
  })

  describe('relative text', () => {
    test('should describe the time from a reference', () => {
      expect(Time.from('2023-03-03T10:00Z').relativeTo('2023-03-03T12:00Z')).toBe('2 hours ago')
    })

    test('should describe the time from now', () => {
      expect(Time.now().add(3, TimeUnit.Day).fromNow()).toBe('in 3 days')
    })

    test('should describe the calendar day from a reference', () => {
      const text = Time.from('2023-03-03T12:00Z').utc().calendar('2023-03-04T12:00Z')

      expect(text).toBe('Yesterday at 12:00 PM')
    })

    test('should take calendar formats', () => {
      const time = Time.from('2023-03-03T12:00Z').utc()

      expect(time.calendar(time, { sameDay: '[today] HH:mm' })).toBe('today 12:00')
    })
  })
})
