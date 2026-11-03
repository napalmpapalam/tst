import { describe, expect, test } from 'bun:test'

import { isDefined } from './value'

describe('isDefined', () => {
  test('should drop only undefined from a list', () => {
    const list = [0, '', null, undefined, false]

    const defined = list.filter(isDefined)

    expect(defined).toEqual([0, '', null, false])
  })
})
