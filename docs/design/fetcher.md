# fetcher

`Fetcher` is an HTTP client on `fetch`. It builds the request from a base URL and options, reads
the body, and returns every expected failure as an `Err` of a [`Result`](result.md).

## How it works

- `prepare` builds one `Request`: the URL, the headers, the body and one combined `AbortSignal`
  (the timeout and the caller `signal`). — `src/fetcher/send.ts`
- `send` runs `fetch` and reads the body in one `try`. A rejection becomes a `FetcherError`
  there, so a timeout or abort during the body read gets the same class as one before it.
- `settle` checks the status, then the body, then the schema, in that order.
- The body is read by the media type of `Content-Type`: JSON for `*/json` and `+json`, a string
  for `text/*`, a `Blob` for the rest. A null-body status, a `HEAD`, or an empty body gives
  `undefined`. — `src/fetcher/response.ts`
- A plain object or array request body becomes JSON and gets `Content-Type: application/json`,
  unless the caller set a content type. A `ReadableStream` body gets `duplex: 'half'`, which Node
  needs. — `src/fetcher/request.ts`
- `get`, `post`, `put`, `patch` and `delete` are bound copies of `request` with a fixed method.

## Invariants

- **Every expected failure is an `Err`**, never a throw: a non-2xx status (`FetcherHttpError`),
  a connection failure (`FetcherNetworkError`), a timeout (`FetcherTimeoutError`), a caller abort
  (`FetcherAbortError`), and a bad JSON body or schema failure (`FetcherParseError`). Any other
  error is rethrown, and a bad argument throws a `TypeError`.
- **A timeout and an abort are told apart by the signal reason**, not by the error. Both reject
  with a `DOMException`. The `Request` signal keeps the reason of the first source that fired, so
  a late second abort does not change the class.
- **The config is fixed after construction.** The constructor copies it and its headers, so a
  later change to the caller's object does not reach the instance.
- **Instance headers go only to the base URL origin.** An absolute endpoint on another origin
  gets only the request headers, so a token in the instance headers does not leak.
- **The base URL keeps its credentials and query** when an endpoint is joined to it.
- **`data` is `unknown` without a schema.** With a schema, it is the schema output.

## Decisions

- **One error class per failure, under an abstract `FetcherError`** — the caller narrows with
  `instanceof`; rejected one class with a `kind` enum, because then `response` is optional on
  every kind and an HTTP error does not narrow to "has a response".
- **Standard Schema for `data`** — any validator (zod, valibot, arktype) types and checks the
  body, with zero dependencies: the spec's types are copied into `standard-schema.ts`, as the
  spec advises. Rejected a `get<T>()` generic, because it is an unchecked cast; rejected always
  `unknown`, because every call site then repeats the parse.
- **The body is read by its media type, once** — rejected a JSON → FormData → Blob fallback
  chain, because it turns a non-JSON error page into a `Blob` without a trace. A non-2xx JSON body
  that does not parse keeps its raw text as `data`, so the error still shows what the server
  said.
- **Immutable config, `with(partial)` returns a new `Fetcher`** — against the `dd:ts:library`
  `use*`/`with*` rule. A shared instance never changes under another holder. Headers merge by
  name, case-insensitively; the other fields override.
- **Timeout 60 s by default; `false` turns it off** — a CLI or test run does not hang on a dead
  server. `false`, not `0`, so no number has a hidden meaning. Built on `AbortSignal.timeout`, so
  no timer needs clearing.
- **No forced `credentials`, `cache`, `mode` or `referrerPolicy`** — the `fetch` defaults hold,
  and the caller's values pass through unchanged.
- **Query arrays repeat the key** (`?id=1&id=2`), and an `undefined` value skips its key.
- **Verbs are bound instance fields**, not prototype methods — one factory, not five copies of
  the same signature. `spyOn(Fetcher.prototype, 'get')` does not work; spy on the instance.

## Known gaps

- An explicit type argument without a schema, such as `get<typeof S>('/x')`, types `data` as the
  schema output, and nothing checks it. The `validate` overload is the cast that allows it.
- No interceptors, no abort by request id, no retry, no streaming of the response, no progress.
