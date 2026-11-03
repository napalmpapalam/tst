// The Standard Schema v1 interface (https://standardschema.dev), copied in as the spec advises.

/** A validator that zod, valibot, arktype and others implement. */
export type StandardSchemaV1<Input = unknown, Output = Input> = {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

export declare namespace StandardSchemaV1 {
  /** The properties that every Standard Schema has. */
  export type Props<Input = unknown, Output = Input> = {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>
    readonly types?: Types<Input, Output> | undefined
  }

  /** The outcome of `validate`. */
  export type Result<Output> = SuccessResult<Output> | FailureResult

  /** A passed validation. */
  export type SuccessResult<Output> = {
    readonly value: Output
    readonly issues?: undefined
  }

  /** A failed validation. */
  export type FailureResult = {
    readonly issues: readonly Issue[]
  }

  /** One validation problem. */
  export type Issue = {
    readonly message: string
    readonly path?: readonly (PropertyKey | PathSegment)[] | undefined
  }

  /** One key in the path of an {@link Issue}. */
  export type PathSegment = {
    readonly key: PropertyKey
  }

  /** The input and output types of a schema, for inference only. */
  export type Types<Input = unknown, Output = Input> = {
    readonly input: Input
    readonly output: Output
  }

  /** The output type of a schema. */
  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['output']
}
