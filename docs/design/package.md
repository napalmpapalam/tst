# package

`@napalmpapalam/tst` is one npm package that holds several small, independent areas. This file
covers how the areas are exposed.

## How it works

- Each area lives in `src/<area>/` and has its own barrel `src/<area>/index.ts`.
- `package.json` `exports` lists one subpath per area (`./result`). There is no `.` entry.
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
- **`#field` for private members** — against the `dd:ts:library` rule; accepted that instances
  throw inside a Vue/MobX/Valtio `Proxy`.

## Known gaps

- No build: no `dist/`, no `.d.ts`, no `files` field. The package cannot be published yet.
- `bun lint` needs a Bun canary build until a stable release has it.
