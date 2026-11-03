import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { isPlainObject } from '#helpers'
import { errorOf, valueOf } from '#tests'

import {
  FetcherAbortError,
  FetcherHttpError,
  FetcherNetworkError,
  FetcherParseError,
  FetcherTimeoutError,
} from './errors'
import { Fetcher } from './fetcher'
import type { StandardSchemaV1 } from './standard-schema'
import { FetcherMethod } from './types'

type User = { id: number }

const UserSchema: StandardSchemaV1<unknown, User> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: value => {
      if (isUser(value)) return { value }

      return { issues: [{ message: 'not a user' }] }
    },
  },
}

const isUser = (value: unknown): value is User => {
  return isPlainObject(value) && typeof value.id === 'number'
}

const echo = async (req: Request): Promise<Response> => {
  return Response.json({
    method: req.method,
    contentType: req.headers.get('Content-Type'),
    token: req.headers.get('X-Token'),
    search: new URL(req.url).search,
    body: await req.text(),
  })
}

const ROUTES: Record<string, (req: Request) => Response | Promise<Response>> = {
  '/api/user': () => Response.json({ id: 1 }),
  '/api/echo': echo,
  '/api/text': () => new Response('hello'),
  '/api/text-upper': () => new Response('hi', { headers: { 'Content-Type': 'Text/Plain' } }),
  '/api/bytes': () => new Response(new Uint8Array([1, 2])),
  '/api/empty': () => new Response(null, { status: 204 }),
  '/api/bad-json': () => new Response('{', { headers: { 'Content-Type': 'application/json' } }),
  '/api/missing': () => Response.json({ error: 'missing' }, { status: 404 }),
  '/api/bad-json-404': () => {
    return new Response('{oops', { status: 404, headers: { 'Content-Type': 'application/json' } })
  },
  '/api/slow': async () => {
    await Bun.sleep(200)
    return Response.json({ id: 2 })
  },
}

let server: ReturnType<typeof Bun.serve>
let baseUrl: string
let api: Fetcher

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch: req => ROUTES[new URL(req.url).pathname]?.(req) ?? new Response(null, { status: 500 }),
  })
  baseUrl = new URL('/api', server.url).href
  api = new Fetcher({ baseUrl })
})

afterAll(async () => {
  await server.stop(true)
})

describe('Fetcher', () => {
  describe('constructor', () => {
    test('should throw a TypeError for a relative base URL', () => {
      expect(() => new Fetcher({ baseUrl: '/api' })).toThrow(TypeError)
    })
  })

  describe('get', () => {
    test('should read a JSON body', async () => {
      const res = await api.get('/user')

      expect(valueOf(res).data).toEqual({ id: 1 })
      expect(valueOf(res).status).toBe(200)
    })

    test('should type data as unknown without a schema', async () => {
      const { data } = valueOf(await api.get('/user'))

      // @ts-expect-error: `data` is `unknown` without a schema
      expect(data.id).toBe(1)
    })

    test('should type and validate data with a schema', async () => {
      const res = await api.get('/user', { schema: UserSchema })

      const user: User = valueOf(res).data

      expect(user.id).toBe(1)
    })

    test('should return a FetcherParseError when the schema rejects the body', async () => {
      const res = await api.get('/text', { schema: UserSchema })

      const error = errorOf(res)

      expect(error).toBeInstanceOf(FetcherParseError)
      expect(error instanceof FetcherParseError && error.issues).toHaveLength(1)
    })

    test('should return a FetcherParseError for bad JSON', async () => {
      const res = await api.get('/bad-json')

      expect(errorOf(res)).toBeInstanceOf(FetcherParseError)
    })

    test('should read a text body as a string', async () => {
      const res = await api.get('/text')

      expect(valueOf(res).data).toBe('hello')
    })

    test('should read any other body as a Blob', async () => {
      const res = await api.get('/bytes')

      expect(valueOf(res).data).toBeInstanceOf(Blob)
    })

    test('should read a text body regardless of the media type case', async () => {
      const res = await api.get('/text-upper')

      expect(valueOf(res).data).toBe('hi')
    })

    test('should send the query', async () => {
      const res = await api.get('/echo', { query: { page: 2, tag: ['a', 'b'] } })

      expect(valueOf(res).data).toMatchObject({ search: '?page=2&tag=a&tag=b' })
    })

    test('should read a 204 body as undefined', async () => {
      const res = await api.get('/empty')

      expect(valueOf(res).data).toBeUndefined()
    })

    test('should return a FetcherHttpError with the body for a non-2xx status', async () => {
      const res = await api.get('/missing')

      const error = errorOf(res)

      expect(error).toBeInstanceOf(FetcherHttpError)
      expect(error instanceof FetcherHttpError && error.response.data).toEqual({ error: 'missing' })
    })

    test('should keep the raw text of a bad JSON error body', async () => {
      const res = await api.get('/bad-json-404')

      const error = errorOf(res)

      expect(error instanceof FetcherHttpError && error.response.data).toBe('{oops')
    })

    test('should return a FetcherNetworkError when the server is down', async () => {
      const down = Bun.serve({ port: 0, fetch: () => new Response() })
      const url = down.url.href
      await down.stop(true)

      const res = await new Fetcher({ baseUrl: url }).get('/user')

      expect(errorOf(res)).toBeInstanceOf(FetcherNetworkError)
    })
  })

  describe('request', () => {
    test('should read a HEAD body as undefined', async () => {
      const res = await api.request({ method: FetcherMethod.Head, endpoint: '/user' })

      expect(valueOf(res).data).toBeUndefined()
    })

    test('should not send the instance headers to another origin', async () => {
      const other = Bun.serve({ port: 0, fetch: echo })
      const authed = api.with({ headers: { 'X-Token': 'secret' } })

      const res = await authed.get(other.url.href)
      await other.stop(true)

      expect(valueOf(res).data).toMatchObject({ token: null })
    })
  })

  describe('timeout', () => {
    test('should return a FetcherTimeoutError past the request timeout', async () => {
      const res = await api.get('/slow', { timeout: 20 })

      expect(errorOf(res)).toBeInstanceOf(FetcherTimeoutError)
    })

    test('should use the instance timeout', async () => {
      const res = await api.with({ timeout: 20 }).get('/slow')

      expect(errorOf(res)).toBeInstanceOf(FetcherTimeoutError)
    })

    test('should wait without a timeout when it is false', async () => {
      const res = await api.with({ timeout: 20 }).get('/slow', { timeout: false })

      expect(valueOf(res).data).toEqual({ id: 2 })
    })
  })

  describe('signal', () => {
    test('should return a FetcherAbortError when the caller aborts', async () => {
      const controller = new AbortController()

      const pending = api.get('/slow', { signal: controller.signal })
      controller.abort()

      expect(errorOf(await pending)).toBeInstanceOf(FetcherAbortError)
    })

    test('should return a FetcherAbortError for a signal aborted before the request', async () => {
      const res = await api.get('/user', { signal: AbortSignal.abort() })

      expect(errorOf(res)).toBeInstanceOf(FetcherAbortError)
    })
  })

  describe('post', () => {
    test('should send a plain object as JSON', async () => {
      const res = await api.post('/echo', { body: { a: 1 } })

      expect(valueOf(res).data).toMatchObject({
        method: 'POST',
        contentType: 'application/json',
        body: '{"a":1}',
      })
    })

    test('should send a stream body', async () => {
      const body = new Blob(['streamed']).stream()

      const res = await api.post('/echo', { body })

      expect(valueOf(res).data).toMatchObject({ body: 'streamed' })
    })
  })

  describe('constructor copy', () => {
    test('should not see a later change to the caller headers', async () => {
      const headers = new Headers({ 'X-Token': 'a' })
      const fetcher = new Fetcher({ baseUrl, headers })

      headers.set('X-Token', 'b')

      expect(valueOf(await fetcher.get('/echo')).data).toMatchObject({ token: 'a' })
    })
  })

  describe('with', () => {
    test('should merge headers into a new instance', async () => {
      const base = api.with({ headers: { 'X-Token': 'a', 'X-Other': 'b' } })

      const authed = base.with({ headers: { 'x-token': 'c' } })

      expect(valueOf(await authed.get('/echo')).data).toMatchObject({ token: 'c' })
      expect(valueOf(await base.get('/echo')).data).toMatchObject({ token: 'a' })
    })

    test('should leave the original instance unchanged', async () => {
      api.with({ timeout: 20 })

      const res = await api.get('/slow')

      expect(valueOf(res).data).toEqual({ id: 2 })
    })

    test('should pass fetch options through to the request', async () => {
      const res = await api.with({ credentials: 'include', mode: 'same-origin' }).get('/missing')

      const { request } = errorOf(res)

      expect(request.credentials).toBe('include')
      expect(request.mode).toBe('same-origin')
    })
  })
})
