import { describe, expect, test } from 'bun:test'

import { errorOf, valueOf } from '#tests'

import { Duration } from './duration'
import { DurationParseError } from './errors'

const TWO_DAYS = Duration.from({ days: 2 })

describe('Duration', () => {
  describe('from', () => {
    test('should read milliseconds', () => {
      expect(Duration.from(5400000).asMinutes).toBe(90)
    })

    test('should add up mixed parts', () => {
      expect(Duration.from({ hours: 1, minutes: 30 }).asMinutes).toBe(90)
    })

    test('should carry parts over', () => {
      const duration = Duration.from({ days: 45 })

      expect([duration.months, duration.days, duration.hours]).toEqual([1, 14, 14])
    })

    test.each([NaN, Infinity, -1, { days: NaN }, { hours: 1, minutes: -30 }])(
      'should throw a TypeError for %p',
      value => {
        expect(() => Duration.from(value)).toThrow(TypeError)
      },
    )
  })

  describe('parse', () => {
    test.each([
      ['PT1H30M', 5400000],
      ['P2D', 172800000],
      ['P1W', 604800000],
      ['PT0.5S', 500],
    ])('should read %p', (text, ms) => {
      expect(valueOf(Duration.parse(text)).asMilliseconds).toBe(ms)
    })

    test.each(['', 'P', 'PT', 'P1DT', '-PT1H', '+PT1H', 'P1Q', 'PT0,5S', '1h', 'PT1H ', 'P1H'])(
      'should return a DurationParseError for %p',
      text => {
        expect(errorOf(Duration.parse(text))).toBeInstanceOf(DurationParseError)
      },
    )
  })

  describe('totals', () => {
    test.each([
      ['asMilliseconds', 172800000],
      ['asSeconds', 172800],
      ['asMinutes', 2880],
      ['asHours', 48],
      ['asDays', 2],
      ['asWeeks', 2 / 7],
      ['asMonths', 2 / (365 / 12)],
      ['asYears', 2 / 365],
    ] as const)('should give %s', (getter, value) => {
      expect(TWO_DAYS[getter]).toBeCloseTo(value, 12)
    })
  })

  describe('parts', () => {
    test.each([
      ['years', 1],
      ['months', 2],
      ['weeks', 1],
      ['days', 10],
      ['hours', 5],
      ['minutes', 6],
      ['seconds', 7],
      ['milliseconds', 8],
    ] as const)('should give %s', (getter, value) => {
      const duration = Duration.from({
        years: 1,
        months: 2,
        days: 10,
        hours: 5,
        minutes: 6,
        seconds: 7,
        milliseconds: 8,
      })

      expect(duration[getter]).toBe(value)
    })
  })

  describe('output', () => {
    test('should humanize without an import of Time', () => {
      expect(Duration.from({ minutes: 90 }).humanized).toBe('2 hours')
    })

    test('should write ISO 8601', () => {
      expect(Duration.from({ hours: 1, minutes: 30 }).iso).toBe('PT1H30M')
    })

    test('should write the ISO string to JSON', () => {
      expect(JSON.stringify({ wait: TWO_DAYS })).toBe('{"wait":"P2D"}')
    })

    test('should format a part that the input did not name', () => {
      expect(Duration.from({ days: 2, hours: 1 }).format('HH:mm')).toBe('01:00')
    })

    test('should format the parts', () => {
      expect(Duration.from({ hours: 1, minutes: 2, seconds: 3 }).format('HH:mm:ss')).toBe(
        '01:02:03',
      )
    })
  })
})
