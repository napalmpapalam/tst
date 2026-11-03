import type { Result } from '#result'

/** Returns the value of an `Ok`, and fails the test on an `Err`. */
export const valueOf = <T, E>(res: Result<T, E>): T => {
  if (!res.ok) throw new Error('expected Ok', { cause: res.error })
  return res.value
}

/** Returns the error of an `Err`, and fails the test on an `Ok`. */
export const errorOf = <T, E>(res: Result<T, E>): E => {
  if (res.ok) throw new Error('expected Err', { cause: res.value })
  return res.error
}
