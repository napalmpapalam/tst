/** Returns whether `value` is an object literal or has a `null` prototype, not a class instance. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false

  const proto: unknown = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}
