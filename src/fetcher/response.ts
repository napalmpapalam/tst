import { err, ok, Result } from '#result'

import { FetcherParseError } from './errors'
import type { StandardSchemaV1 } from './standard-schema'
import { type FetcherData, FetcherMethod, type FetcherResponse } from './types'

/** A JSON body that does not parse. The text stays, so an error response can still show it. */
export type FetcherBadJson = {
  text: string
  cause: SyntaxError
}

// https://fetch.spec.whatwg.org/#null-body-status
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304])

/** Reads the body by its Content-Type. An empty body is `undefined`. */
export const readBody = async (
  response: Response,
  method: FetcherMethod,
): Promise<Result<unknown, FetcherBadJson>> => {
  if (method === FetcherMethod.Head || NULL_BODY_STATUSES.has(response.status)) {
    return ok(undefined)
  }

  const type = mediaType(response.headers.get('Content-Type'))
  if (type.endsWith('/json') || type.endsWith('+json')) return parseJson(await response.text())
  if (type.startsWith('text/')) return ok((await response.text()) || undefined)

  const blob = await response.blob()
  return ok(blob.size ? blob : undefined)
}

/** Returns the response fields with `data` in place of the body. */
export const toFetcherResponse = <T>(response: Response, data: T): FetcherResponse<T> => ({
  status: response.status,
  statusText: response.statusText,
  headers: response.headers,
  url: response.url,
  data,
})

/** Runs `schema` on `data`, or passes `data` through without one. */
export function validate<S extends StandardSchemaV1>(
  request: Request,
  data: unknown,
  schema: S | undefined,
): Promise<Result<FetcherData<S>, FetcherParseError>>
export async function validate(
  request: Request,
  data: unknown,
  schema: StandardSchemaV1 | undefined,
): Promise<Result<unknown, FetcherParseError>> {
  if (!schema) return ok(data)

  const res = await schema['~standard'].validate(data)
  if (res.issues) return err(new FetcherParseError(request, { issues: res.issues }))
  return ok(res.value)
}

// The essence of a Content-Type, without parameters: `Text/HTML; charset=utf-8` → `text/html`.
const mediaType = (header: string | null): string => {
  return header?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

const parseJson = (text: string): Result<unknown, FetcherBadJson> => {
  if (!text) return ok(undefined)
  const res = Result.try((): unknown => JSON.parse(text), SyntaxError)
  return res.ok ? res : err({ text, cause: res.error })
}
