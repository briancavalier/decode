import { Decode, decode, isOk, Ok } from './decode'
import { Stringifiable, renderFailure } from './fail'

/**
 * Decode i with d, and if successful, return the decoded value directly.
 * If not successful, throw DecodeAssertError describing the failure
 */
export const assert = <I, O, E>(d: Decode<I, O, E>, i: I): O =>
  assertOk(decode(d, i))

/**
 * If r is Ok, return r, otherwise throw DecodeAssertError
 */
export const assertOk = <A, _>(r: Ok<A> | _): A => {
  if (isOk(r)) return r.value
  throw new DecodeAssertError(r as unknown as Stringifiable)
}

class DecodeAssertError extends Error {
  constructor(public readonly failure: Stringifiable) {
    super()
  }

  get message(): string {
    return renderFailure(this.failure)
  }
}
