import { assert, isBigInt, isNumber } from '#helpers'
import { err, ok, type Result } from '#result'

import { BnParseError } from './errors'
import { PRECISION, tens } from './scale'

/** A value that {@link BN.from} and {@link BN.fromUnits} take. */
export type BnValue = bigint | number | string

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?(?:e([-+]?\d+))?$/i
const UNITS = /^-?\d+$|^0x[\da-f]+$/i

// Guards untrusted text: a `bigint` of a million digits takes a second to build.
const MAX_DIGITS = 1000

/** Returns the decimal `text`, such as `-1.5e3`, scaled to {@link PRECISION} fraction digits. */
export const parseDecimal = (text: string): Result<bigint, BnParseError> => {
  const trimmed = text.trim()
  if (trimmed.length > MAX_DIGITS) return err(new BnParseError(text, 'is too long'))

  const match = DECIMAL.exec(trimmed)
  if (!match) return err(new BnParseError(text, 'is not a decimal number'))
  const [, sign, whole = '', fraction = '', exponent = '0'] = match

  const digits = (whole + fraction).replace(/^0+/, '')
  const shift = PRECISION + Number(exponent) - fraction.length

  // A negative shift cuts digits; when it cuts them all, the value is 0.
  if (!digits || -shift >= digits.length) return ok(0n)
  if (digits.length + shift > MAX_DIGITS) return err(new BnParseError(text, 'is too large'))

  const raw = shift < 0 ? BigInt(digits.slice(0, shift)) : BigInt(digits) * tens(shift)
  return ok(sign ? -raw : raw)
}

/** Returns an integer in base units, or throws a `TypeError` when `value` is not one. */
export const parseUnits = (value: BnValue): bigint => {
  if (isBigInt(value)) return value
  if (isNumber(value)) {
    assert(Number.isSafeInteger(value), `BN: ${value} is not a safe integer`)
    return BigInt(value)
  }

  const text = value.trim()
  assert(UNITS.test(text), `BN: "${value}" is not an integer or a hex string`)
  return BigInt(text)
}
