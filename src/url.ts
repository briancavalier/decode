import { DecodeResult, ok, fail } from './decode'

export type InvalidUrlString = { type: 'InvalidUrlString', error: unknown }

export const url = (s: string): DecodeResult<URL, InvalidUrlString> => {
  try {
    return ok(new URL(s))
  } catch (e) {
    return fail({ type: 'InvalidUrlString', error: e })
  }
}
