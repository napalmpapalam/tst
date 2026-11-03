import { describe, expect, test } from 'bun:test'

import { BN } from './bn'
import { BnRounding } from './enums'

const VALUES = ['1.5555557', '1.5555555', '1.5555554', '1.5555550']

const round = (value: string, mode?: BnRounding): string => {
  return BN.from(value, 8).round(6, mode).toDecimals(6).toString()
}

describe('BN', () => {
  describe('round', () => {
    test.each([
      [BnRounding.Up, '', ['1.555556', '1.555556', '1.555556', '1.555555']],
      [BnRounding.Up, '-', ['1.555556', '1.555556', '1.555556', '1.555555']],
      [BnRounding.Down, '', ['1.555555', '1.555555', '1.555555', '1.555555']],
      [BnRounding.Down, '-', ['1.555555', '1.555555', '1.555555', '1.555555']],
      [BnRounding.Ceil, '', ['1.555556', '1.555556', '1.555556', '1.555555']],
      [BnRounding.Ceil, '-', ['1.555555', '1.555555', '1.555555', '1.555555']],
      [BnRounding.Floor, '', ['1.555555', '1.555555', '1.555555', '1.555555']],
      [BnRounding.Floor, '-', ['1.555556', '1.555556', '1.555556', '1.555555']],
      [BnRounding.HalfUp, '', ['1.555556', '1.555556', '1.555555', '1.555555']],
      [BnRounding.HalfUp, '-', ['1.555556', '1.555556', '1.555555', '1.555555']],
      [BnRounding.HalfDown, '', ['1.555556', '1.555555', '1.555555', '1.555555']],
      [BnRounding.HalfDown, '-', ['1.555556', '1.555555', '1.555555', '1.555555']],
      [BnRounding.HalfCeil, '', ['1.555556', '1.555556', '1.555555', '1.555555']],
      [BnRounding.HalfCeil, '-', ['1.555556', '1.555555', '1.555555', '1.555555']],
      [BnRounding.HalfFloor, '', ['1.555556', '1.555555', '1.555555', '1.555555']],
      [BnRounding.HalfFloor, '-', ['1.555556', '1.555556', '1.555555', '1.555555']],
    ])('should round with %p and sign "%s"', (mode, sign, magnitudes) => {
      const rounded = VALUES.map(value => round(sign + value, mode))

      expect(rounded).toEqual(magnitudes.map(magnitude => sign + magnitude))
    })

    test('should default to half up', () => {
      expect(round('1.56666666')).toBe('1.566667')
    })

    test.each([
      [BnRounding.Up, '1.55555501', '1.555556'],
      [BnRounding.Ceil, '1.55555501', '1.555556'],
      [BnRounding.HalfDown, '1.55555551', '1.555556'],
      [BnRounding.HalfFloor, '1.55555551', '1.555556'],
    ])('should look past the first dropped digit with %p', (mode, value, text) => {
      expect(round(value, mode)).toBe(text)
    })

    test('should round a value between -1 and 0', () => {
      const bn = BN.from('-0.05', 2)

      expect(bn.round(1).toString()).toBe('-0.10')
    })

    test.each([
      [BnRounding.HalfCeil, '-0.5', '0'],
      [BnRounding.HalfFloor, '-0.5', '-1'],
      [BnRounding.HalfUp, '2.5', '3'],
      [BnRounding.HalfDown, '2.5', '2'],
    ])('should break a tie with %p on %p', (mode, value, text) => {
      expect(BN.from(value, 0).round(0, mode).toString()).toBe(text)
    })

    test.each(['0', '1.25'])('should keep %p when nothing is dropped', value => {
      const bn = BN.from(value, 2)

      expect(bn.round(2).eq(bn)).toBe(true)
    })

    test('should round past the decimals', () => {
      expect(BN.from('1.25', 1).round(1).toDecimals(2).toString()).toBe('1.30')
    })

    test('should keep the decimals', () => {
      expect(BN.from('1.25', 8).round(1).toString()).toBe('1.30000000')
    })

    test.each([-1, 0.5, BN.PRECISION + 1])('should throw a TypeError on %p places', places => {
      expect(() => BN.from(1).round(places)).toThrow(TypeError)
    })
  })
})
