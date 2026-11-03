import { isDefined } from './value'

/** Returns a signal that aborts when any given signal aborts, or `null` when none is given. */
export const anySignal = (signals: (AbortSignal | undefined)[]): AbortSignal | null => {
  const list = signals.filter(isDefined)
  return list.length ? AbortSignal.any(list) : null
}
