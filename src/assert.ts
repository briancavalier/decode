import { Decode, Ok, decode, isOk } from './decode'
import { Stringifiable, renderFailure } from './fail'

export const assert = <I, O, E>(d: Decode<I, O, E>, i: I): O => {
  const r = decode(d, i)
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
