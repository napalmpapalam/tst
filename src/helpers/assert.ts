/** Throws a `TypeError` with `message` when `condition` is falsy. Use it to check an argument. */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TypeError(message)
}
