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
  `fetcher` imports `#result`. Shared test helpers are `#tests` (`src/tests/`). The map serves
  the repo only: tests and `bun check` run on the source without a build.
- `bun run build` (`scripts/build.ts`) writes `dist/`. `bun build` bundles each area into
  `dist/<area>/index.js`, and `tsc -p tsconfig.build.json` writes the `.d.ts` files to
  `dist/types/`. Tests and `src/tests/` stay out. Then the script rewrites every import in
  `dist/`: `#result` becomes `../result/index.js`, `./errors` becomes `./errors.js`. It fails
  when a rewritten import does not resolve.
- `exports` points at `dist/`, with a `types` condition first. `npm pack` and `npm publish` build
  first (`prepack`), and `npm publish` also runs the four checks (`prepublishOnly`). The tarball
  holds only `dist/`, the README and the LICENSE.

## Invariants

- One class per export across subpaths. The bundle keeps `#*` imports external, so
  `dist/fetcher/index.js` imports `Err` from `dist/result/index.js` and `instanceof Err` holds
  for a value from any subpath. A bundled copy of `result` per area would break it.
- `dist/` uses only relative imports between areas. A consumer's tsconfig `paths` apply to every
  file it loads, `node_modules` too, in both `tsc` and Bun. A consumer with its own `#*` mapping
  then captured our `#result` and failed to type-check and to run.
- A runtime dependency is imported only by the area that needs it, so a consumer of one subpath
  does not load the dependencies of another.

## Decisions

- **One package with subpath exports** — one install and one version for every area; rejected
  one package per area.
- **No root barrel** — rejected, because a root barrel loads every area and its dependencies for
  every consumer.
- **`package.json` `imports` (`#result`) for cross-area imports** — against the `dd:ts:core`
  `@/` alias rule. Node, TypeScript, Bun and bundlers resolve `#` imports against this package.
  Rejected tsconfig `paths` (`@/`): `tsc` keeps the alias as written in the `.d.ts` files, and
  a consumer resolves it against its own tsconfig.
- **The build rewrites `#area` to a relative path** — a consumer's own `#*` paths cannot reach a
  relative import. Rejected `imports` that point at `dist/`: the rewrite removes the one case
  that needs them, and `src/` would then need a second map for development.
- **ESM only, one bundle per area** — a consumer loads one file per subpath. Rejected
  `bun build --splitting`: shared chunks get hashed names, and the per-area layout already
  shares `result` through `#*`. Rejected a CommonJS build: Node 22 can `require()` ESM, and the
  `default` condition (not `import`) lets it.
- **The build adds `.js` to relative imports in the `.d.ts` files** — `tsc` keeps `./result` as
  written, and a `node16`/`nodenext` consumer then sees no exports (TS2834). Rejected `.js` in
  every source import: it touches every file for a fix that one build step makes.
- **Published from a local machine with `npm publish --access public`** — a local publish gets
  no provenance with `npm` or `bun publish`; provenance needs CI. `engines` asks for Node 22.12,
  the first release that can `require()` ESM without a flag.
- **`assert` from `helpers` throws a `TypeError`** — the package uses it to check a caller's
  argument, and a bad argument is a `TypeError` (see [result](result.md)). Rejected a plain
  `Error`, because then a caller cannot tell a bad argument from other failures.
- **`#field` for private members** — against the `dd:ts:library` rule; accepted that instances
  throw inside a Vue/MobX/Valtio `Proxy`.

## Known gaps

- No CI: a publish has no provenance, and nothing checks a push.
- The published `package.json` keeps `imports` pointing at `src/`, which the tarball leaves out.
  Nothing in `dist/` uses the map, so a consumer never reads it.
- `bun lint` needs a Bun canary build until a stable release has it.
