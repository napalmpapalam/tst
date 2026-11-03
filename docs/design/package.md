# package

`@napalmpapalam/tst` is one npm package that holds several small, independent areas. This file
covers how the areas are exposed.

## How it works

- Each area lives in `src/<area>/` and has its own barrel `src/<area>/index.ts`.
- `package.json` `exports` lists one subpath per area (`./result`, `./fetcher`, `./helpers`, `./bn`,
  `./time`). There is no `.` entry.
- `helpers` holds small pure functions that are not tied to one area, such as `isPlainObject`,
  `anySignal` and `assert`. They are public too.
- One area imports another through `package.json` `imports`: `#*` maps to `src/*/index.ts`, so
  `fetcher` imports `#result`. Shared test helpers are `#tests` (`src/tests/`).
- The `exports` map points at the `.ts` source. Bun and TS-aware bundlers can import it, but
  Node cannot. A build to `dist/` is not there yet (see Known gaps).

## Invariants

- A runtime dependency is imported only by the area that needs it, so a consumer of one subpath
  does not load the dependencies of another.

## Decisions

- **One package with subpath exports** — one install and one version for every area; rejected
  one package per area.
- **No root barrel** — rejected, because a root barrel loads every area and its dependencies for
  every consumer.
- **`package.json` `imports` (`#result`) for cross-area imports** — against the `dd:ts:core`
  `@/` alias rule. Node, TypeScript, Bun and bundlers resolve `#` imports against this package.
  Rejected tsconfig `paths` (`@/`): a consumer resolves them with its own tsconfig, so a consumer
  with its own `@/result` failed to type-check the shipped source, and `tsc` keeps `@/` in the
  `.d.ts` files.
- **`assert` from `helpers` throws a `TypeError`** — the package uses it to check a caller's
  argument, and a bad argument is a `TypeError` (see [result](result.md)). Rejected a plain
  `Error`, because then a caller cannot tell a bad argument from other failures.
- **`#field` for private members** — against the `dd:ts:library` rule; accepted that instances
  throw inside a Vue/MobX/Valtio `Proxy`.

## Known gaps

- No build: no `dist/`, no `.d.ts`, no `files` field. The package cannot be published yet.
- A consumer that maps `#*` in its own tsconfig `paths` overrides the package `imports` while
  `exports` points at the `.ts` source.
- `bun lint` needs a Bun canary build until a stable release has it.
