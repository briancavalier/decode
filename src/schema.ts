import { Output, Decode, DecodeResult, fail, isOk, ok, KeyItemsFailed, number, string, Errors, record, Label, optional } from './decode'

/**
 * A schema is:
 * - a decoder, or
 * - a record whose properties are schemas, or
 * - a tuple whose elements are schemas
 * @example
 * const personSchema = {
 *   name: number,
 *   address: {
 *     street: string,
 *     city: string,
 *     state: string
 *   }
 * }
 */
export type AnySchema =
  | Decode<any, unknown, unknown>
  | RecordSchema
  | TupleSchema

interface RecordSchema extends Record<string, AnySchema> { }
type TupleSchema = readonly AnySchema[]

/**
 * Derive a type from a schema
 * @example
 * const personSchema = { name: string } as const
 * type Person = FromSchema<typeof personSchema>
 */
export type FromSchema<S extends AnySchema> =
  S extends RecordSchema ? { readonly [K in keyof S]: FromSchema<S[K]> }
  : S extends TupleSchema ? { readonly [K in (keyof S & number)]: FromSchema<S[K]> }
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
> => ((r: SchemaInput<Schema>) => decodeSchema(s, r)) as any

type SchemaInput<Schema> = Schema extends Decode<infer I, unknown, unknown> ? I
  : Schema extends readonly unknown[] ? readonly unknown[]
  : Record<string, unknown>

type SchemaErrors<Schema> = Schema extends Decode<any, unknown, infer E> ? E
  : Schema extends readonly unknown[] ? KeyItemsFailed<Schema, { [K in (keyof Schema & number)]: Label<K, SchemaErrors<Schema[K]>> }>
  : KeyItemsFailed<Schema, readonly ({ [K in keyof Schema]: Label<K, SchemaErrors<Schema[K]>> }[keyof Schema])[]>

const decodeSchema = <Schema extends AnySchema>(
  s: Schema,
  i: SchemaInput<Schema>
): DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>> =>
  (typeof s === 'function' ? s(i)
    : Array.isArray(s) ? decodeTupleSchema(s, i)
      : decodeRecordSchema(s as RecordSchema, i)) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>

const decodeTupleSchema = <Schema extends TupleSchema>(s: Schema, i: readonly unknown[]): DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>> => {
  let r = []
  let e = []
  for (let k = 0; k < s.length; k++) {
    const rk = decodeSchema(s[k] as any, i[k] as SchemaInput<Schema>)
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

const decodeRecordSchema = <Schema extends RecordSchema>(s: Schema, i: Record<string, unknown>): DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>> => {
  let r = {} as Record<string, unknown>
  let e = []
  for (const k of Object.keys(s)) {
    const rk = decodeSchema(s[k] as any, i[k] as SchemaInput<Schema>)
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
