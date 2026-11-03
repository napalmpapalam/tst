import { describe, expect, test } from 'bun:test'

import { BN } from './bn'
import { BnRounding } from './enums'

const BIG = BN.from('12233444423.123123123123123', 18)

describe('BN', () => {
  describe('format', () => {
    test('should show the own decimals with comma groups by default', () => {
      expect(BN.from('1234567.5', 6).format()).toBe('1,234,567.500000')
    })

    test.each([
      ['10.229', '10.22'],
      ['-10.229', '-10.22'],
    ])('should cut %p toward zero by default', (value, text) => {
      expect(BN.from(value, 6).format({ decimals: 2 })).toBe(text)
    })

    test.each([
      [BnRounding.HalfUp, '10.225', '10.23'],
      [BnRounding.Up, '-10.221', '-10.23'],
      [BnRounding.Floor, '-10.221', '-10.23'],
      [BnRounding.Ceil, '10.221', '10.23'],
      [BnRounding.Up, '999.999', '1,000.00'],
      [BnRounding.HalfUp, '-0.004', '0.00'],
    ])('should round with %p', (rounding, value, text) => {
      expect(BN.from(value, 6).format({ decimals: 2, rounding })).toBe(text)
    })

    test.each([
      ['1.25', 1, 2, '1.25'],
      ['10.223', 6, 10, '10.2230000000'],
    ])('should show %p made at %p decimals with %p decimals', (value, decimals, shown, text) => {
      expect(BN.from(value, decimals).format({ decimals: shown })).toBe(text)
    })

    test.each([
      [{}, '6'],
      [{ fractionGroupSize: 2 }, '6'],
    ])('should drop the decimal separator at 0 decimals with %p', (opts, text) => {
      expect(BN.from('6.9', 18).format({ decimals: 0, ...opts })).toBe(text)
    })

    test('should print a value cut to zero without a minus', () => {
      expect(BN.from('-0.001', 6).format({ decimals: 2 })).toBe('0.00')
    })

    test.each([
      [{ prefix: 'USD ' }, '0', 'USD 0.00'],
      [{ suffix: ' USD' }, '0', '0.00 USD'],
    ])('should add %p', (opts, value, text) => {
      expect(BN.from(value, 2).format(opts)).toBe(text)
    })

    test('should put the prefix before the minus', () => {
      expect(BN.from('-5', 2).format({ prefix: 'USD ' })).toBe('USD -5.00')
    })

    test.each([
      [{ groupSeparator: '.', decimalSeparator: ',' }, '12.233.444.423,123123'],
      [{ groupSeparator: '&nbsp;' }, '12&nbsp;233&nbsp;444&nbsp;423.123123'],
      [{ groupSize: 0 }, '12233444423.123123'],
      [{ groupSize: 2 }, '1,22,33,44,44,23.123123'],
      [{ groupSize: 1, groupSeparator: '' }, '12233444423.123123'],
      [{ decimalSeparator: ' . ' }, '12,233,444,423 . 123123'],
      [{ fractionGroupSize: 2 }, '12,233,444,423.12 31 23'],
    ])('should group with %p', (opts, text) => {
      expect(BIG.format({ decimals: 6, ...opts })).toBe(text)
    })

    test('should group the fraction from the decimal separator', () => {
      const opts = { decimals: 9, fractionGroupSize: 2, fractionGroupSeparator: '_' }

      expect(BIG.format(opts)).toBe('12,233,444,423.12_31_23_12_3')
    })

    test.each([
      ['123456', '123,456'],
      ['0', '0'],
      ['-1000', '-1,000'],
    ])('should not lead %p with a separator', (value, text) => {
      expect(BN.from(value, 0).format()).toBe(text)
    })

    test.each([
      [{ groupSize: 2.2 }],
      [{ groupSize: -1 }],
      [{ groupSize: Number.NaN }],
      [{ fractionGroupSize: Number.NaN }],
      [{ fractionGroupSize: 2.2 }],
      [{ groupSize: Infinity }],
      [{ decimals: 27 }],
    ])('should throw a TypeError on %p', opts => {
      expect(() => BIG.format(opts)).toThrow(TypeError)
    })
  })
})
