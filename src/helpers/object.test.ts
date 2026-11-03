import { describe, expect, test } from 'bun:test'

import { isPlainObject } from './object'

describe('isPlainObject', () => {
  test.each([
    ['an object literal', { a: 1 }],
    ['a null-prototype object', Object.create(null)],
  ])('should accept %s', (_, value) => {
    expect(isPlainObject(value)).toBe(true)
  })

  test.each([
    ['null', null],
    ['an array', [1]],
    ['a string', 'a'],
    ['a class instance', new URLSearchParams()],
    ['a Date', new Date()],
  ])('should reject %s', (_, value) => {
    expect(isPlainObject(value)).toBe(false)
  })
})
