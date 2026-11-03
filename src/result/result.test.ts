import { describe, expect, test } from 'bun:test'

import { errorOf } from '#tests'

import { Err, err, Ok, ok, Result } from './result'

class ParseError extends Error {
  public name = 'ParseError'
}

const parse = (raw: string): number => {
  const n = Number(raw)

  if (Number.isNaN(n)) throw new ParseError(`not a number: ${raw}`)

  return n
}

describe('Result', () => {
  describe('ok', () => {
    test('should hold the value', () => {
      const res = ok(42)

      expect(res).toBeInstanceOf(Ok)
      expect(res.ok).toBe(true)
      expect(res.value).toBe(42)
    })
  })

  describe('err', () => {
    test('should hold the error', () => {
      const error = new ParseError('bad')

      const res = err(error)

      expect(res).toBeInstanceOf(Err)
      expect(res.ok).toBe(false)
      expect(res.error).toBe(error)
    })
  })

  describe('try', () => {
    test('should return Ok when a sync function returns', () => {
      const res = Result.try(() => parse('7'), ParseError)

      expect(res).toEqual(ok(7))
    })

    test('should return Err when a sync function throws the expected class', () => {
      const res = Result.try(() => parse('x'), ParseError)

      expect(errorOf(res)).toBeInstanceOf(ParseError)
    })

    test('should rethrow an error of another class from a sync function', () => {
      const fn = (): number => {
        throw new TypeError('bug')
      }

      expect(() => Result.try(fn, ParseError)).toThrow(TypeError)
    })

    test('should return Ok when an async function resolves', async () => {
      const res = await Result.try(() => Promise.resolve(7), ParseError)

      expect(res).toEqual(ok(7))
    })

    test('should return Err when an async function rejects with the expected class', async () => {
      const res = await Result.try(() => Promise.reject(new ParseError('bad')), ParseError)

      expect(errorOf(res)).toBeInstanceOf(ParseError)
    })

    test('should reject with an error of another class from an async function', async () => {
      const fn = (): Promise<number> => Promise.reject(new TypeError('bug'))

      await expect(Result.try(fn, ParseError)).rejects.toBeInstanceOf(TypeError)
    })

    test('should return a promise of Result when the function may return a promise', async () => {
      const fn = (): number | Promise<number> => Promise.resolve(7)

      const res: Result<number, ParseError> | Promise<Result<number, ParseError>> = Result.try(
        fn,
        ParseError,
      )

      expect(await res).toEqual(ok(7))
    })

    test('should hide the value until the ok check', () => {
      const res = Result.try(() => parse('7'), ParseError)

      // @ts-expect-error: `value` exists only on `Ok`
      expect(res.value).toBe(7)
    })

    test('should catch a subclass of the expected class', () => {
      class EmptyInput extends ParseError {}

      const fn = (): number => {
        throw new EmptyInput('empty')
      }

      const res = Result.try(fn, ParseError)

      expect(errorOf(res)).toBeInstanceOf(EmptyInput)
    })
  })
})
