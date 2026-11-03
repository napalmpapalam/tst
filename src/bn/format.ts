/** Returns `units` with exactly `decimals` fraction digits, such as `'-0.001123'`. */
export const formatUnits = (units: bigint, decimals: number): string => {
  const negative = units < 0n
  const digits = (negative ? -units : units).toString().padStart(decimals + 1, '0')
  const point = digits.length - decimals
  const text = decimals ? `${digits.slice(0, point)}.${digits.slice(point)}` : digits

  return negative ? `-${text}` : text
}
