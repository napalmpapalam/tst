import { describe, expect, test } from 'bun:test'

import { BN } from './bn'

describe('BN', () => {
  describe('MAX_UINT256', () => {
    test('should hold 2 ** 256 - 1', () => {
      expect(BN.MAX_UINT256.units).toBe(2n ** 256n - 1n)
    })
  })

  describe('min and max', () => {
    const [three, one, five] = [BN.from(3, 6), BN.from(1, 6), BN.from(5, 6)]

    test('should return the smallest value', () => {
      expect(BN.min(three, one, five).toString()).toBe('1.000000')
    })

    test('should return the largest value', () => {
      expect(BN.max(three, one, five).toString()).toBe('5.000000')
    })

    test('should return the only value', () => {
      expect([BN.min(three), BN.max(three)]).toEqual([three, three])
    })
  })

  describe('getters', () => {
    const bn = BN.from(1, 6)

    test('should expose the raw value at the precision', () => {
      expect(bn.raw).toBe(10n ** 26n)
    })

    test('should expose the decimals', () => {
      expect(bn.decimals).toBe(6)
    })

    test('should cut units toward zero', () => {
      expect(BN.from('-2.1234567', 6).units).toBe(-2123456n)
    })

    test.each([
      [0, { isZero: true, isPositive: false, isNegative: false }],
      [1, { isZero: false, isPositive: true, isNegative: false }],
      [-1, { isZero: false, isPositive: false, isNegative: true }],
    ])('should tell the sign of %p', (value, sign) => {
      const { isZero, isPositive, isNegative } = BN.from(value)

      expect({ isZero, isPositive, isNegative }).toEqual(sign)
    })
  })

  describe('arithmetic', () => {
    test.each([
      ['add', 2, 3, '5.0'],
      ['sub', 2, 3, '-1.0'],
      ['mul', 2, 3, '6.0'],
      ['mul', 1, 0, '0.0'],
      ['div', 2, 3, '0.6'],
      ['div', -7, 2, '-3.5'],
      ['div', -7, -2, '3.5'],
    ] as const)('should %s %p and %p', (op, a, b, text) => {
      expect(BN.from(a, 1)[op](BN.from(b, 1)).toString()).toBe(text)
    })

    test('should divide values with different decimals', () => {
      const quotient = BN.from(2, 18).div(BN.from(3, 16))

      expect(quotient.units).toBe(666666666666666666n)
    })

    test('should keep the decimals of the left value', () => {
      const sum = BN.from(2, 18).add(BN.from(3, 6))

      expect(sum.units).toBe(5n * 10n ** 18n)
    })

    test('should cut a product toward zero at the decimals', () => {
      const product = BN.fromUnits('194287666397830', 18).mul(BN.from(1.02))

      expect(product.units).toBe(198173419725786n)
    })

    test('should throw a RangeError on division by zero', () => {
      expect(() => BN.from(1).div(BN.from(0))).toThrow(RangeError)
    })

    test.each([
      [0, '1.000000'],
      [1, '2.000000'],
      [5, '32.000000'],
    ])('should raise 2 to the power %p', (exponent, text) => {
      expect(BN.from(2, 6).pow(exponent).toString()).toBe(text)
    })

    test.each([
      [-2, 3, '-8.0'],
      [-2, 2, '4.0'],
      [0, 0, '1.0'],
    ])('should raise %p to the power %p', (base, exponent, text) => {
      expect(BN.from(base, 1).pow(exponent).toString()).toBe(text)
    })

    test.each([-1, 1.5])('should throw a TypeError on exponent %p', exponent => {
      expect(() => BN.from(2).pow(exponent)).toThrow(TypeError)
    })

    test.each([
      [4, 6, '2.000000'],
      [0.25, 6, '0.500000'],
      [10, 3, '3.162'],
      [10, 18, '3.162277660168379331'],
      [0, 3, '0.000'],
    ])('should take the square root of %p', (value, decimals, text) => {
      expect(BN.from(value, decimals).sqrt().toString()).toBe(text)
    })

    test('should throw a RangeError on the square root of a negative value', () => {
      expect(() => BN.from(-1).sqrt()).toThrow(RangeError)
    })

    test.each([
      [-5, '5.0'],
      [5, '-5.0'],
    ])('should negate %p', (value, text) => {
      expect(BN.from(value, 1).negated().toString()).toBe(text)
    })

    test.each([-5, 5])('should take the absolute value of %p', value => {
      expect(BN.from(value, 1).abs().toString()).toBe('5.0')
    })
  })

  describe('percent', () => {
    const bn = BN.from('0.002433')

    test('should take a percent', () => {
      expect(bn.percent(5).units).toBe(121650000000000n)
    })

    test('should add a percent', () => {
      expect(bn.addPercent(5).units).toBe(2554650000000000n)
    })

    test('should subtract a percent', () => {
      expect(bn.subPercent(2.5).units).toBe(2372175000000000n)
    })

    test.each([
      [-10, '-20.00'],
      [0.5, '1.00'],
    ])('should take %p percent', (percent, text) => {
      expect(BN.from(200, 2).percent(percent).toString()).toBe(text)
    })
  })

  describe('comparison', () => {
    const one = BN.from(1)
    const two = BN.from(2, 6)

    test('should compare by value, not by decimals', () => {
      expect([one.cmp(two), two.cmp(one), one.cmp(BN.from(1, 6))]).toEqual([-1, 1, 0])
    })

    test.each([
      ['eq', [true, false, false]],
      ['lt', [false, true, false]],
      ['lte', [true, true, false]],
      ['gt', [false, false, true]],
      ['gte', [true, false, true]],
    ] as const)('should answer %s for equal, less and greater', (op, answers) => {
      const results = [one[op](BN.from(1, 6)), one[op](two), two[op](one)]

      expect(results).toEqual([...answers])
    })
  })

  describe('toDecimals', () => {
    test.each([
      ['2595000000000000', 18, 6, 2595n],
      ['2595', 6, 18, 2595000000000000n],
    ])('should rescale %p units from %p to %p decimals', (units, from, to, expected) => {
      const bn = BN.fromUnits(units, from).toDecimals(to)

      expect([bn.units, bn.decimals]).toEqual([expected, to])
    })
  })

  describe('toString', () => {
    test.each([
      ['3.14', 6, '3.140000'],
      ['-3.14', 6, '-3.140000'],
      ['-0.001123', 6, '-0.001123'],
      ['0.000022', 6, '0.000022'],
      ['231221312.312323', 6, '231221312.312323'],
      ['42', 0, '42'],
      ['-7.9', 0, '-7'],
    ])('should print %p at %p decimals', (value, decimals, text) => {
      expect(BN.from(value, decimals).toString()).toBe(text)
    })

    test('should print a value cut to zero without a minus', () => {
      expect(BN.from('-0.0000001', 6).toString()).toBe('0.000000')
    })
  })

  describe('toJSON', () => {
    test.each([
      ['1.5', '{"fee":"1500000"}'],
      ['-1.5', '{"fee":"-1500000"}'],
    ])('should print %p as units', (value, json) => {
      expect(JSON.stringify({ fee: BN.from(value, 6) })).toBe(json)
    })
  })
})
