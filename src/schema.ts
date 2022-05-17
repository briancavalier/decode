import { Output, Decode, DecodeResult, fail, isOk, ok, KeyItemsFailed, Label, Errors, Variant, Ok, Expect, UnexpectedInput, expect, refine, OneOf } from './decode'

const schemaSymbol = Symbol()

/**
 * A schema is:
 * - a primitive value
 * - a record whose properties are schemas
 * - a tuple whose elements are schemas
 * - a schema describing the elements of an array
 * - a set of schemas describing variants of a union
 * - a Decode
 * @example
 * const personSchema = {
 *   name: number,
 *   address: {
 *     street: string,
 *     city: string,
 *     state: string
 *   }
 * } as const
 */
export type AnySchema =
  | number | string | boolean | null | undefined
  | RecordSchema
  | TupleSchema
  | { readonly [schemaSymbol]: 'array', schema: AnySchema } // ArraySchema<AnySchema> - avoids TSC recursion issues
  | UnionSchema<TupleSchema>
  | Decode<any, unknown, unknown>

type RecordSchema = { readonly [k: string]: AnySchema }
type TupleSchema = { readonly [k: number]: AnySchema } // Weird, but avoids TSC recursion issues
type ArraySchema<Schema> = { readonly [schemaSymbol]: 'array', readonly schema: Schema }
type UnionSchema<Schemas> = { readonly [schemaSymbol]: 'any', readonly schemas: Schemas }

/** Schema for any value */
export const unknown: Decode<unknown, unknown, never> = ok

/** Schema for any number */
export const number = expect('number' as const, refine((x: unknown): x is number => typeof x === 'number'))

/** Schema for any string */
export const string = expect('string' as const, refine((x: unknown): x is string => typeof x === 'string'))

/** Schema for true or false */
export const boolean = expect('boolean' as const, refine((x: unknown): x is boolean => typeof x === 'boolean'))

/** Schema for an array of unknown items */
export const array = expect('unknown[]' as const, refine((x: unknown): x is readonly unknown[] => Array.isArray(x)))

/** Schema for any object */
export const object = expect('object' as const, refine((x: unknown): x is Record<string, unknown> =>
  Object.prototype.toString.call(x) === '[object Object]'))

/** Schema for an array of items, each of which must conform to the provides schema */
export const arrayOf = <Schema extends AnySchema>(schema: Schema): ArraySchema<Schema> =>
  ({ [schemaSymbol]: 'array', schema })

/** Schema for a union matching at least one of the provided schemas */
export const union = <S1 extends AnySchema, S2 extends AnySchema, S3 extends readonly AnySchema[]>(s1: S1, s2: S2, ...s3: S3): UnionSchema<readonly [S1, S2, ...S3]> =>
  ({ [schemaSymbol]: 'any', schemas: [s1, s2, ...s3] })

/** Given a schema, return a new schema that is s | null */
export const nullable = <Schema extends AnySchema>(s: Schema) =>
  union(s, null)

/** Given a schema, return a new schema that is s | undefined */
export const optional = <Schema extends AnySchema>(s: Schema) =>
  union(s, undefined)

/**
 * Derive a type from a schema
 * @example
 * const personSchema = { name: string } as const
 * type Person = FromSchema<typeof personSchema>
 */
export type FromSchema<S> =
  S extends number | string | boolean | null | undefined ? S
  : S extends readonly AnySchema[] ? { readonly [K in keyof S]: FromSchema<S[K]> }
  : S extends UnionSchema<readonly AnySchema[]> ? FromSchema<S['schemas'][number]>
  : S extends ArraySchema<infer S> ? readonly FromSchema<S>[]
  : S extends RecordSchema ? { readonly [K in keyof S]: FromSchema<S[K]> }
  : Output<S>

/**
 * Derive a decoder from a schema
 * @example
 * const personSchema = { name: string } as const
 * const decodePerson = fromSchema(personSchema)
 */
export const fromSchema = <Schema extends AnySchema>(s: Schema): Decode<
  SchemaInput<Schema>,
  FromSchema<Schema>,
  SchemaErrors<Schema>
> => (typeof s === 'function' ? s
  : r => decodeSchema<Schema>(s, r)) as Decode<SchemaInput<Schema>, FromSchema<Schema>, SchemaErrors<Schema>>

type SchemaInput<Schema> = Schema extends Decode<infer I, unknown, unknown> ? I
  : Schema extends number | string | boolean | null | undefined ? unknown
  : Schema extends UnionSchema<readonly AnySchema[]> ? SchemaInput<Schema['schemas'][number]>
  : Schema extends ArraySchema<unknown> ? readonly unknown[]
  : Schema extends RecordSchema ? Record<string, unknown>
  : readonly unknown[]

type SchemaErrors<Schema> = Schema extends Decode<any, unknown, infer E> ? E
  : Schema extends number | string | boolean | null | undefined ? Expect<Schema, UnexpectedInput<SchemaInput<Schema>>>
  : Schema extends UnionSchema<readonly AnySchema[]> ? readonly (OneOf<SchemaErrors<Schema['schemas'][number]>>)[]
  : Schema extends ArraySchema<infer S> ? (KeyItemsFailed<readonly SchemaInput<S>[], readonly Label<number, SchemaErrors<S>>[]> | Errors<typeof array>)
  : (KeyItemsFailed<
    Schema,
    Schema extends RecordSchema
    ? readonly ({ [K in keyof Schema]: Label<K, SchemaErrors<Schema[K]>> }[keyof Schema])[]
    : readonly ({ [K in keyof Schema]: Label<K, SchemaErrors<Schema[K]>> }[keyof Schema & number])[]
  >)

const isUnionSchema = (x: unknown): x is UnionSchema<readonly [AnySchema, AnySchema, ...readonly AnySchema[]]> =>
  x != null && (x as Record<PropertyKey, unknown>)[schemaSymbol] === 'any'

const isArraySchema = (x: unknown): x is ArraySchema<AnySchema> =>
  x != null && (x as Record<PropertyKey, unknown>)[schemaSymbol] === 'array'

const decodeSchema = <Schema extends AnySchema>(
  s: Schema,
  i: SchemaInput<Schema>
): DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>> => {
  if (typeof s === 'function') {
    return s(i) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>
  } else if (typeof s === 'number' || typeof s === 'string' || typeof s === 'boolean' || s == null) {
    return (s === i
      ? ok(s)
      : fail({ type: 'Expect', expected: s, value: { type: 'UnexpectedInput', input: i } } as const)) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>
  } else if (Array.isArray(s)) {
    const check = array(i)
    return (isOk(check) ? decodeTupleSchema<readonly AnySchema[]>(s, i) : check) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>
  } else if (isArraySchema(s)) {
    return decodeArraySchema(s, i) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>
  } else if (isUnionSchema(s)) {
    return decodeUnionSchema(s.schemas, i) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>
  } else {
    const check = object(i)
    return (isOk(check) ? decodeRecordSchema<RecordSchema>(s, i) : check) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>
  }
}

const decodeRecordSchema = <Schema extends RecordSchema>(s: Schema, i: Record<string, unknown>): DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>> => {
  const r = {} as Record<string, unknown>
  const e = []
  for (const k of Object.keys(s)) {
    const rk = decodeSchema(s[k], i[k])
    if (isOk(rk)) r[k] = rk.value
    else {
      if (k in i) e.push({ type: 'Label', label: k, value: rk.error })
      else e.push({ type: 'Label', label: k, value: { type: 'Missing', value: rk.error } })
    }
  }

  return (e.length > 0
    ? fail({ type: 'KeyItemsFailed', context: i, errors: e })
    : ok(r)) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>
}

const decodeTupleSchema = <Schemas extends readonly AnySchema[]>(s: Schemas, ti: readonly unknown[]): DecodeResult<
  FromSchema<Schemas>,
  SchemaErrors<Schemas>
> => {
  const r = [] as unknown[]
  const e = []
  for (let k = 0; k < s.length; k++) {
    const rk = decodeSchema(s[k], ti[k])
    if (isOk(rk)) r[k] = rk.value
    else {
      if (k in ti) e.push({ type: 'Label', label: k as keyof Schemas, value: rk.error })
      else e.push({ type: 'Label', label: k as keyof Schemas, value: { type: 'Missing', value: rk.error } })
    }
  }

  return (e.length > 0
    ? fail({ type: 'KeyItemsFailed', context: ti, errors: e })
    : ok(r)) as DecodeResult<FromSchema<Schemas>, SchemaErrors<Schemas>>
}

/** Accepts an array of values conforming to the provided schema */
const decodeArraySchema = <Schema extends ArraySchema<AnySchema>>(s: Schema, ai: SchemaInput<Schema>): DecodeResult<
  FromSchema<Schema>,
  SchemaErrors<Schema> | Errors<typeof array>
> => {
  const check = array(ai)
  if (!isOk(check)) return check

  const r = []
  const errors: Label<number, SchemaErrors<Schema>>[] = []
  for (let k = 0; k < ai.length; k++) {
    const ir = decodeSchema(s.schema, ai[k] as SchemaInput<AnySchema>)
    if (isOk(ir)) r[k] = ir.value
    else errors.push({ type: 'Label', label: k, value: ir.error as SchemaErrors<Schema> })
  }

  return errors.length === 0
    ? ok(r as FromSchema<Schema>)
    : fail({ type: 'KeyItemsFailed', context: ai, errors }) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>
}

/** Accepts values conforming to at least one of the provided schemas */
const decodeUnionSchema = <Schemas extends readonly AnySchema[]>(d: Schemas, i: SchemaInput<Schemas[keyof Schemas]>): DecodeResult<
  FromSchema<Schemas[keyof Schemas]>,
  OneOf<readonly SchemaErrors<Schemas[keyof Schemas]>[]>
> => {
  const errors: SchemaErrors<Schemas[keyof Schemas]>[] = []
  for (let k = 0; k < d.length; k++) {
    const r = decodeSchema(d[k], i)
    if (isOk(r)) return r as Ok<FromSchema<Schemas[keyof Schemas]>>
    else errors.push(r.error as SchemaErrors<Schemas[keyof Schemas]>)
  }

  return fail({ type: 'OneOf', errors })
}
