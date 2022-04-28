import { DecodeResult, fail, ok, Variant } from './decode'

export type Json = null | number | string | boolean | readonly Json[] | { [k: string]: Json }

export type JsonParseError = Variant<'JsonParseError', { readonly error: unknown }>

/** Decode a JSON string to a JSON value */
export const json = (s: string, reviver?: (key: string, value: string) => any): DecodeResult<Json, JsonParseError> => {
  try {
    return ok(JSON.parse(s, reviver))
  } catch (error) {
    return fail({ type: 'JsonParseError', error })
  }
}
