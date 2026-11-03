/** The text is not a decimal number that {@link BN.parse} can read. */
export class BnParseError extends Error {
  public override name = 'BnParseError'
  public readonly text: string

  public constructor(text: string, problem: string) {
    super(`BN: "${text}" ${problem}`)
    this.text = text
  }
}
