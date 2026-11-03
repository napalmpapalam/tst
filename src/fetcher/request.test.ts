import { describe, expect, test } from 'bun:test'

import { buildInit, buildUrl, mergeHeaders } from './request'

describe('request', () => {
  describe('buildUrl', () => {
    test.each([
      ['https://api.x', 'users', 'https://api.x/users'],
      ['https://api.x/v1/', '/users', 'https://api.x/v1/users'],
      ['https://api.x/v1', 'users/', 'https://api.x/v1/users/'],
      ['https://api.x/v1', 'users?page=2', 'https://api.x/v1/users?page=2'],
    ])('should join %s and %s', (base, endpoint, url) => {
      expect(buildUrl(base, endpoint).href).toBe(url)
    })

    test('should keep the credentials and query of the base URL', () => {
      const url = buildUrl('https://u:p@api.x/v1?key=k', 'users?page=2')

      expect(url.href).toBe('https://u:p@api.x/v1/users?key=k&page=2')
    })

    test('should ignore the base URL for an absolute endpoint', () => {
      const url = buildUrl('https://api.x/v1', 'https://other.y/z')

      expect(url.href).toBe('https://other.y/z')
    })

    test('should repeat the key for an array value', () => {
      const url = buildUrl('https://api.x', 'users', { id: [1, 2] })

      expect(url.search).toBe('?id=1&id=2')
    })

    test('should skip an undefined value', () => {
      const url = buildUrl('https://api.x', 'users', { a: undefined, b: [undefined, true] })

      expect(url.search).toBe('?b=true')
    })
  })

  describe('mergeHeaders', () => {
    test('should keep the entries of a Headers instance', () => {
      const headers = mergeHeaders(new Headers({ 'X-A': '1' }), new Headers({ 'X-B': '2' }))

      expect(Object.fromEntries(headers)).toEqual({ 'x-a': '1', 'x-b': '2' })
    })

    test('should let the override win regardless of case', () => {
      const headers = mergeHeaders({ 'x-token': 'old' }, [['X-Token', 'new']])

      expect(headers.get('x-token')).toBe('new')
    })
  })

  describe('buildInit', () => {
    test('should send a plain object as JSON with its content type', () => {
      const init = buildInit(undefined, { body: { a: 1 } })

      expect(init.body).toBe('{"a":1}')
      expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
    })

    test('should send an array as JSON', () => {
      const init = buildInit(undefined, { body: [1, 2] })

      expect(init.body).toBe('[1,2]')
    })

    test('should keep the content type the caller set', () => {
      const init = buildInit({ 'Content-Type': 'application/vnd.api+json' }, { body: { a: 1 } })

      expect(new Headers(init.headers).get('Content-Type')).toBe('application/vnd.api+json')
    })

    test('should pass FormData through', () => {
      const form = new FormData()

      const init = buildInit(undefined, { body: form })

      expect(init.body).toBe(form)
    })

    test('should mark a stream body as half duplex', () => {
      const init = buildInit(undefined, { body: new ReadableStream() })

      expect(init.duplex).toBe('half')
    })
  })
})
