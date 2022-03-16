import { Decode, decode, Fail } from './decode'
import { Stringifiable, renderFail } from './fail'

export const assert = <I, O, E>(d: Decode<I, O, E>, i: I): O => {
  const r = decode(d, i)
  if (r.ok) return r.value
  throw new DecodeAssertError(r as unknown as Fail<Stringifiable>)
}

class DecodeAssertError extends Error {
  constructor(public readonly failure: Fail<Stringifiable>) {
    super()
  }

  get message(): string {
    return renderFail(this.failure)
  }
}
