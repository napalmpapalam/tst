# fetcher

`Fetcher` is an HTTP client on `fetch`. It builds the request from a base URL and options, reads
the body, and returns every expected failure as an `Err` of a [`Result`](result.md).

## How it works

- `prepare` builds one `Request`: the URL, the headers, the body and one combined `AbortSignal`
  (the timeout, the caller `signal`, and the signal of the request `id`). — `src/fetcher/send.ts`
- `send` runs the request hooks, then runs `fetch`, the response hooks and the body read in one
  `try`. A rejection there becomes a `FetcherError`, so a timeout or abort during the body read
  gets the same class as one before it.
- Interceptors are hooks in the config, run in the order they were added: `request` changes the
  `Request`, `response` changes the `Response` of any status before the body read, and `error`
  sees every `FetcherError` before the caller does. — `src/fetcher/interceptor.ts`
- The response hook gets an unsent copy of the request, so it can send it again, such as after
  a token refresh. A response that a hook replaces and nobody read has its body cancelled.
- A request with an `id` is in a per-`Fetcher` registry until it settles. `abort(id)` aborts
  every in-flight request with that id. — `src/fetcher/aborts.ts`
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
  a late second abort does not change the class. An abort by `id` is a `FetcherAbortError`.
- **A request hook cannot drop the signal.** A hook that returns a new `Request` gets the
  original signal combined with its own. A hook that uses up the body throws a `TypeError`.
- **A bug in a request hook or an error hook rejects the request.** Only an abort or a timeout
  during a request hook becomes an `Err`; any other throw is rethrown.
- **An abort during a response hook still wins.** The signal is checked after the hooks, so a
  hook that returns a new `Response` does not hide the abort.
- **The error hooks run after the `id` is released**, so `abort(id)` returns `false` for a
  request that has settled.
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
- **Interceptors work on the built-in `Request` and `Response`** — the response hook runs before
  the body read, so it can send the request again; rejected the upstream hooks on a parsed
  response, because they cannot re-send.
- **Interceptors live in the config, and `with()` adds them after the current ones** — a derived
  `Fetcher` keeps the parent's hooks; rejected `with()` replacing them, because without a config
  getter a caller cannot read the list to repeat it; rejected `addInterceptor`/`removeInterceptor`,
  because they change a shared instance.
- **The error hook observes; it returns nothing** — the caller still handles each `Err`; a
  throwing error hook is a bug and rejects the request, rejected swallowing it.
- **The caller picks the request `id`, and several requests can share it** — `abort(id)` aborts
  them all and returns whether there was one. Rejected generated ids, because the caller never
  sees them; rejected "a new request aborts the old one with the same id", because a plain `get()`
  then has a hidden side effect. Each `Fetcher` has its own registry; one made by `with()` does
  not share it.
- **Verbs are bound instance fields**, not prototype methods — one factory, not five copies of
  the same signature. `spyOn(Fetcher.prototype, 'get')` does not work; spy on the instance.

## Known gaps

- An explicit type argument without a schema, such as `get<typeof S>('/x')`, types `data` as the
  schema output, and nothing checks it. The `validate` overload is the cast that allows it.
- A `TypeError` from a bug in a response hook reads as a `FetcherNetworkError`: the hook's own
  re-fetch fails with a `TypeError` too, and the two look the same.
- With a response hook, a `ReadableStream` request body is buffered for the unsent copy.
- No retry, no streaming of the response, no progress.
