/** Returns whether `value` is not `undefined`. Use it to narrow in `filter`. */
export const isDefined = <T>(value: T | undefined): value is T => value !== undefined
