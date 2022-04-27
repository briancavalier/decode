import { DecodeResult, fail, ok, Variant } from './decode'

export type Json = number | string | boolean | readonly Json[] | JsonObject<Json>

export interface JsonObject<T> extends Record<string, T> { }

export type JsonParseError = Variant<'JsonParseError', { readonly error: unknown }>

/** Decode a JSON string to a JSON value */
export const json = (s: string, reviver?: (key: string, value: string) => any): DecodeResult<Json, JsonParseError> => {
  try {
    return ok(JSON.parse(s, reviver))
  } catch (error) {
    return fail({ type: 'JsonParseError', error })
  }
}
