import { assert } from './assert'
import { isIntegerIn } from './value'

/** Returns `text` cut into pieces of `size` UTF-16 code units; the last piece may be shorter. */
export const chunkString = (text: string, size: number): string[] => {
  assert(isIntegerIn(size, 1), `chunkString: size must be a positive integer, got ${size}`)
  const count = Math.ceil(text.length / size)
  return Array.from({ length: count }, (_, i) => text.slice(i * size, (i + 1) * size))
}
