import type { StandardSchemaV1 } from './standard-schema'
import type { FetcherResponse } from './types'

/** The base of every expected {@link Fetcher} failure. */
export abstract class FetcherError extends Error {
  public override name = 'FetcherError'
  public readonly request: Request

  public constructor(request: Request, problem: string, opts?: ErrorOptions) {
    super(`Fetcher: ${request.method} ${request.url} ${problem}`, opts)
    this.request = request
  }
}

/** The server answered with a non-2xx status. */
export class FetcherHttpError extends FetcherError {
  public override name = 'FetcherHttpError'
  public readonly response: FetcherResponse<unknown>

  public constructor(request: Request, response: FetcherResponse<unknown>) {
    super(request, `failed with ${response.status}`)
    this.response = response
  }
}

/** The request did not reach the server, or the connection broke. */
export class FetcherNetworkError extends FetcherError {
  public override name = 'FetcherNetworkError'

  public constructor(request: Request, cause: unknown) {
    super(request, 'failed to connect', { cause })
  }
}

/** The request ran past its timeout. */
export class FetcherTimeoutError extends FetcherError {
  public override name = 'FetcherTimeoutError'

  public constructor(request: Request, cause: unknown) {
    super(request, 'timed out', { cause })
  }
}

/** The caller aborted the request through its `signal`. */
export class FetcherAbortError extends FetcherError {
  public override name = 'FetcherAbortError'

  public constructor(request: Request, cause: unknown) {
    super(request, 'was aborted', { cause })
  }
}

/** The body of a 2xx response is not valid JSON, or the schema rejected it. */
export class FetcherParseError extends FetcherError {
  public override name = 'FetcherParseError'
  /** The schema issues, empty when the JSON itself was bad. */
  public readonly issues: readonly StandardSchemaV1.Issue[]

  public constructor(
    request: Request,
    opts: { issues?: readonly StandardSchemaV1.Issue[]; cause?: unknown },
  ) {
    super(request, 'returned an unexpected body', opts)
    this.issues = opts.issues ?? []
  }
}
