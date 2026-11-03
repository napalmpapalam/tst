/** How {@link BN.round} treats the dropped digits. */
export enum BnRounding {
  /** Away from zero. */
  Up = 'up',
  /** Toward zero. */
  Down = 'down',
  /** Toward positive infinity. */
  Ceil = 'ceil',
  /** Toward negative infinity. */
  Floor = 'floor',
  /** To the nearest; a tie goes away from zero. */
  HalfUp = 'half-up',
  /** To the nearest; a tie goes toward zero. */
  HalfDown = 'half-down',
  /** To the nearest; a tie goes toward positive infinity. */
  HalfCeil = 'half-ceil',
  /** To the nearest; a tie goes toward negative infinity. */
  HalfFloor = 'half-floor',
}

/** The decimals of common chain tokens. */
export enum BnDecimals {
  Lamport = 9,
  Wei = 18,
  Yocto = 24,
}
