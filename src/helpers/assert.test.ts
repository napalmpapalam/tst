import { describe, expect, test } from 'bun:test'

import { assert } from './assert'

describe('assert', () => {
  test('should pass on a truthy condition', () => {
    expect(() => assert(1, 'never')).not.toThrow()
  })

  test('should throw a TypeError on a falsy condition', () => {
    expect(() => assert(0, 'bad')).toThrow(TypeError)
  })
})
