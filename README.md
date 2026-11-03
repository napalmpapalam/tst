# @napalmpapalam/tst

A small TypeScript toolkit. Each area is a separate subpath export, so you load only what you
import.

```bash
bun add @napalmpapalam/tst
```

The package is ESM only, with types. It runs on Node 22.12 or later and on Bun.

| Import                       | Contents                                                           |
| ---------------------------- | ------------------------------------------------------------------ |
| `@napalmpapalam/tst/result`  | `Result<T, E>`, `Ok`, `Err`, `ok()`, `err()`, `Result.try()`       |
| `@napalmpapalam/tst/fetcher` | `Fetcher`, an HTTP client on `fetch` that returns `Result`         |
| `@napalmpapalam/tst/helpers` | `isPlainObject()`, `isDefined()`, `isAbsoluteUrl()`, `anySignal()` |
| `@napalmpapalam/tst/bn`      | `BN`, an immutable fixed-point decimal on `bigint`                 |
| `@napalmpapalam/tst/time`    | `Time` and `Duration`, immutable time values on dayjs              |

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

## BN

```ts
import { BN, BnDecimals, BnRounding } from '@napalmpapalam/tst/bn'

const total = BN.from('1234.5678', 6).mul(BN.from(3))

total.toString() // '3703.703400'
total.round(2, BnRounding.HalfUp).toString() // '3703.700000'
total.format({ decimals: 2, prefix: '$' }) // '$3,703.70'

const balance = BN.fromUnits(1_500_000_000_000_000_000n, BnDecimals.Wei)
balance.format({ decimals: 4, suffix: ' ETH' }) // '1.5000 ETH'

const amount = BN.parse(field.value)
if (!amount.ok) return amount.error.message // 'BN: "12,5" is not a decimal number'
```

- **Precision:** every value keeps 26 fraction digits. `decimals` (18 by default) sets only the
  scale of `units` and `toString`.
- **Input:** `BN.from` reads a decimal, and `BN.fromUnits` reads base units, such as wei. Both
  throw a `TypeError` on bad input. `BN.parse` reads untrusted text and returns a `Result`.
- **Math:** every operation returns a new `BN`. `mul`, `div` and `sqrt` cut toward zero, and a
  division by zero throws a `RangeError`.
- **Format:** `format()` cuts toward zero by default, so a display never shows more than the
  holder has. Set `rounding` to round instead.
- **JSON:** `toJSON` writes `units` as a string, so no digits are lost.

## Time

```ts
import { Duration, Time, TimeUnit } from '@napalmpapalam/tst/time'

const start = Time.fromUnix(1677801600).tz('Europe/Kyiv')
const end = start.add(1, TimeUnit.Day).startOf(TimeUnit.Day)

end.format('DD.MM.YYYY HH:mm') // '04.03.2023 00:00'
end.iso // '2023-03-03T22:00:00.000Z'
end.diff(start, TimeUnit.Hour) // 22

Duration.from({ hours: 1, minutes: 30 }).iso // 'PT1H30M'

const due = Time.parse(field.value, 'DD.MM.YYYY')
if (!due.ok) return due.error.message // 'Time: "31.02.2023" does not match "DD.MM.YYYY"'
```

- **Immutable:** every operation returns a new `Time` or `Duration`.
- **Input:** a number is milliseconds. Use `Time.fromUnix` for seconds. `Time.from` throws a
  `TypeError` on bad input, and `Time.parse` reads untrusted text and returns a `Result`.
- **Zones:** a `Time` keeps its IANA zone. Hours and smaller move the instant. Days and larger
  move the wall clock, so `add(1, TimeUnit.Day)` keeps the local hour across a DST change.
- **Output:** English text. `iso` and `rfc3339` are in UTC.
- **Duration:** 0 or more. `Duration.parse` reads an ISO 8601 duration, such as `'PT1H30M'`.
- **dayjs:** only `/time` loads dayjs. The other subpaths have no dependencies.

## Development

```bash
bun install
bun fmt --check && bun lint && bun check && bun test
bun run build   # ESM and .d.ts files to dist/
```

`bun lint` needs a Bun canary build until a stable release has it (`bun upgrade --canary`).

## License

MIT. See [LICENSE](LICENSE).
