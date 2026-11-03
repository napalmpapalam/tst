import type { TimeInclusivity, TimeUnit } from './enums'
import type { Time } from './time'

/** A value that {@link Time.from} reads: a `Time`, a `Date`, milliseconds, or an ISO 8601 string. */
export type TimeInput = Time | Date | number | string

/** Options for `Time.isBetween`. */
export type TimeBetweenOptions = {
  unit?: TimeUnit
  inclusivity?: TimeInclusivity
}

/** Options for `Time.diff`. */
export type TimeDiffOptions = {
  /** Keeps the fraction of the unit instead of cutting it toward zero. */
  float?: boolean
}

/** Format templates for `Time.calendar`, by how far the reference time is. */
export type TimeCalendar = Partial<
  Record<'sameDay' | 'nextDay' | 'lastDay' | 'nextWeek' | 'lastWeek' | 'sameElse', string>
>

/** The parts of a {@link Duration}, in any mix. */
export type DurationUnits = Partial<
  Record<
    'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds',
    number
  >
>
