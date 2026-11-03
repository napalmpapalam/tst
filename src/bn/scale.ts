import { assert } from '#helpers'

/** The number of fraction digits in {@link BN.raw}. */
export const PRECISION = 26

/** Returns `10 ** power` as a `bigint`. */
export const tens = (power: number): bigint => 10n ** BigInt(power)

/** Returns the raw value of one base unit at `decimals`, such as one wei at 18. */
export const unitOf = (decimals: number): bigint => tens(PRECISION - decimals)

/** Returns `count`, or throws a `TypeError` when it is not an integer in `0..PRECISION`. */
export const checkDigits = (count: number, name: string): number => {
  assert(
    Number.isInteger(count) && count >= 0 && count <= PRECISION,
    `BN: ${name} must be an integer from 0 to ${PRECISION}, got ${count}`,
  )

  return count
}
