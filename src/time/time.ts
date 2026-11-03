import type { Dayjs } from 'dayjs'

import { assert, isString } from '#helpers'
import { ok, type Result } from '#result'

import { dayjs } from './dayjs'
import { TimeField, TimeUnit } from './enums'
import type { TimeParseError } from './errors'
import { parseFormat, parseIso } from './parse'
import type { TimeBetweenOptions, TimeCalendar, TimeDiffOptions, TimeInput } from './types'

const EXACT_UNITS: ReadonlySet<TimeUnit> = new Set([
  TimeUnit.Millisecond,
  TimeUnit.Second,
  TimeUnit.Minute,
  TimeUnit.Hour,
])
const WALL_CLOCK = 'YYYY-MM-DDTHH:mm:ss.SSS'
const MS_PER_SECOND = 1000

/**
 * An immutable point in time. Every operation returns a new `Time`.
 *
 * @example
 * ```ts
 * const end = Time.fromUnix(1677801600).tz('Europe/Kyiv').add(1, TimeUnit.Day).startOf(TimeUnit.Day)
 *
 * end.format('DD.MM.YYYY HH:mm') // '04.03.2023 00:00'
 * end.iso // '2023-03-03T22:00:00.000Z'
 * ```
 */
export class Time {
  readonly #date: Dayjs
  readonly #zone: string | undefined

  // English is pinned: a consumer's `dayjs.locale()` changes the shared dayjs instance.
  private constructor(date: Dayjs, zone?: string) {
    this.#date = date.locale('en')
    this.#zone = zone
  }

  /** Returns the current time. */
  public static now(): Time {
    return new Time(dayjs())
  }

  /**
   * Returns a `Time` from a `Time`, a `Date`, milliseconds since the epoch, or an ISO 8601 string.
   * A string without an offset is local time.
   *
   * @throws TypeError when `value` is not a valid time.
   */
  public static from(value: TimeInput): Time {
    if (value instanceof Time) return value
    if (isString(value)) return new Time(parseIso(value).unwrap())

    const date = dayjs(value)
    assert(date.isValid(), `Time: ${String(value)} is not a valid time`)
    return new Time(date)
  }

  /**
   * Returns a `Time` from seconds since the epoch.
   *
   * @throws TypeError when `seconds` is not a valid time.
   */
  public static fromUnix(seconds: number): Time {
    return Time.from(seconds * MS_PER_SECOND)
  }

  /**
   * Reads untrusted text as ISO 8601, or as an exact match of a `customParseFormat` template.
   * Text without an offset is local time.
   *
   * @throws TypeError when `format` has an offset token (`Z`): it cannot be matched exactly.
   */
  public static parse(text: string, format?: string): Result<Time, TimeParseError> {
    const res = format ? parseFormat(text, format) : parseIso(text)
    return res.ok ? ok(new Time(res.value)) : res
  }

  /** Milliseconds since the epoch. */
  public get ms(): number {
    return this.#date.valueOf()
  }

  /** Whole seconds since the epoch. */
  public get unix(): number {
    return this.#date.unix()
  }

  /** ISO 8601 in UTC with milliseconds: `'2023-03-03T00:00:00.000Z'`. */
  public get iso(): string {
    return this.#date.toISOString()
  }

  /** RFC 3339 in UTC without a fraction: `'2023-03-03T00:00:00Z'`. */
  public get rfc3339(): string {
    return this.#date.utc().format('YYYY-MM-DDTHH:mm:ss[Z]')
  }

  /** Returns one field in the time zone of this value. {@link TimeField.Month} counts from 1. */
  public get(field: TimeField): number {
    const value = this.#date.get(field)
    return field === TimeField.Month ? value + 1 : value
  }

  /**
   * Returns the same instant in an IANA time zone, such as `'Europe/Kyiv'`.
   *
   * @throws RangeError when `zone` is not a time zone that the runtime knows.
   */
  public tz(zone: string): Time {
    return new Time(this.#date.tz(zone), zone)
  }

  /** Returns the same instant in UTC. */
  public utc(): Time {
    return this.tz('UTC')
  }

  /**
   * Returns this value plus `value` units. Hours and smaller move the instant; days and larger
   * move the wall clock, and a month keeps the day when the month has it.
   *
   * @throws TypeError when `value` is not a safe integer.
   */
  public add(value: number, unit: TimeUnit): Time {
    assert(Number.isSafeInteger(value), `Time: ${value} is not a safe integer`)
    if (!EXACT_UNITS.has(unit)) return this.#onWallClock(wall => wall.add(value, unit))
    return new Time(this.#inZone(this.#date.utc().add(value, unit)), this.#zone)
  }

  /**
   * Returns this value minus `value` units, as {@link Time.add} does.
   *
   * @throws TypeError when `value` is not a safe integer.
   */
  public subtract(value: number, unit: TimeUnit): Time {
    return this.add(-value, unit)
  }

  /** Returns the start of the `unit` that holds this value, in its time zone. */
  public startOf(unit: TimeUnit): Time {
    return this.#onWallClock(wall => wall.startOf(unit))
  }

  /** Compares the two times to the `unit`, or to the millisecond. */
  public isSame(other: TimeInput, unit?: TimeUnit): boolean {
    return this.#date.isSame(Time.#dayjsOf(other), unit)
  }

  /** Checks that this value is earlier than `other`, to the `unit` or to the millisecond. */
  public isBefore(other: TimeInput, unit?: TimeUnit): boolean {
    return this.#date.isBefore(Time.#dayjsOf(other), unit)
  }

  /** Checks that this value is later than `other`, to the `unit` or to the millisecond. */
  public isAfter(other: TimeInput, unit?: TimeUnit): boolean {
    return this.#date.isAfter(Time.#dayjsOf(other), unit)
  }

  /** Checks that this value is not later than `other`, to the `unit` or to the millisecond. */
  public isSameOrBefore(other: TimeInput, unit?: TimeUnit): boolean {
    return this.#date.isSameOrBefore(Time.#dayjsOf(other), unit)
  }

  /** Checks that this value is not earlier than `other`, to the `unit` or to the millisecond. */
  public isSameOrAfter(other: TimeInput, unit?: TimeUnit): boolean {
    return this.#date.isSameOrAfter(Time.#dayjsOf(other), unit)
  }

  /** Checks that this value lies between `start` and `end`; both ends are excluded by default. */
  public isBetween(start: TimeInput, end: TimeInput, opts: TimeBetweenOptions = {}): boolean {
    const [from, to] = [Time.#dayjsOf(start), Time.#dayjsOf(end)]
    return this.#date.isBetween(from, to, opts.unit, opts.inclusivity)
  }

  /** Returns `this - other` in `unit`, cut toward zero unless `float` is set. */
  public diff(
    other: TimeInput,
    unit: TimeUnit = TimeUnit.Millisecond,
    opts: TimeDiffOptions = {},
  ): number {
    return this.#date.diff(Time.#dayjsOf(other), unit, opts.float)
  }

  /** Formats with a dayjs template; the default is ISO 8601 with the offset. */
  public format(template?: string): string {
    return this.#date.format(template)
  }

  /** Returns calendar text, such as `'Yesterday at 2:30 PM'`, relative to `reference`. */
  public calendar(reference: TimeInput = Time.now(), formats?: TimeCalendar): string {
    return this.#date.calendar(this.#inZone(Time.#dayjsOf(reference)), formats)
  }

  /** Returns relative text, such as `'2 hours ago'` or `'in a day'`. */
  public fromNow(): string {
    return this.#date.fromNow()
  }

  /** Returns relative text as seen from `reference`, such as `'2 hours ago'`. */
  public relativeTo(reference: TimeInput): string {
    return this.#date.from(Time.#dayjsOf(reference))
  }

  /** Returns a new `Date` for the same instant. */
  public toDate(): Date {
    return this.#date.toDate()
  }

  /** Returns {@link Time.iso}, so `JSON.stringify` writes the instant. */
  public toJSON(): string {
    return this.iso
  }

  static #dayjsOf(value: TimeInput): Dayjs {
    return Time.from(value).#date
  }

  #inZone(date: Dayjs): Dayjs {
    return this.#zone ? date.tz(this.#zone) : date.local()
  }

  // The dayjs timezone plugin keeps the old offset after a calendar step, so a DST change gives
  // the wrong instant. The step runs on the wall clock in UTC, and the zone reads it back.
  #onWallClock(step: (wall: Dayjs) => Dayjs): Time {
    if (!this.#zone) return new Time(step(this.#date))
    const wall = step(this.#date.utc(true)).format(WALL_CLOCK)
    return new Time(dayjs.tz(wall, this.#zone), this.#zone)
  }
}
