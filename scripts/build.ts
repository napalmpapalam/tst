import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { $, Glob } from 'bun'

import { assert } from '#helpers'

import packageJson from '../package.json'

const AREAS = Object.keys(packageJson.exports).map(subpath => subpath.slice('./'.length))
const SPECIFIER = /(from |import\()(['"])([#.][^'"]*)\2/g

// A consumer's own `#*` paths would capture `#result`, and node16/nodenext needs the `.js`.
const toRelative = (specifier: string): string => {
  if (specifier.startsWith('#')) return `../${specifier.slice(1)}/index.js`
  return specifier.endsWith('.js') ? specifier : `${specifier}.js`
}

const assertResolves = (path: string, specifier: string): void => {
  const target = join(dirname(path), specifier)
  const file = path.endsWith('.d.ts') ? target.replace(/\.js$/, '.d.ts') : target
  assert(existsSync(file), `${path}: ${specifier} does not resolve`)
}

const rewriteImports = async (path: string): Promise<void> => {
  const file = Bun.file(path)
  const text = await file.text()

  const rewritten = text.replace(SPECIFIER, (_, keyword: string, quote: string, from: string) => {
    const to = toRelative(from)
    assertResolves(path, to)
    return `${keyword}${quote}${to}${quote}`
  })

  await file.write(rewritten)
}

await rm('dist', { recursive: true, force: true })

// `#*` stays external, so every area imports the one `dist/result` and `instanceof Err` holds.
await Bun.build({
  entrypoints: AREAS.map(area => `src/${area}/index.ts`),
  root: 'src',
  outdir: 'dist',
  target: 'node',
  packages: 'external',
  external: ['#*'],
})

await $`bun x tsc -p tsconfig.build.json`

const paths = await Array.fromAsync(new Glob('dist/**/*.{js,d.ts}').scan())
await Promise.all(paths.map(rewriteImports))
