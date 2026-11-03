# bn

`BN` is an immutable fixed-point decimal on `bigint`, for token amounts and other money values
that a `number` cannot hold exactly.

## How it works

- Every value is one `bigint`, `raw`: the value times `10 ** 26`. `BN.PRECISION` is 26 and never
  changes. — `src/bn/scale.ts`
- `decimals` only sets the scale of `units` (the integer in base units, such as wei) and of
  `toString`. Arithmetic and comparison use `raw`, so the decimals of an operand do not change
  a result. A result keeps the decimals of `this`.
- `mul`, `div`, `sqrt`, `units` and `toString` cut the digits they drop toward zero. Only
  `round` rounds. — `src/bn/round.ts`
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
- **`bn.ts` is over 200 lines** — a class cannot split across files, and every public member has
  TSDoc. The parser, the rounding and the string output live in siblings.

## Known gaps

- `pow` takes only a non-negative integer exponent.
- There is no `format()` with group separators, a prefix or a suffix. `toString` is the only
  text output.
- An unknown `BnRounding` value from plain JavaScript throws a `TypeError`, but no test covers it,
  because a typed test cannot pass one without a cast.
