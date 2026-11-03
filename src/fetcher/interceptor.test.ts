import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { apiUrl, errorOf, serve, type TestServer, valueOf } from '#tests'

import { type FetcherError, FetcherHttpError, FetcherTimeoutError } from './errors'
import { Fetcher } from './fetcher'
import type { FetcherInterceptor } from './interceptor'

const TOKEN = 'fresh'

const withToken = (req: Request): Request => {
  req.headers.set('X-Token', TOKEN)
  return req
}

const tagged = (tag: string, calls: string[]): FetcherInterceptor => ({
  request: req => {
    calls.push(tag)
    return req
  },
})

let server: TestServer
let api: Fetcher

beforeAll(() => {
  server = serve({
    '/api/token': req => Response.json(req.headers.get('X-Token')),
    '/api/guarded': async req => {
      if (req.headers.get('X-Token') !== TOKEN) return new Response(null, { status: 401 })
      return Response.json(await req.text())
    },
    '/api/missing': () => new Response(null, { status: 404 }),
    '/api/slow': async () => {
      await Bun.sleep(200)
      return Response.json(null)
    },
  })
  api = new Fetcher({ baseUrl: apiUrl(server) })
})

afterAll(async () => {
  await server.stop(true)
})

describe('FetcherInterceptor', () => {
  describe('request', () => {
    test('should change the request before it is sent', async () => {
      const authed = api.with({ interceptors: [{ request: withToken }] })

      const res = await authed.get('/token')

      expect(valueOf(res).data).toBe(TOKEN)
    })

    test('should run the hooks in the order they were added', async () => {
      const calls: string[] = []
      const fetcher = new Fetcher({
        baseUrl: apiUrl(server),
        interceptors: [tagged('first', calls)],
      })

      await fetcher.with({ interceptors: [tagged('second', calls)] }).get('/token')

      expect(calls).toEqual(['first', 'second'])
    })

    test('should keep the timeout when a hook returns a request without a signal', async () => {
      const hooked = api.with({ interceptors: [{ request: req => new Request(req.url) }] })

      const res = await hooked.get('/slow', { timeout: 50 })

      expect(errorOf(res)).toBeInstanceOf(FetcherTimeoutError)
    })
  })

  describe('request bug', () => {
    test('should reject when a hook throws', async () => {
      const broken = api.with({
        interceptors: [{ request: () => Promise.reject(new TypeError()) }],
      })

      const pending = broken.get('/token')

      await expect(pending).rejects.toBeInstanceOf(TypeError)
    })

    test('should reject when a hook uses up the body', async () => {
      const reader: FetcherInterceptor = { request: async req => (await req.text(), req) }

      const pending = api.with({ interceptors: [reader] }).post('/guarded', { body: 'x' })

      await expect(pending).rejects.toBeInstanceOf(TypeError)
    })
  })

  describe('response', () => {
    test('should send the request again with its body', async () => {
      const refresh: FetcherInterceptor = {
        response: (res, req) => (res.status === 401 ? fetch(withToken(req)) : res),
      }

      const res = await api.with({ interceptors: [refresh] }).post('/guarded', { body: { a: 1 } })

      expect(valueOf(res).data).toBe('{"a":1}')
    })
  })

  describe('error', () => {
    test('should see the failure that the caller gets', async () => {
      const seen: FetcherError[] = []
      const watched = api.with({ interceptors: [{ error: e => void seen.push(e) }] })

      const error = errorOf(await watched.get('/missing'))

      expect(error).toBeInstanceOf(FetcherHttpError)
      expect(seen).toEqual([error])
    })

    test('should see a timeout', async () => {
      const seen: FetcherError[] = []
      const watched = api.with({ interceptors: [{ error: e => void seen.push(e) }] })

      await watched.get('/slow', { timeout: 20 })

      expect(seen[0]).toBeInstanceOf(FetcherTimeoutError)
    })

    test('should reject when a hook throws', async () => {
      const broken = api.with({ interceptors: [{ error: () => Promise.reject(new Error()) }] })

      const pending = broken.get('/missing')

      await expect(pending).rejects.toBeInstanceOf(Error)
    })

    test('should not run on success', async () => {
      const seen: FetcherError[] = []
      const watched = api.with({ interceptors: [{ error: e => void seen.push(e) }] })

      await watched.get('/token')

      expect(seen).toEqual([])
    })
  })
})
