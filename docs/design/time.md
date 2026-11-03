# time

`Time` is an immutable point in time, and `Duration` is an immutable length of time. Both wrap
dayjs. Only the `/time` subpath imports dayjs.

## How it works

- `src/time/dayjs.ts` loads every dayjs plugin that the area uses, once, when the module loads.
  The plugin imports end in `.js`, because dayjs has no `exports` map and native Node ESM does
  not resolve `dayjs/plugin/utc` without the suffix.
- A `Time` holds one dayjs value and an optional IANA zone. With no zone, the value is in the
  local time of the host. `tz(zone)` sets the zone, and `utc()` is `tz('UTC')`.
- Four factories: `Time.now()`, `Time.from` reads a `Time`, a `Date`, milliseconds or ISO 8601
  text, `Time.fromUnix` reads seconds, and `Time.parse` reads untrusted text and returns a
  `Result`. `from` and `parse` share one ISO parser. — `src/time/parse.ts`
- `add` and `subtract` move the instant for hours and smaller units. For days and larger units
  they move the wall clock: a day later at the same local time, also across a DST change.
- In a zone, `add` with a calendar unit and `startOf` work on the wall clock in UTC, and then
  `dayjs.tz` reads that wall clock back in the zone. That gives the offset of the new wall
  clock. — `Time.#onWallClock` in `src/time/time.ts`
- A `Duration` holds milliseconds. The constructor carries the parts over, so `{ days: 45 }`
  gives 1 month, 14 days and 14 hours. A year is 365 days and a month is 1/12 of a year.
- `toJSON` writes `iso` for both classes, so `JSON.stringify` keeps the value.

## Invariants

- **A `Time` and a `Duration` never change.** Every operation returns a new instance.
- **A `Time` is always valid.** `from` throws on an invalid input, and `add` takes only a safe
  integer, so no operation makes an `Invalid Date`.
- **A bare number is milliseconds.** Seconds come in only through `Time.fromUnix`.
- **A result does not depend on the host zone**, except for local-time values, which are local
  by definition. The tests run one section with `process.env.TZ` set to `America/New_York`, and
  the suite passes with `TZ` set to UTC, Kyiv, New York, Kolkata and Auckland.
- **Text output is English**, even when a consumer calls `dayjs.locale()` on the same dayjs
  instance. The `Time` constructor and `humanized` pin `'en'`.
- **`rfc3339` and `iso` are in UTC**, whatever the zone of the value.

## Decisions

- **`from` throws a `TypeError`; `parse` returns `Result<Time, TimeParseError>`** — the same
  split as [bn](bn.md): a bad literal in code is a programmer error, and bad text from a user is
  an expected failure. Rejected the dayjs model of an invalid value with `isValid`, because
  every method then returns `NaN` or `'Invalid Date'`.
- **The ISO parser rejects a day that its month does not have** — `Date` and dayjs both read
  `2023-02-30` as March 2. It also rejects years 0000–0099, because dayjs reads year 50 as 1950.
- **A string without an offset is local time**, as in dayjs. Rejected UTC, because `'2023-03-03
10:30'` from a user means the wall clock of the user.
- **`parse(text, format)` throws a `TypeError` for a template with an offset token (`Z`)** —
  dayjs strict mode compares the text with the value formatted at the host offset, so a `Z`
  template matches only on a host in that offset. Text with an offset goes through ISO 8601.
- **No global locale, default zone or locale setters** — they change the shared dayjs instance,
  and so every other value and the consumer's own dayjs. A zone is set per value with `tz`.
- **dayjs stays hidden** — no `dayjs` getter and no `Dayjs` input, and the constructors are
  `private`, so the declarations name no dayjs type. The engine can change to `Temporal` without
  an API break. Rejected an escape hatch to the dayjs value.
- **Units, fields and inclusivity are string enums** (`TimeUnit.Day`, `TimeField.Weekday`,
  `TimeInclusivity.StartOnly`) — the same style as `BnRounding` in [bn](bn.md). The values are
  the dayjs names, so no map translates them. Rejected string unions (`'day'`), the
  `dd:ts:core` rule for strings a caller types by hand, for one style across the package.
  `TimeField.Month` counts from 1, as `format('M')` does.
- **`Duration` is 0 or more** — `from` rejects a negative part, and `parse` rejects a sign.
  dayjs drops the sign of `'-PT1H'`, and `humanize` loses the sign of a negative length.
  `Time.diff` gives a signed number for a signed difference.
- **`Duration.parse` checks the text with its own pattern first** — dayjs reads `'P'` and
  `'PT0,5S'` as zero.
- **`weeks` and `humanized` do not use dayjs** — dayjs `weeks()` gives the total weeks, not the
  part, and `humanize()` reads the clock twice, so 90 minutes can read as `'an hour'`.
- **`time.ts` is over 200 lines** — a class cannot split across files, and every public member
  has TSDoc. The parser and the dayjs setup live in siblings.

## Known gaps

- dayjs keeps a zoned value as a `Date` shifted to the wall clock of the zone. Within the span of
  a DST change of the **host** zone, such a value can show an hour that is off by the DST step.
  A host in UTC is not affected.
- `isSame`, `isBetween` and `diff` with a unit, and `calendar`, use dayjs directly, so near a DST
  change of the zone they have the same limit.
- The ISO parser rejects basic offsets (`+0200`), times with only an hour (`T10Z`), week dates,
  and fractions longer than 9 digits.
- `Duration.parse` accepts a fraction on any part, not only on the last one.
- `Duration` keeps whole milliseconds in `iso`: `Duration.from(1.5).iso` is `'PT0.002S'`.
- `parse(text, format)` knows the `customParseFormat` tokens only: `X`, `x`, `Do` and `Q` do
  not parse.
- `/time` calls `dayjs.extend` on the dayjs instance that a consumer may share, so the consumer
  gets these plugins too.
