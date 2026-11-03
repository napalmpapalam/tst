/** Returns the integer square root of `value`, rounded down. */
export const sqrtBigInt = (value: bigint): bigint => {
  if (value < 0n) throw new RangeError(`sqrtBigInt: ${value} is negative`)
  if (value < 2n) return value

  let root = value
  let next = (root + 1n) / 2n

  while (next < root) {
    root = next
    next = (root + value / root) / 2n
  }

  return root
}

/** Returns -1, 0 or 1 when `a` is less than, equal to or greater than `b`. */
export const compareBigInt = (a: bigint, b: bigint): -1 | 0 | 1 => {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
