import { DecodeResult, ok, fail } from './decode'

export type Json = number | string | boolean | readonly Json[] | JsonObject<Json>

export type JsonStringifiable = number | string | boolean | HasToJson | readonly JsonStringifiable[] | JsonObject<JsonStringifiable>

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonObject<T> extends Record<string, T> { }

export interface HasToJson {
  toJSON(): string
}

export type JsonParseError = { type: 'JsonParseError', error: unknown }

export const json = (s: string): DecodeResult<Json, JsonParseError> => {
  try {
    return ok(JSON.parse(s))
  } catch (e) {
    return fail({ type: 'JsonParseError', error: e })
  }
}
