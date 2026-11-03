import type { Result } from '#result'

import type { FetcherError } from './errors'
import { mergeHeaders } from './request'
import { prepare, send, settle } from './send'
import type { StandardSchemaV1 } from './standard-schema'
import {
  type FetcherConfig,
  type FetcherData,
  FetcherMethod,
  type FetcherRequest,
  type FetcherRequestOpts,
  type FetcherResponse,
} from './types'

/** The outcome of a {@link Fetcher} request. */
export type FetcherResult<S extends StandardSchemaV1 = never> = Result<
  FetcherResponse<FetcherData<S>>,
  FetcherError
>

/** A request method bound to one HTTP method, such as {@link Fetcher.get}. */
export type FetcherVerb = <S extends StandardSchemaV1 = never>(
  endpoint: string,
  opts?: FetcherRequestOpts<S>,
) => Promise<FetcherResult<S>>

/**
 * An HTTP client on `fetch` that returns every expected failure as an `Err`.
 *
 * @example
 * ```ts
 * const api = new Fetcher({ baseUrl: 'https://api.example.com' })
 * const res = await api.get('/users', { query: { page: 2 }, schema: UsersSchema })
 *
 * if (!res.ok) return res.error instanceof FetcherHttpError ? res.error.response.status : 0
 *
 * res.value.data // User[]
 * ```
 */
export class Fetcher {
  /** Sends a `GET`. */
  public readonly get: FetcherVerb = this.#verb(FetcherMethod.Get)
  /** Sends a `POST`. */
  public readonly post: FetcherVerb = this.#verb(FetcherMethod.Post)
  /** Sends a `PUT`. */
  public readonly put: FetcherVerb = this.#verb(FetcherMethod.Put)
  /** Sends a `PATCH`. */
  public readonly patch: FetcherVerb = this.#verb(FetcherMethod.Patch)
  /** Sends a `DELETE`. */
  public readonly delete: FetcherVerb = this.#verb(FetcherMethod.Delete)

  readonly #config: FetcherConfig

  /** @throws TypeError when `baseUrl` is not an absolute URL. */
  public constructor(config: FetcherConfig) {
    if (!URL.canParse(config.baseUrl)) {
      throw new TypeError(`Fetcher: baseUrl is not an absolute URL: ${config.baseUrl}`)
    }

    // A copy, so a later change to the caller's object or headers does not reach this instance.
    this.#config = { ...config, headers: new Headers(config.headers) }
  }

  /** Returns a new {@link Fetcher} with `config` merged over this one. Headers merge by name. */
  public with(config: Partial<FetcherConfig>): Fetcher {
    return new Fetcher({
      ...this.#config,
      ...config,
      headers: mergeHeaders(this.#config.headers, config.headers),
    })
  }

  /** Sends a request with any {@link FetcherMethod}. */
  public async request<S extends StandardSchemaV1 = never>(
    req: FetcherRequest<S>,
  ): Promise<FetcherResult<S>> {
    const { request, timeout } = prepare(this.#config, req)
    const received = await send(request, req.method, timeout)
    if (!received.ok) return received
    return settle(request, received.value, req.schema)
  }

  #verb(method: FetcherMethod): FetcherVerb {
    return (endpoint, opts = {}) => this.request({ ...opts, endpoint, method })
  }
}
