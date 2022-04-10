import { DecodeResult, ok } from './decode'

export type InvalidUrlString = { type: 'InvalidUrlString', error: unknown }

export const url = (s: string): DecodeResult<URL, InvalidUrlString> => {
  try {
    return ok(new URL(s))
  } catch (error) {
    return { type: 'InvalidUrlString', error }
  }
}
