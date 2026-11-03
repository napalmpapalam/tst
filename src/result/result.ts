/** A successful {@link Result} that holds a value. */
export class Ok<T> {
  public readonly ok = true
  public readonly value: T

  public constructor(value: T) {
    this.value = value
  }

  /** Returns the value. */
  public unwrap(): T {
    return this.value
  }
}

/** A failed {@link Result} that holds an error. */
export class Err<E> {
  public readonly ok = false
  public readonly error: E

  public constructor(error: E) {
    this.error = error
  }

  /**
   * Throws the error as the `cause` of a `TypeError`: unwrap only a result that a correct program
   * cannot fail, such as a parse of a literal in code.
   *
   * @throws TypeError always.
   */
  public unwrap(): never {
    const message = this.error instanceof Error ? this.error.message : String(this.error)
    throw new TypeError(message, { cause: this.error })
  }
}

/**
 * The outcome of an operation that can fail in an expected way.
 *
 * @example
 * ```ts
 * const res = Result.try(() => JSON.parse(raw), SyntaxError)
 *
 * if (!res.ok) return res.error.message
 *
 * use(res.value)
 * ```
 */
export type Result<T, E> = Ok<T> | Err<E>

/** A class that `instanceof` can check, abstract or not. */
export type ResultErrorClass<E extends Error> = abstract new (...args: never[]) => E

/** The return type of `Result.try`: a promise of a {@link Result} when `fn` returns a promise. */
export type ResultSettled<T, E> = T extends Promise<infer U> ? Promise<Result<U, E>> : Result<T, E>

/** Returns an {@link Ok} that holds `value`. */
export const ok = <T>(value: T): Ok<T> => new Ok(value)

/** Returns an {@link Err} that holds `error`. */
export const err = <E>(error: E): Err<E> => new Err(error)

/** Static helpers that sit next to the {@link Result} type. */
export const Result = {
  /**
   * Runs `fn` and returns its value as {@link Ok}, or an error of `errorClass` as {@link Err}.
   *
   * @throws Any error that is not an instance of `errorClass`.
   */
  try: tryResult,
}

/** Awaits `fn` when it returns a promise. */
function tryResult<T, E extends Error>(
  fn: () => T,
  errorClass: ResultErrorClass<E>,
): ResultSettled<T, E>
function tryResult<E extends Error>(
  fn: () => unknown,
  errorClass: ResultErrorClass<E>,
): Result<unknown, E> | Promise<Result<unknown, E>> {
  try {
    const value = fn()

    return value instanceof Promise ? settle(value, errorClass) : ok(value)
  } catch (e) {
    return toErr(e, errorClass)
  }
}

const settle = async <E extends Error>(
  promise: Promise<unknown>,
  errorClass: ResultErrorClass<E>,
): Promise<Result<unknown, E>> => {
  try {
    return ok(await promise)
  } catch (e) {
    return toErr(e, errorClass)
  }
}

const toErr = <E extends Error>(e: unknown, errorClass: ResultErrorClass<E>): Err<E> => {
  if (!(e instanceof errorClass)) throw e

  return err(e)
}
