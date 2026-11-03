import { anySignal } from '#helpers'
import { err, ok, type Result } from '#result'

import {
  FetcherAbortError,
  type FetcherError,
  FetcherHttpError,
  FetcherNetworkError,
  FetcherParseError,
  FetcherTimeoutError,
} from './errors'
import { type FetcherInterceptor, fetchIntercepted, interceptRequest } from './interceptor'
import { buildInit, buildUrl } from './request'
import { type FetcherBadJson, readBody, toFetcherResponse, validate } from './response'
import type { StandardSchemaV1 } from './standard-schema'
import type {
  FetcherConfig,
  FetcherData,
  FetcherMethod,
  FetcherRequest,
  FetcherResponse,
} from './types'

/** The config that {@link prepare} reads: all of it but the hooks. */
export type FetcherSendConfig = Omit<FetcherConfig, 'interceptors'>

/** A request to send, and the timeout signal it runs under. */
export type FetcherPrepared = {
  request: Request
  timeout: AbortSignal | undefined
}

/** A response with its body read, before the status and the schema are checked. */
export type FetcherReceived = {
  /** The request as sent, after the request hooks. */
  request: Request
  response: Response
  body: Result<unknown, FetcherBadJson>
}

const DEFAULT_TIMEOUT = 60_000

/** Returns the `Request` for `req`. It aborts on the timeout, `req.signal` or `keyed`. */
export const prepare = (
  config: FetcherSendConfig,
  req: FetcherRequest<StandardSchemaV1>,
  keyed?: AbortSignal,
): FetcherPrepared => {
  const { baseUrl, headers, timeout = DEFAULT_TIMEOUT, ...init } = config
  const ms = req.timeout ?? timeout
  const timeoutSignal = ms === false ? undefined : AbortSignal.timeout(ms)
  const url = buildUrl(baseUrl, req.endpoint, req.query)

  // An absolute endpoint on another origin must not get the instance headers, such as a token.
  const shared = url.origin === new URL(baseUrl).origin ? headers : undefined

  const request = new Request(url, {
    ...init,
    ...buildInit(shared, req),
    method: req.method,
    signal: anySignal([timeoutSignal, req.signal, keyed]),
  })

  return { request, timeout: timeoutSignal }
}

/** Runs the hooks, sends the request and reads the body. A failure that ends it is an `Err`. */
export const send = async (
  prepared: FetcherPrepared,
  method: FetcherMethod,
  interceptors: readonly FetcherInterceptor[],
): Promise<Result<FetcherReceived, FetcherError>> => {
  const sent = await hookRequest(prepared, interceptors)
  if (!sent.ok) return sent
  return receive({ ...prepared, request: sent.value }, method, interceptors)
}

/** Turns a received response into the result: a non-2xx status, a bad body, or the data. */
export const settle = async <S extends StandardSchemaV1>(
  { request, response, body }: FetcherReceived,
  schema?: S,
): Promise<Result<FetcherResponse<FetcherData<S>>, FetcherError>> => {
  if (!response.ok) {
    const data = body.ok ? body.value : body.error.text
    return err(new FetcherHttpError(request, toFetcherResponse(response, data)))
  }

  if (!body.ok) return err(new FetcherParseError(request, { cause: body.error.cause }))

  const data = await validate(request, body.value, schema)
  if (!data.ok) return data
  return ok(toFetcherResponse(response, data.value))
}

// Only an abort or a timeout during a request hook is an `Err`. Any other throw is a bug in a hook.
const hookRequest = async (
  { request, timeout }: FetcherPrepared,
  interceptors: readonly FetcherInterceptor[],
): Promise<Result<Request, FetcherError>> => {
  try {
    return ok(await interceptRequest(interceptors, request))
  } catch (e) {
    if (!request.signal.aborted) throw e

    return err(toFetcherError(e, request, timeout))
  }
}

const receive = async (
  { request, timeout }: FetcherPrepared,
  method: FetcherMethod,
  interceptors: readonly FetcherInterceptor[],
): Promise<Result<FetcherReceived, FetcherError>> => {
  try {
    const response = await fetchIntercepted(interceptors, request)
    // A response hook may return a response that is not tied to the signal.
    request.signal.throwIfAborted()
    return ok({ request, response, body: await readBody(response, method) })
  } catch (e) {
    return err(toFetcherError(e, request, timeout))
  }
}

// Both a timeout and an abort reject with a DOMException. The signal reason tells which came first.
const toFetcherError = (
  e: unknown,
  request: Request,
  timeout: AbortSignal | undefined,
): FetcherError => {
  if (request.signal.aborted && request.signal.reason === timeout?.reason) {
    return new FetcherTimeoutError(request, e)
  }

  if (request.signal.aborted) return new FetcherAbortError(request, e)
  if (e instanceof TypeError) return new FetcherNetworkError(request, e)

  throw e
}
