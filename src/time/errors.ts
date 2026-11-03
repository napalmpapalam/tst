/** The text is not a time that `Time.parse` can read. */
export class TimeParseError extends Error {
  public override name = 'TimeParseError'
  public readonly text: string

  public constructor(text: string, problem: string) {
    super(`Time: "${text}" ${problem}`)
    this.text = text
  }
}

/** The text is not an ISO 8601 duration that `Duration.parse` can read. */
export class DurationParseError extends Error {
  public override name = 'DurationParseError'
  public readonly text: string

  public constructor(text: string) {
    super(`Duration: "${text}" is not an ISO 8601 duration`)
    this.text = text
  }
}
