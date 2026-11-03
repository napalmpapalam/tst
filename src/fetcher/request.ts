import { isAbsoluteUrl, isDefined, isPlainObject } from '#helpers'

import type { FetcherBody, FetcherQuery } from './types'

const JSON_CONTENT_TYPE = 'application/json'

// The lib types lack `duplex`, which Node needs for a stream body.
type StreamInit = RequestInit & { duplex?: 'half' }

/** Returns `endpoint` resolved against `baseUrl`, with `query` appended. */
export const buildUrl = (baseUrl: string, endpoint: string, query: FetcherQuery = {}): URL => {
  const url = isAbsoluteUrl(endpoint) ? new URL(endpoint) : join(baseUrl, endpoint)

  Object.entries(query).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value]

    values.filter(isDefined).forEach(v => {
      url.searchParams.append(key, String(v))
    })
  })

  return url
}

/** Returns one `Headers` with `override` set over `base`. */
export const mergeHeaders = (base?: HeadersInit, override?: HeadersInit): Headers => {
  const headers = new Headers(base)

  new Headers(override).forEach((value, key) => {
    headers.set(key, value)
  })

  return headers
}

/** Returns the headers, body and `duplex` of a request. A plain object or array becomes JSON. */
export const buildInit = (
  baseHeaders: HeadersInit | undefined,
  opts: { headers?: HeadersInit; body?: FetcherBody },
): StreamInit => {
  const headers = mergeHeaders(baseHeaders, opts.headers)

  if (opts.body === undefined) return { headers }
  if (opts.body instanceof ReadableStream) return { headers, body: opts.body, duplex: 'half' }
  if (!isJsonBody(opts.body)) return { headers, body: opts.body }
  if (!headers.has('Content-Type')) headers.set('Content-Type', JSON_CONTENT_TYPE)

  return { headers, body: JSON.stringify(opts.body) }
}

// Edits a copy of the base, so its credentials and query stay.
const join = (baseUrl: string, endpoint: string): URL => {
  const url = new URL(baseUrl)
  const rel = new URL(endpoint, 'http://x')

  url.pathname = `${url.pathname.replace(/\/+$/, '')}${rel.pathname}`
  url.hash = rel.hash
  rel.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value)
  })

  return url
}

const isJsonBody = (body: FetcherBody): body is Record<string, unknown> | readonly unknown[] => {
  return Array.isArray(body) || isPlainObject(body)
}
