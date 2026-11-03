# tst

`@napalmpapalam/tst` — one npm package with subpath exports (`/result`, …). No root barrel. Each
area lives in `src/<area>/` with its own `index.ts`, and `package.json` `exports` lists it.

## Design

Read `docs/design/README.md` before you change a domain. It holds the settled decisions and
why.

## Commands

```bash
bun fmt --check   # format
bun lint          # needs a Bun canary build for now
bun check         # types
bun test
bun run build     # dist/, runs before npm pack and publish
```

## Conventions

Follow the `dd:ts:core`, `dd:ts:library`, `dd:ts:testing` and `dd:ts:tooling` skills, with two
overrides:

- **`#field` for private members**, not `private` (against `dd:ts:library`). The user accepts
  that instances throw inside a Vue/MobX/Valtio Proxy.
- **`Result<T, E>` for expected failures**, not `T | E` (against `dd:ts:core`). Use the `/result`
  module. A programmer error, such as a bad argument, still throws a `TypeError`.

## Workflow

Commits go straight to `main`, no PRs. The user reviews every change before each commit.
