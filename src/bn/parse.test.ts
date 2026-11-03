import { describe, expect, test } from 'bun:test'

import { errorOf, valueOf } from '#tests'

import { BN } from './bn'
import { BnParseError } from './errors'

describe('BN', () => {
  describe('from', () => {
    test.each([
      [22, '22.000000'],
      [3.14, '3.140000'],
      [-3.14, '-3.140000'],
      [3e5, '300000.000000'],
      [12n, '12.000000'],
      ['5.0', '5.000000'],
      ['2.12333344', '2.123333'],
      ['000.123', '0.123000'],
      ['0004.78', '4.780000'],
      ['00.0000', '0.000000'],
      ['  2.84  ', '2.840000'],
      ['1e+2', '100.000000'],
      ['1e5', '100000.000000'],
      ['33e-2', '0.330000'],
      ['3.5E+4', '35000.000000'],
      ['0.1e+5', '10000.000000'],
      ['0.33e-3', '0.000330'],
    ])('should read %p', (value, text) => {
      expect(BN.from(value, 6).toString()).toBe(text)
    })

    test('should keep every digit up to the precision in raw', () => {
      const bn = BN.from('3.14159265358979323846264338327950', 6)

      expect(bn.raw).toBe(314159265358979323846264338n)
    })

    test('should cut digits past the precision to zero', () => {
      expect(BN.from(`2.2e-${BN.PRECISION + 4}`).raw).toBe(0n)
    })

    test('should default to 18 decimals', () => {
      expect(BN.from('1').units).toBe(10n ** 18n)
    })

    test.each(['0e1000000000', '0.0e2000', `1e-${'9'.repeat(400)}`])(
      'should read %p as 0',
      text => {
        expect(BN.from(text).isZero).toBe(true)
      },
    )

    test('should take 0 decimals', () => {
      expect(BN.from('7.9', 0).toString()).toBe('7')
    })

    test.each(['', 'abc', '1.', '.5', '+1', '1e', '0x10', 'NaN'])(
      'should throw a TypeError on %p',
      text => {
        expect(() => BN.from(text)).toThrow(TypeError)
      },
    )

    test.each([Number.NaN, Number.POSITIVE_INFINITY])('should throw a TypeError on %p', value => {
      expect(() => BN.from(value)).toThrow(TypeError)
    })

    test.each([-1, 1.5, BN.PRECISION + 1])('should throw a TypeError on %p decimals', decimals => {
      expect(() => BN.from(1, decimals)).toThrow(TypeError)
    })
  })

  describe('fromUnits', () => {
    test.each([
      ['1000000', 1000000n],
      ['0x8c50ed21', 2354113825n],
      [2451222523, 2451222523n],
      [-1123n, -1123n],
    ])('should read %p', (value, units) => {
      expect(BN.fromUnits(value, 6).units).toBe(units)
    })

    test('should scale the units to the precision', () => {
      expect(BN.fromUnits('1000000', 6).raw).toBe(10n ** 26n)
    })

    test('should read an upper-case hex prefix', () => {
      expect(BN.fromUnits('0X1F', 0).units).toBe(31n)
    })

    test.each(['8c50ed21', '-0x10', '1.5', '', 1.5, Number.MAX_SAFE_INTEGER + 2])(
      'should throw a TypeError on %p',
      value => {
        expect(() => BN.fromUnits(value)).toThrow(TypeError)
      },
    )

    test('should throw a TypeError on bad decimals', () => {
      expect(() => BN.fromUnits(1, BN.PRECISION + 1)).toThrow(TypeError)
    })
  })

  describe('parse', () => {
    test('should return the value', () => {
      const res = BN.parse('1.5', 6)

      expect(valueOf(res).units).toBe(1500000n)
    })

    test('should trim the text', () => {
      const res = BN.parse('\n 1.5\t', 6)

      expect(valueOf(res).units).toBe(1500000n)
    })

    test('should return an error that holds the text', () => {
      const res = BN.parse('1,5')

      expect(errorOf(res).text).toBe('1,5')
    })

    test.each([
      ['a huge exponent', '1e100000000'],
      ['a 400-digit exponent', `1e${'9'.repeat(400)}`],
      ['a long fraction', `0.${'7'.repeat(1_000_000)}`],
      ['a long mantissa', `${'1'.repeat(1_000_000)}e-999990`],
    ])('should return an error on %s without building it', (_, text) => {
      const res = BN.parse(text)

      expect(errorOf(res)).toBeInstanceOf(BnParseError)
    })

    test('should throw a TypeError on bad decimals', () => {
      expect(() => BN.parse('1', -1)).toThrow(TypeError)
    })
  })
})
