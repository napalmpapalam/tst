import type { Result } from '#result'

import { FetcherAborts } from './aborts'
import type { FetcherError } from './errors'
import { type FetcherInterceptor, reportError } from './interceptor'
import { mergeHeaders } from './request'
import { type FetcherSendConfig, prepare, send, settle } from './send'
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

  readonly #config: FetcherSendConfig
  readonly #interceptors: readonly FetcherInterceptor[]
  readonly #aborts = new FetcherAborts()

  /** @throws TypeError when `baseUrl` is not an absolute URL. */
  public constructor(config: FetcherConfig) {
    if (!URL.canParse(config.baseUrl)) {
      throw new TypeError(`Fetcher: baseUrl is not an absolute URL: ${config.baseUrl}`)
    }

    // A copy, so a later change to the caller's object or headers does not reach this instance.
    const { interceptors = [], ...rest } = config
    this.#config = { ...rest, headers: new Headers(config.headers) }
    this.#interceptors = [...interceptors]
  }

  /**
   * Returns a new {@link Fetcher} with `config` merged over this one. Headers merge by name, and
   * interceptors are added after the current ones.
   */
  public with(config: Partial<FetcherConfig>): Fetcher {
    return new Fetcher({
      ...this.#config,
      ...config,
      headers: mergeHeaders(this.#config.headers, config.headers),
      interceptors: [...this.#interceptors, ...(config.interceptors ?? [])],
    })
  }

  /** Sends a request with any {@link FetcherMethod}. */
  public async request<S extends StandardSchemaV1 = never>(
    req: FetcherRequest<S>,
  ): Promise<FetcherResult<S>> {
    const result = await this.#track(req)

    // After the id is released, so `abort(id)` does not count a request that has settled.
    if (!result.ok) await reportError(this.#interceptors, result.error)

    return result
  }

  /** Aborts every in-flight request with `id`. Returns `false` when there is none. */
  public abort(id: string): boolean {
    return this.#aborts.abort(id)
  }

  #track<S extends StandardSchemaV1>(req: FetcherRequest<S>): Promise<FetcherResult<S>> {
    const { id } = req

    if (id === undefined) return this.#send(req)

    return this.#aborts.track(id, signal => this.#send(req, signal))
  }

  async #send<S extends StandardSchemaV1>(
    req: FetcherRequest<S>,
    keyed?: AbortSignal,
  ): Promise<FetcherResult<S>> {
    const prepared = prepare(this.#config, req, keyed)
    const received = await send(prepared, req.method, this.#interceptors)
    return received.ok ? settle(received.value, req.schema) : received
  }

  #verb(method: FetcherMethod): FetcherVerb {
    return (endpoint, opts = {}) => this.request({ ...opts, endpoint, method })
  }
}
