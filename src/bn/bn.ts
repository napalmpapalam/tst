import { assert, compareBigInt, isIntegerIn, sqrtBigInt } from '#helpers'
import { ok, type Result } from '#result'

import { BnDecimals, BnRounding } from './enums'
import type { BnParseError } from './errors'
import { type BnFormatOptions, formatUnits } from './format'
import { type BnValue, parseDecimal, parseUnits } from './parse'
import { roundRaw } from './round'
import { checkDigits, PRECISION, tens, unitOf } from './scale'

const ONE = tens(PRECISION)

/**
 * An immutable fixed-point decimal on `bigint`. Every value keeps {@link BN.PRECISION} fraction
 * digits; `decimals` sets the scale of {@link BN.units} and {@link BN.toString}.
 *
 * @example
 * ```ts
 * const fee = BN.from('0.15', BnDecimals.Wei).mul(BN.from(2))
 *
 * fee.toString() // '0.300000000000000000'
 * fee.units // 300000000000000000n
 * ```
 */
export class BN {
  /** The number of fraction digits every value keeps. */
  public static readonly PRECISION = PRECISION

  /** The largest Solidity `uint256`. */
  public static readonly MAX_UINT256: BN = BN.fromUnits(2n ** 256n - 1n, 0)

  readonly #raw: bigint
  readonly #decimals: number

  protected constructor(raw: bigint, decimals: number) {
    this.#raw = raw
    this.#decimals = decimals
  }

  /**
   * Returns a {@link BN} from a decimal number, such as `'1.5'`, `1.5` or `'15e-1'`.
   *
   * @throws TypeError when `value` is not a decimal number, or `decimals` is out of range.
   */
  public static from(value: BnValue, decimals: number = BnDecimals.Wei): BN {
    const res = parseDecimal(String(value))
    if (!res.ok) throw new TypeError(res.error.message, { cause: res.error })
    return new BN(res.value, checkDigits(decimals, 'decimals'))
  }

  /**
   * Returns a {@link BN} from an integer in base units, such as wei, or a hex string.
   *
   * @throws TypeError when `value` is not a safe integer, or `decimals` is out of range.
   */
  public static fromUnits(value: BnValue, decimals: number = BnDecimals.Wei): BN {
    const unit = unitOf(checkDigits(decimals, 'decimals'))
    return new BN(parseUnits(value) * unit, decimals)
  }

  /**
   * Returns a {@link BN} from untrusted text, such as a form field, or a {@link BnParseError}.
   *
   * @throws TypeError when `decimals` is out of range.
   */
  public static parse(text: string, decimals: number = BnDecimals.Wei): Result<BN, BnParseError> {
    checkDigits(decimals, 'decimals')
    const res = parseDecimal(text)
    return res.ok ? ok(new BN(res.value, decimals)) : res
  }

  /** Returns the smallest of the values. */
  public static min(first: BN, ...rest: BN[]): BN {
    return rest.reduce((min, el) => (el.lt(min) ? el : min), first)
  }

  /** Returns the largest of the values. */
  public static max(first: BN, ...rest: BN[]): BN {
    return rest.reduce((max, el) => (el.gt(max) ? el : max), first)
  }

  /** The value times `10 ** BN.PRECISION`. */
  public get raw(): bigint {
    return this.#raw
  }

  /** The number of fraction digits in {@link BN.units} and {@link BN.toString}. */
  public get decimals(): number {
    return this.#decimals
  }

  /** The value in base units, such as wei. Digits past `decimals` are cut toward zero. */
  public get units(): bigint {
    return this.#raw / unitOf(this.#decimals)
  }

  /** Whether the value is 0. */
  public get isZero(): boolean {
    return this.#raw === 0n
  }

  /** Whether the value is greater than 0. */
  public get isPositive(): boolean {
    return this.#raw > 0n
  }

  /** Whether the value is less than 0. */
  public get isNegative(): boolean {
    return this.#raw < 0n
  }

  /** Returns `this + other`. The result keeps the decimals of `this`, as every operation does. */
  public add(other: BN): BN {
    return this.#with(this.#raw + other.raw)
  }

  /** Returns `this - other`. */
  public sub(other: BN): BN {
    return this.#with(this.#raw - other.raw)
  }

  /** Returns `this * other`; digits past {@link BN.PRECISION} are cut toward zero. */
  public mul(other: BN): BN {
    return this.#with((this.#raw * other.raw) / ONE)
  }

  /**
   * Returns `this / other`; digits past {@link BN.PRECISION} are cut toward zero.
   *
   * @throws RangeError when `other` is zero.
   */
  public div(other: BN): BN {
    if (other.isZero) throw new RangeError('BN: division by zero')
    return this.#with((this.#raw * ONE) / other.raw)
  }

  /**
   * Returns `this ** exponent`.
   *
   * @throws TypeError when `exponent` is not a non-negative integer.
   */
  public pow(exponent: number): BN {
    assert(isIntegerIn(exponent, 0), `BN: exponent must be a non-negative integer, got ${exponent}`)
    if (!exponent) return this.#with(ONE)
    return this.#with(this.#raw ** BigInt(exponent) / ONE ** BigInt(exponent - 1))
  }

  /**
   * Returns the square root, cut toward zero at {@link BN.PRECISION}.
   *
   * @throws RangeError when the value is negative.
   */
  public sqrt(): BN {
    if (this.isNegative) throw new RangeError(`BN: no square root of ${this.toString()}`)
    return this.#with(sqrtBigInt(this.#raw * ONE))
  }

  /** Returns `-this`. */
  public negated(): BN {
    return this.#with(-this.#raw)
  }

  /** Returns the absolute value. */
  public abs(): BN {
    return this.isNegative ? this.negated() : this
  }

  /** Returns `percent` % of this value. */
  public percent(percent: number): BN {
    return this.mul(this.#with(BN.from(percent).raw / 100n))
  }

  /** Returns this value plus `percent` % of it. */
  public addPercent(percent: number): BN {
    return this.add(this.percent(percent))
  }

  /** Returns this value minus `percent` % of it. */
  public subPercent(percent: number): BN {
    return this.sub(this.percent(percent))
  }

  /** Returns -1, 0 or 1 when this value is less than, equal to or greater than `other`. */
  public cmp(other: BN): -1 | 0 | 1 {
    return compareBigInt(this.#raw, other.raw)
  }

  /** Returns whether `this == other`. Decimals do not take part in any comparison. */
  public eq(other: BN): boolean {
    return this.#raw === other.raw
  }

  /** Returns whether `this < other`. */
  public lt(other: BN): boolean {
    return this.#raw < other.raw
  }

  /** Returns whether `this <= other`. */
  public lte(other: BN): boolean {
    return this.#raw <= other.raw
  }

  /** Returns whether `this > other`. */
  public gt(other: BN): boolean {
    return this.#raw > other.raw
  }

  /** Returns whether `this >= other`. */
  public gte(other: BN): boolean {
    return this.#raw >= other.raw
  }

  /**
   * Returns the same value with `decimals` as the scale of {@link BN.units}.
   *
   * @throws TypeError when `decimals` is out of range.
   */
  public toDecimals(decimals: number): BN {
    return new BN(this.#raw, checkDigits(decimals, 'decimals'))
  }

  /**
   * Returns the value rounded to `places` fraction digits. The `decimals` stay the same.
   *
   * @throws TypeError when `places` is out of range.
   */
  public round(places: number, mode: BnRounding = BnRounding.HalfUp): BN {
    return this.#with(roundRaw(this.#raw, checkDigits(places, 'places'), mode))
  }

  /**
   * Returns display text, such as `'USD 1,234.50'`, cut toward zero by default.
   *
   * @throws TypeError when `opts.decimals` or a group size is out of range.
   */
  public format(opts: BnFormatOptions = {}): string {
    const decimals = checkDigits(opts.decimals ?? this.#decimals, 'decimals')
    const raw = roundRaw(this.#raw, decimals, opts.rounding ?? BnRounding.Down)
    return formatUnits(raw / unitOf(decimals), decimals, opts)
  }

  /** Returns the value with exactly `decimals` fraction digits, such as `'-0.001123'`. */
  public toString(): string {
    return this.format({ groupSize: 0 })
  }

  /** Returns {@link BN.units} as a string, which JSON can hold without losing digits. */
  public toJSON(): string {
    return this.units.toString()
  }

  #with(raw: bigint): BN {
    return new BN(raw, this.#decimals)
  }
}
