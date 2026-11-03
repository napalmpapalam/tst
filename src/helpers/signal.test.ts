import { describe, expect, test } from 'bun:test'

import { anySignal } from './signal'

describe('anySignal', () => {
  test('should return null without a signal', () => {
    expect(anySignal([undefined])).toBeNull()
  })

  test('should abort when one of the signals aborts', () => {
    const controller = new AbortController()
    const signal = anySignal([undefined, new AbortController().signal, controller.signal])

    controller.abort()

    expect(signal?.aborted).toBe(true)
  })
})
