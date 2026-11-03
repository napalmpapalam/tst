import { describe, expect, test } from 'bun:test'

import { compareBigInt, sqrtBigInt } from './bigint'

describe('sqrtBigInt', () => {
  test.each([
    [0n, 0n],
    [1n, 1n],
    [3n, 1n],
    [4n, 2n],
    [99n, 9n],
    [10n ** 40n, 10n ** 20n],
  ])('should return the floor root of %p', (value, root) => {
    expect(sqrtBigInt(value)).toBe(root)
  })

  test.each([2n ** 255n + 12345n, 10n ** 77n - 1n, 7n * 10n ** 52n])(
    'should return the floor root of the non-square %p',
    value => {
      const root = sqrtBigInt(value)

      expect(root * root <= value && value < (root + 1n) * (root + 1n)).toBe(true)
    },
  )

  test('should throw a RangeError on a negative value', () => {
    expect(() => sqrtBigInt(-1n)).toThrow(RangeError)
  })
})

describe('compareBigInt', () => {
  test.each([
    [1n, 2n, -1],
    [2n, 2n, 0],
    [3n, 2n, 1],
  ] as const)('should compare %p with %p as %p', (a, b, order) => {
    expect(compareBigInt(a, b)).toBe(order)
  })
})
