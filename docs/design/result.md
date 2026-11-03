# result

`Result<T, E>` is the return type of every operation in the package that can fail in an
expected way. A caller reads the outcome with an `ok` check, not with `try`/`catch`.

## How it works

- `Ok<T>` and `Err<E>` are classes with a literal `readonly ok` (`true` / `false`).
  `Result<T, E>` is their union, so `res.ok` narrows it. `instanceof Err` narrows it too.
- `ok()` and `err()` build the two variants.
- `Result.try(fn, errorClass)` runs `fn`. It returns `Ok` with the value, or `Err` when `fn`
  throws an instance of `errorClass`. When `fn` returns a `Promise`, it awaits it and returns a
  `Promise<Result>`. — `src/result/result.ts`
- `ResultSettled<T, E>` types that return: it distributes over a union, so a `fn` that may
  return a promise gets `Result | Promise<Result>`.

## Invariants

- **`Result.try` catches only `errorClass` and its subclasses.** Any other error is rethrown, so a
  bug such as a `TypeError` never looks like an expected failure.
- **`Err` is for expected failures only:** an HTTP non-2xx, a network error, a timeout, an abort,
  bad input to a parser. A programmer error, such as a bad argument, throws a `TypeError`.
- `value` and `error` are readable only after the `ok` check. A test pins this with
  `@ts-expect-error`.

## Decisions

- **`Result<T, E>` over `T | E`** — against the `dd:ts:core` rule; one discriminant (`ok`) for
  every area, which also works when `T` itself is an `Error`. Rejected `T | E` because it cannot
  tell an `Error` value from a failure.
- **Classes over plain objects** — `instanceof Err` works as a second type guard; rejected
  module-private classes (the `dd:ts:library` rule) because consumers then lose that guard.
- **`Result.try` takes one error class** — rejected a catch-all `go()` helper: it catches
  everything and casts it to `E`, and its `[E | null, T | null]` tuple does not narrow.
- **One conditional signature for `Result.try`** — rejected sync and async overloads: a `fn` typed
  `() => number | Promise<number>` matched the sync overload, and the type hid a `Promise`.
- **No `map`, `unwrapOr` or `match`** — no call site needs them yet. Add one when a call site
  does.

## Known gaps

- `Result.try` detects a promise with `instanceof Promise`. A thenable that is not a `Promise` is
  returned as a plain value.
- A `fn` typed `() => unknown` that returns a promise gets the sync type `Result<unknown, E>`.
