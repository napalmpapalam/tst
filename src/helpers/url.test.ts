import { describe, expect, test } from 'bun:test'

import { isAbsoluteUrl } from './url'

describe('isAbsoluteUrl', () => {
  test.each(['https://a.x', 'HTTP://a.x/b', 'git+ssh://a.x'])('should accept %s', url => {
    expect(isAbsoluteUrl(url)).toBe(true)
  })

  test.each(['/users', 'users', 'users:1', '//a.x'])('should reject %s', url => {
    expect(isAbsoluteUrl(url)).toBe(false)
  })
})
