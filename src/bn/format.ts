import { assert, chunkString, isIntegerIn } from '#helpers'

import type { BnRounding } from './enums'

/** How {@link BN.format} prints a value. Keep one object to format many values the same way. */
export type BnFormatOptions = {
  /** The number of fraction digits to show. Defaults to the decimals of the value. */
  decimals?: number
  /** How to treat the digits past `decimals`. Defaults to {@link BnRounding.Down}. */
  rounding?: BnRounding
  /** The text before the sign. */
  prefix?: string
  /** The text after the number. */
  suffix?: string
  /** Defaults to `'.'`. */
  decimalSeparator?: string
  /** Goes between groups of integer digits. Defaults to `','`. */
  groupSeparator?: string
  /** The number of integer digits in a group. Defaults to 3; 0 turns groups off. */
  groupSize?: number
  /** Goes between groups of fraction digits. Defaults to `' '`. */
  fractionGroupSeparator?: string
  /** The number of fraction digits in a group, counted from the separator. Defaults to 0, off. */
  fractionGroupSize?: number
}

/** Returns `units` with exactly `decimals` fraction digits, such as `'-1,234.001123'`. */
export const formatUnits = (
  units: bigint,
  decimals: number,
  opts: Omit<BnFormatOptions, 'decimals' | 'rounding'>,
): string => {
  const {
    prefix = '',
    suffix = '',
    decimalSeparator = '.',
    groupSeparator = ',',
    groupSize = 3,
    fractionGroupSeparator = ' ',
    fractionGroupSize = 0,
  } = opts

  checkSize(groupSize, 'groupSize')
  checkSize(fractionGroupSize, 'fractionGroupSize')

  const negative = units < 0n
  const digits = (negative ? -units : units).toString().padStart(decimals + 1, '0')
  const point = digits.length - decimals

  const whole = groupFromEnd(digits.slice(0, point), groupSize, groupSeparator)
  const fraction = groupFromStart(digits.slice(point), fractionGroupSize, fractionGroupSeparator)
  const number = decimals ? `${whole}${decimalSeparator}${fraction}` : whole

  return `${prefix}${negative ? '-' : ''}${number}${suffix}`
}

/** Throws a `TypeError` when `size` is not a non-negative integer. */
const checkSize = (size: number, name: string): void => {
  assert(isIntegerIn(size, 0), `BN: ${name} must be a non-negative integer, got ${size}`)
}

/** Returns `digits` grouped from the start; size 0 keeps them in one group. */
const groupFromStart = (digits: string, size: number, separator: string): string => {
  return size ? chunkString(digits, size).join(separator) : digits
}

/** Returns `digits` grouped from the end, so only the first group can be shorter. */
const groupFromEnd = (digits: string, size: number, separator: string): string => {
  if (!size) return digits
  const head = digits.length % size || size
  return [digits.slice(0, head), ...chunkString(digits.slice(head), size)].join(separator)
}
