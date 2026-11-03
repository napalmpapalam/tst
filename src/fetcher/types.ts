import type { StandardSchemaV1 } from './standard-schema'

/** The HTTP methods that {@link Fetcher} sends. */
export enum FetcherMethod {
  Get = 'GET',
  Head = 'HEAD',
  Post = 'POST',
  Put = 'PUT',
  Patch = 'PATCH',
  Delete = 'DELETE',
  Options = 'OPTIONS',
}

/** The `fetch` options that a {@link Fetcher} passes through unchanged. */
export type FetcherInit = Pick<
  RequestInit,
  'cache' | 'credentials' | 'mode' | 'referrer' | 'referrerPolicy'
>

/** The configuration of a {@link Fetcher}. */
export type FetcherConfig = FetcherInit & {
  /** The URL that every relative endpoint is resolved against. */
  baseUrl: string
  headers?: HeadersInit
  /** Milliseconds before a request fails with a timeout, or `false` for none. Default 60 s. */
  timeout?: number | false
}

/** A query value. `undefined` skips the key, and an array repeats it. */
export type FetcherQueryValue = string | number | boolean | undefined

/** The query parameters of a request. */
export type FetcherQuery = Record<string, FetcherQueryValue | readonly FetcherQueryValue[]>

/** A request body. A plain object or an array is sent as JSON. */
export type FetcherBody = BodyInit | Record<string, unknown> | readonly unknown[]

/** The options of one request. */
export type FetcherRequestOpts<S extends StandardSchemaV1 = never> = {
  query?: FetcherQuery
  body?: FetcherBody
  /** Merged over the headers of the {@link Fetcher}. */
  headers?: HeadersInit
  /** Overrides the timeout of the {@link Fetcher}. */
  timeout?: number | false
  /** Aborts the request. The result is then a `FetcherAbortError`. */
  signal?: AbortSignal
  /** Validates the body of a 2xx response and types `data` from it. */
  schema?: S
}

/** A request for {@link Fetcher.request}. */
export type FetcherRequest<S extends StandardSchemaV1 = never> = FetcherRequestOpts<S> & {
  method: FetcherMethod
  endpoint: string
}

/** The type of `data`: the schema output, or `unknown` without a schema. */
export type FetcherData<S extends StandardSchemaV1> = [S] extends [never]
  ? unknown
  : StandardSchemaV1.InferOutput<S>

/** A received response with its body read. */
export type FetcherResponse<T> = {
  status: number
  statusText: string
  headers: Headers
  url: string
  /** The body: JSON, a string for `text/*`, a `Blob` otherwise, `undefined` when empty. */
  data: T
}
