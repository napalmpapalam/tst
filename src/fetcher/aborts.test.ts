import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { apiUrl, errorOf, serve, type TestServer, valueOf } from '#tests'

import { FetcherAbortError } from './errors'
import { Fetcher } from './fetcher'
import type { FetcherInterceptor } from './interceptor'

let server: TestServer
let api: Fetcher

beforeAll(() => {
  server = serve({
    '/api/fast': () => Response.json(null),
    '/api/slow': async () => {
      await Bun.sleep(100)
      return Response.json(null)
    },
  })
  api = new Fetcher({ baseUrl: apiUrl(server) })
})

afterAll(async () => {
  await server.stop(true)
})

describe('Fetcher', () => {
  describe('abort', () => {
    test('should return true for an id with a request in flight', async () => {
      const pending = api.get('/slow', { id: 'a' })

      const aborted = api.abort('a')
      await pending

      expect(aborted).toBe(true)
    })

    test('should abort every in-flight request with the id', async () => {
      const pending = [api.get('/slow', { id: 'f' }), api.get('/slow', { id: 'f' })]

      api.abort('f')
      const errors = (await Promise.all(pending)).map(errorOf)

      expect(errors.every(e => e instanceof FetcherAbortError)).toBe(true)
    })

    test('should abort a request whose response hook is still running', async () => {
      const transform: FetcherInterceptor = {
        response: async res => {
          const text = await res.text()
          await Bun.sleep(100)
          return new Response(text)
        },
      }
      const slowHook = api.with({ interceptors: [transform] })
      const pending = slowHook.get('/fast', { id: 'g' })
      await Bun.sleep(20)

      slowHook.abort('g')

      expect(errorOf(await pending)).toBeInstanceOf(FetcherAbortError)
    })

    test('should leave a request with another id', async () => {
      const pending = api.get('/slow', { id: 'b' })

      api.abort('c')

      expect(valueOf(await pending).data).toBeNull()
    })

    test('should return false for an id with no request in flight', async () => {
      await api.get('/slow', { id: 'd' })

      expect(api.abort('d')).toBe(false)
    })

    test('should abort a later request with a reused id', async () => {
      const first = api.get('/slow', { id: 'e' })
      api.abort('e')
      const second = api.get('/slow', { id: 'e' })
      await first

      const aborted = api.abort('e')

      expect(aborted).toBe(true)
      expect(errorOf(await second)).toBeInstanceOf(FetcherAbortError)
    })
  })
})
