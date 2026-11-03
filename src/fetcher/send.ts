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

/** A response with its body read, before the status and the schema are checked. */
export type FetcherReceived = {
  response: Response
  body: Result<unknown, FetcherBadJson>
}

const DEFAULT_TIMEOUT = 60_000

/** Returns the `Request` for `req` and the timeout signal it runs under. */
export const prepare = (
  config: FetcherConfig,
  req: FetcherRequest<StandardSchemaV1>,
): { request: Request; timeout: AbortSignal | undefined } => {
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
    signal: anySignal([timeoutSignal, req.signal]),
  })

  return { request, timeout: timeoutSignal }
}

/** Sends `request` and reads the body. Returns a failure that ends the request as an `Err`. */
export const send = async (
  request: Request,
  method: FetcherMethod,
  timeout: AbortSignal | undefined,
): Promise<Result<FetcherReceived, FetcherError>> => {
  try {
    const response = await fetch(request)
    return ok({ response, body: await readBody(response, method) })
  } catch (e) {
    return err(toFetcherError(e, request, timeout))
  }
}

/** Turns a received response into the result: a non-2xx status, a bad body, or the data. */
export const settle = async <S extends StandardSchemaV1>(
  request: Request,
  { response, body }: FetcherReceived,
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
