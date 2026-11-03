/** A unit to add, subtract, round down to, or compare by. */
export enum TimeUnit {
  Millisecond = 'millisecond',
  Second = 'second',
  Minute = 'minute',
  Hour = 'hour',
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year',
}

/** A field that `Time.get` reads. The values are the dayjs unit names. */
export enum TimeField {
  Year = 'year',
  /** The month, from 1. */
  Month = 'month',
  /** The day of the month. */
  Day = 'date',
  /** The day of the week, 0 for Sunday. */
  Weekday = 'day',
  Hour = 'hour',
  Minute = 'minute',
  Second = 'second',
  Millisecond = 'millisecond',
}

/** Which ends `Time.isBetween` includes. */
export enum TimeInclusivity {
  Exclusive = '()',
  StartOnly = '[)',
  EndOnly = '(]',
  Inclusive = '[]',
}
