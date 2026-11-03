/** Returns whether `value` is not `undefined`. Use it to narrow in `filter`. */
export const isDefined = <T>(value: T | undefined): value is T => value !== undefined

/** Returns whether `value` is an integer from `min` to `max`. */
export const isIntegerIn = (value: number, min: number, max = Infinity): boolean => {
  return Number.isInteger(value) && value >= min && value <= max
}
