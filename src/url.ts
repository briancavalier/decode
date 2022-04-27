import { DecodeResult, fail, ok, Variant } from './decode'

export type InvalidUrlString = Variant<'InvalidUrlString', { readonly error: unknown }>

/** Decode a string to a URL */
export const url = (s: string): DecodeResult<URL, InvalidUrlString> => {
  try {
    return ok(new URL(s))
  } catch (error) {
    return fail({ type: 'InvalidUrlString', error })
  }
}
