import type { FetcherError } from './errors'

/** Hooks that run around every request of a {@link Fetcher}, in the order they were added. */
export type FetcherInterceptor = {
  /** Changes the request before it is sent. */
  request?: (request: Request) => Request | Promise<Request>
  /**
   * Changes the response of any status before its body is read. `request` is an unsent copy, so
   * the hook can send it again, such as after a token refresh.
   */
  response?: (response: Response, request: Request) => Response | Promise<Response>
  /** Sees every failure before the caller gets it. A throw rejects the request. */
  error?: (error: FetcherError) => void | Promise<void>
}

/** Runs the request hooks. The result also aborts on the signal of `request`. */
export const interceptRequest = async (
  interceptors: readonly FetcherInterceptor[],
  request: Request,
): Promise<Request> => {
  let next = request

  for (const hook of hooksOf(interceptors, 'request')) {
    next = await hook(next)
  }

  if (next.bodyUsed) throw new TypeError('Fetcher: a request interceptor used up the body')
  if (next === request) return request

  return new Request(next, { signal: AbortSignal.any([request.signal, next.signal]) })
}

/** Sends `request` and runs the response hooks on the response. */
export const fetchIntercepted = async (
  interceptors: readonly FetcherInterceptor[],
  request: Request,
): Promise<Response> => {
  const hooks = hooksOf(interceptors, 'response')
  if (!hooks.length) return fetch(request)

  // `fetch` uses up the body, so each hook gets its own unsent copy. A stream body is buffered.
  const spare = request.clone()
  let response = await fetch(request)

  for (const hook of hooks) {
    response = await replace(response, await hook(response, spare.clone()))
  }

  return response
}

/** Runs the error hooks on `error`. */
export const reportError = async (
  interceptors: readonly FetcherInterceptor[],
  error: FetcherError,
): Promise<void> => {
  for (const hook of hooksOf(interceptors, 'error')) {
    await hook(error)
  }
}

const hooksOf = <K extends keyof FetcherInterceptor>(
  interceptors: readonly FetcherInterceptor[],
  key: K,
): NonNullable<FetcherInterceptor[K]>[] => {
  return interceptors.flatMap(i => i[key] ?? [])
}

// A replaced response that nobody read still holds its connection, so its body is cancelled.
const replace = async (current: Response, next: Response): Promise<Response> => {
  if (next !== current && !current.bodyUsed) await current.body?.cancel()
  return next
}
