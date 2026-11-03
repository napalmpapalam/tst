# Design

How each part of `@napalmpapalam/tst` works, and why it was built that way.

- [package](package.md) — one package, subpath exports, the origin of the code.
- [result](result.md) — `Result<T, E>`, the shape of every expected failure.
- [fetcher](fetcher.md) — `Fetcher`, an HTTP client on `fetch` that returns `Result`.
- [bn](bn.md) — `BN`, an immutable fixed-point decimal on `bigint`.
