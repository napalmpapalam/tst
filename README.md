# @napalmpapalam/tst

A small TypeScript toolkit. Each area is a separate subpath export, so you load only what you
import.

| Import                      | Contents                                                     |
| --------------------------- | ------------------------------------------------------------ |
| `@napalmpapalam/tst/result` | `Result<T, E>`, `Ok`, `Err`, `ok()`, `err()`, `Result.try()` |

## Result

```ts
import { Result } from '@napalmpapalam/tst/result'

const res = Result.try(() => JSON.parse(raw), SyntaxError)
if (!res.ok) return res.error.message

use(res.value)
```

`Result.try` catches only the class you pass. Any other error still throws.

## Development

```bash
bun install
bun fmt --check && bun lint && bun check && bun test
```

`bun lint` needs a Bun canary build until a stable release has it (`bun upgrade --canary`).

## License

MIT. See [LICENSE](LICENSE).
