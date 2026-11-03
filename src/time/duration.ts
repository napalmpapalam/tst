import type { Duration as DayjsDuration } from 'dayjs/plugin/duration.js'

import { assert, isNumber } from '#helpers'
import { err, ok, type Result } from '#result'

import { dayjs } from './dayjs'
import { TimeUnit } from './enums'
import { DurationParseError } from './errors'
import type { DurationUnits } from './types'

const part = (unit: string): string => `(?:\\d+(?:\\.\\d+)?${unit})?`

// dayjs reads `'P'` and `'PT0,5S'` as zero and drops the sign of `'-PT1H'`, so the text is
// checked first.
const ISO = new RegExp(
  `^P(?!$)${['Y', 'M', 'W', 'D'].map(part).join('')}(?:T(?!$)${['H', 'M', 'S'].map(part).join('')})?$`,
)

/**
 * An immutable length of time, 0 or more. A year counts as 365 days and a month as 1/12 of it.
 *
 * @example
 * ```ts
 * const wait = Duration.from({ hours: 1, minutes: 30 })
 *
 * wait.asMinutes // 90
 * wait.humanized // '2 hours'
 * ```
 */
export class Duration {
  readonly #duration: DayjsDuration

  // Milliseconds carry the parts over, so `{ days: 45 }` gives 1 month and 14.6 days.
  private constructor(ms: number) {
    this.#duration = dayjs.duration(ms)
  }

  /**
   * Returns a `Duration` from milliseconds or from parts.
   *
   * @throws TypeError when a number is negative or not finite.
   */
  public static from(value: DurationUnits | number): Duration {
    if (isNumber(value)) return Duration.from({ milliseconds: value })

    const parts = Object.values(value)
    assert(parts.every(isLength), 'Duration: every part must be a finite number of 0 or more')
    return new Duration(dayjs.duration(value).asMilliseconds())
  }

  /** Reads untrusted text as an ISO 8601 duration without a sign, such as `'PT1H30M'`. */
  public static parse(text: string): Result<Duration, DurationParseError> {
    if (!ISO.test(text)) return err(new DurationParseError(text))
    return ok(new Duration(dayjs.duration(text).asMilliseconds()))
  }

  /** The whole length in milliseconds. */
  public get asMilliseconds(): number {
    return this.#duration.asMilliseconds()
  }

  /** The whole length in seconds. */
  public get asSeconds(): number {
    return this.#duration.asSeconds()
  }

  /** The whole length in minutes. */
  public get asMinutes(): number {
    return this.#duration.asMinutes()
  }

  /** The whole length in hours. */
  public get asHours(): number {
    return this.#duration.asHours()
  }

  /** The whole length in days. */
  public get asDays(): number {
    return this.#duration.asDays()
  }

  /** The whole length in weeks. */
  public get asWeeks(): number {
    return this.#duration.asWeeks()
  }

  /** The whole length in months. */
  public get asMonths(): number {
    return this.#duration.asMonths()
  }

  /** The whole length in years. */
  public get asYears(): number {
    return this.#duration.asYears()
  }

  /** The milliseconds part, 0–999. */
  public get milliseconds(): number {
    return this.#duration.milliseconds()
  }

  /** The seconds part, 0–59. */
  public get seconds(): number {
    return this.#duration.seconds()
  }

  /** The minutes part, 0–59. */
  public get minutes(): number {
    return this.#duration.minutes()
  }

  /** The hours part, 0–23. */
  public get hours(): number {
    return this.#duration.hours()
  }

  /** The days part, 0–30. */
  public get days(): number {
    return this.#duration.days()
  }

  /** The whole weeks in the days part, 0–4. */
  public get weeks(): number {
    // dayjs `weeks()` returns the total weeks of the whole length.
    return Math.trunc(this.days / 7)
  }

  /** The months part, 0–11. */
  public get months(): number {
    return this.#duration.months()
  }

  /** The years part. */
  public get years(): number {
    return this.#duration.years()
  }

  /** The length as rough English text, such as `'2 hours'`. */
  public get humanized(): string {
    // dayjs `humanize()` reads the clock twice, so 90 minutes can read as 'an hour'.
    const start = dayjs(0).locale('en')
    return start.add(this.asMilliseconds, TimeUnit.Millisecond).from(start, true)
  }

  /** ISO 8601: `'PT1H30M'`. */
  public get iso(): string {
    return this.#duration.toISOString()
  }

  /** Formats the parts with a dayjs template, such as `'HH:mm:ss'`. */
  public format(template?: string): string {
    return this.#duration.format(template)
  }

  /** Returns {@link Duration.iso}, so `JSON.stringify` writes the length. */
  public toJSON(): string {
    return this.iso
  }
}

const isLength = (value: number): boolean => Number.isFinite(value) && value >= 0
