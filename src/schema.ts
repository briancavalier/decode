import { Output, Decode, DecodeResult, fail, isOk, ok, KeyItemsFailed, Label, object, Errors } from './decode'

/**
 * A schema is:
 * - a decoder, or
 * - a record whose properties are schemas
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

interface RecordSchema extends Record<string, AnySchema> { }

/**
 * Derive a type from a schema
 * @example
 * const personSchema = { name: string } as const
 * type Person = FromSchema<typeof personSchema>
 */
export type FromSchema<S extends AnySchema> =
  S extends RecordSchema ? { readonly [K in keyof S]: FromSchema<S[K]> }
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
  : Record<string, unknown>

type SchemaErrors<Schema> = Schema extends Decode<any, unknown, infer E> ? E
  : (KeyItemsFailed<
    Schema,
    readonly ({ [K in keyof Schema]: Label<K, SchemaErrors<Schema[K]>> }[keyof Schema])[]>) | Errors<typeof object>

const decodeSchema = <Schema extends AnySchema>(
  s: Schema,
  i: SchemaInput<Schema>
): DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>> => {
  if (typeof s === 'function') return s(i) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>

  const check = object(i)
  return (isOk(check) ? decodeRecordSchema(s, i) : check) as DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>>
}

const decodeRecordSchema = <Schema extends RecordSchema>(s: Schema, i: Record<string, unknown>): DecodeResult<FromSchema<Schema>, SchemaErrors<Schema>> => {
  let r = {} as Record<string, unknown>
  let e = []
  for (const k of Object.keys(s)) {
    const rk = decodeSchema(s[k] as AnySchema, i[k] as SchemaInput<Schema>)
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
