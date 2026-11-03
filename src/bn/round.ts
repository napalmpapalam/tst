import { compareBigInt } from '#helpers'

import { BnRounding } from './enums'
import { unitOf } from './scale'

/** Returns `raw` rounded to `places` fraction digits, at the same scale. */
export const roundRaw = (raw: bigint, places: number, mode: BnRounding): bigint => {
  const unit = unitOf(places)
  const dropped = raw % unit
  if (!dropped) return raw

  const positive = raw > 0n
  const half = compareBigInt((positive ? dropped : -dropped) * 2n, unit)
  const kept = raw - dropped
  if (!isAwayFromZero(mode, positive, half)) return kept
  return positive ? kept + unit : kept - unit
}

/** Returns whether to step away from zero; `half` compares the dropped part with a half unit. */
const isAwayFromZero = (mode: BnRounding, positive: boolean, half: -1 | 0 | 1): boolean => {
  switch (mode) {
    case BnRounding.Up:
      return true
    case BnRounding.Down:
      return false
    case BnRounding.Ceil:
      return positive
    case BnRounding.Floor:
      return !positive
    case BnRounding.HalfUp:
      return half >= 0
    case BnRounding.HalfDown:
      return half > 0
    case BnRounding.HalfCeil:
      return half > 0 || (half === 0 && positive)
    case BnRounding.HalfFloor:
      return half > 0 || (half === 0 && !positive)
    default:
      throw new TypeError(`BN: unknown rounding mode ${String(mode)}`)
  }
}
