/** Returns whether `value` is not `undefined`. Use it to narrow in `filter`. */
export const isDefined = <T>(value: T | undefined): value is T => value !== undefined

/** Returns whether `value` is a string primitive. */
export const isString = (value: unknown): value is string => typeof value === 'string'

/** Returns whether `value` is a number primitive, `NaN` included. */
export const isNumber = (value: unknown): value is number => typeof value === 'number'

/** Returns whether `value` is a bigint primitive. */
export const isBigInt = (value: unknown): value is bigint => typeof value === 'bigint'

/** Returns whether `value` is an integer from `min` to `max`. */
export const isIntegerIn = (value: number, min: number, max = Infinity): boolean => {
  return Number.isInteger(value) && value >= min && value <= max
}
