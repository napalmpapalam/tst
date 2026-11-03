import { describe, expect, test } from 'bun:test'

import { isBigInt, isDefined, isIntegerIn, isNumber, isString } from './value'

describe('isDefined', () => {
  test('should drop only undefined from a list', () => {
    const list = [0, '', null, undefined, false]

    const defined = list.filter(isDefined)

    expect(defined).toEqual([0, '', null, false])
  })
})

describe('type checks', () => {
  const values = ['', 0, Number.NaN, 0n, null, undefined, new String(''), {}]

  test.each([
    ['isString', isString, ['']],
    ['isNumber', isNumber, [0, Number.NaN]],
    ['isBigInt', isBigInt, [0n]],
  ] as const)('%s should accept only its primitive', (_, check, accepted) => {
    expect(values.filter(check)).toEqual([...accepted])
  })
})

describe('isIntegerIn', () => {
  test.each([
    [0, 0, 5],
    [5, 0, 5],
    [1e21, 1, Infinity],
  ])('should accept %p from %p to %p', (value, min, max) => {
    expect(isIntegerIn(value, min, max)).toBe(true)
  })

  test.each([
    [-1, 0, 5],
    [6, 0, 5],
    [1.5, 0, 5],
    [Number.NaN, 0, 5],
    [Infinity, 0, Infinity],
  ])('should reject %p from %p to %p', (value, min, max) => {
    expect(isIntegerIn(value, min, max)).toBe(false)
  })
})
