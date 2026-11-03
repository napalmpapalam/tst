# bn

`BN` is an immutable fixed-point decimal on `bigint`, for token amounts and other money values
that a `number` cannot hold exactly.

## How it works

- Every value is one `bigint`, `raw`: the value times `10 ** 26`. `BN.PRECISION` is 26 and never
  changes. — `src/bn/scale.ts`
- `decimals` only sets the scale of `units` (the integer in base units, such as wei) and of
  `toString`. Arithmetic and comparison use `raw`, so the decimals of an operand do not change
  a result. A result keeps the decimals of `this`.
- `mul`, `div`, `sqrt`, `units`, `toString` and `format` cut the digits they drop toward zero.
  Only `round` rounds, and `format` when the caller passes a `rounding` mode. — `src/bn/round.ts`
- `format` builds display text: a prefix, the sign, integer groups, the decimal separator,
  fraction groups and a suffix. `toString` is `format` with no groups. — `src/bn/format.ts`
- Three factories: `BN.from` reads a decimal number (`'1.5'`, `1.5`, `'15e-1'`), `BN.fromUnits`
  reads an integer in base units or a hex string, and `BN.parse` reads untrusted text and returns
  a `Result`. `from` and `parse` share one parser. — `src/bn/parse.ts`
- `toJSON` gives `units` as a string, so `JSON.stringify` keeps every digit.

## Invariants

- **A `BN` never changes.** Every operation returns a new instance.
- **`raw` means the same thing for every value.** A value made at one time compares and adds
  correctly with a value made at another.
- **The parser checks the size of the text before it builds a `bigint`.** It rejects text longer
  than 1000 characters, and a result with more than 1000 digits. Text such as `1e100000000` or a
  million-digit fraction otherwise takes seconds to build. A test with the guard deleted fails.
- **`round` reads every dropped digit**, not only the first one, and works for values between
  -1 and 0.
- **Display text never shows `-0`.** A negative value that `format` or `toString` cuts to zero
  prints without a minus.

## Decisions

- **One fixed precision, no global config** — a value made under one config means the same thing
  under every other. Rejected a global, mutable precision and default decimals: a change to the
  global config changed `units` of values that already existed.
- **`decimals` scales only the output; `raw` keeps 26 digits** — `BN.from('1.25', 1)` still
  holds 1.25, and `round(1)` gives 1.3. Rejected cutting `raw` to `decimals` at every step,
  because then the result of `mul` and `div` depends on the decimals of the operands.
- **`from` and `fromUnits` throw a `TypeError`; `BN.parse` returns `Result<BN, BnParseError>`**
  — a bad literal in code is a programmer error, and bad text from a user is an expected failure
  (see [result](result.md)). Rejected a `Result` from every factory, because then each literal
  needs an `ok` check.
- **`fromUnits` takes a `number` only when it is a safe integer** — `BigInt(1e30)` gives
  `…19884624838656`. Pass a `bigint` or a string for a large value.
- **`round(places, mode)` keeps `decimals`** — round and rescale are two steps:
  `x.round(6).toDecimals(6)`. Rejected a `round` that also changes `decimals`, because then it does
  two things.
- **`BnRounding` has string values and defaults to `HalfUp`.** Rejected numeric values, because no
  external format needs them.
- **`decimals` can be 0** — tokens without fraction digits exist. `BN.MAX_UINT256` uses 0.
- **Division by zero and the square root of a negative value throw a `RangeError`** — the
  argument has the right type, but the value is outside the domain of the operation. Native
  `bigint` division throws a `RangeError` too.
- **`subPercent(p)` is `x - x * p / 100`**, as the name says. Rejected `x / (1 + p / 100)`, which undoes `addPercent` but does not subtract `p` %.
- **`BN` is a public class** with static `PRECISION` and `MAX_UINT256` — `instanceof BN` works,
  and the constructor is `protected`, so the factories are the only way in. Against the
  `dd:ts:library` rule to hide implementation classes, for the same reason as `Ok` / `Err`.
- **`format` cuts toward zero by default; `rounding` is optional** — a balance shown rounded up
  can be more than the holder can send, so `0.9999` shows as `0.99`. Rejected `HalfUp` as the
  default, the default of `round`, because display text must not promise digits the value lacks.
- **`format` shows the decimals of the value by default** — `format()` gives the digits of
  `toString` plus groups. Rejected an integer-only default, because then the fraction goes
  missing without a sign.
- **`format` with more `decimals` than the value has reads the hidden `raw` digits** —
  `BN.from('1.25', 1).format({ decimals: 2 })` gives `'1.25'`, as `round(2)` does.
- **Fraction groups count from the decimal separator** (`'0.12_31_2'`), and every separator can
  be several characters (`'&nbsp;'`). Rejected grouping the fraction from its end.
- **The prefix goes before the minus** — `'USD -5.00'`. A currency sign that must follow the
  minus is the caller's to build.
- **Options per call, no global format config** — a caller keeps one `BnFormatOptions` object to
  format many values the same way. Rejected a global default, for the same reason as the global
  precision.
- **Own formatter, not `Intl.NumberFormat`** — the output is the same on every runtime, and it has
  fraction groups and free separators. Rejected `Intl`, which keeps every digit of a decimal
  string, but has no fraction groups and depends on the ICU data of the runtime.
- **`bn.ts` is over 200 lines** — a class cannot split across files, and every public member has
  TSDoc. The parser, the rounding and the string output live in siblings.

## Known gaps

- `pow` takes only a non-negative integer exponent.
- `format` has no locales, and it does not trim trailing zeros.
- An unknown `BnRounding` value from plain JavaScript throws a `TypeError`, but no test covers it,
  because a typed test cannot pass one without a cast.
