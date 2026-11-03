import { describe, expect, test } from 'bun:test'

import { chunkString } from './string'

describe('chunkString', () => {
  test.each([
    ['1234567', 3, ['123', '456', '7']],
    ['123456', 3, ['123', '456']],
    ['12', 3, ['12']],
    ['', 3, []],
  ])('should cut %p into pieces of %p', (text, size, pieces) => {
    expect(chunkString(text, size)).toEqual(pieces)
  })

  test.each([0, -1, 1.5, Number.NaN, Infinity])('should throw a TypeError on size %p', size => {
    expect(() => chunkString('123', size)).toThrow(TypeError)
  })
})
