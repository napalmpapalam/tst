# @napalmpapalam/tst

A small TypeScript toolkit. Each area is a separate subpath export, so you load only what you
import.

| Import                       | Contents                                                           |
| ---------------------------- | ------------------------------------------------------------------ |
| `@napalmpapalam/tst/result`  | `Result<T, E>`, `Ok`, `Err`, `ok()`, `err()`, `Result.try()`       |
| `@napalmpapalam/tst/fetcher` | `Fetcher`, an HTTP client on `fetch` that returns `Result`         |
| `@napalmpapalam/tst/helpers` | `isPlainObject()`, `isDefined()`, `isAbsoluteUrl()`, `anySignal()` |

## Result

```ts
import { Result } from '@napalmpapalam/tst/result'

const res = Result.try(() => JSON.parse(raw), SyntaxError)
if (!res.ok) return res.error.message

use(res.value)
```

`Result.try` catches only the class you pass. Any other error still throws.

## Fetcher

```ts
import { Fetcher, FetcherHttpError } from '@napalmpapalam/tst/fetcher'

const api = new Fetcher({ baseUrl: 'https://api.example.com', timeout: 10_000 })
const res = await api.get('/users', { query: { page: 2 }, schema: UsersSchema })

if (!res.ok) {
  if (res.error instanceof FetcherHttpError) return res.error.response.status
  throw res.error
}

res.value.data // typed by the schema
```

- **Errors:** a non-2xx status, a network failure, a timeout, an abort and a bad body come back
  as `Err` with a `FetcherError` subclass. A bad argument still throws a `TypeError`.
- **Schema:** any [Standard Schema](https://standardschema.dev) validator (zod, valibot,
  arktype). Without one, `data` is `unknown`.
- **Body:** JSON for a JSON content type, a string for `text/*`, a `Blob` otherwise, and
  `undefined` when empty. A plain object or array request body is sent as JSON.
- **Timeout:** 60 s by default. Set `timeout` per instance or per request; `false` turns it off.
- **Config:** fixed at construction. `api.with({ headers })` returns a new `Fetcher`.

## Development

```bash
bun install
bun fmt --check && bun lint && bun check && bun test
```

`bun lint` needs a Bun canary build until a stable release has it (`bun upgrade --canary`).

## License

MIT. See [LICENSE](LICENSE).
