export type Decode<I, O, E> = (i: I) => DecodeResult<O, E>

export type DecodeResult<O, E> = Ok<O> | Fail<E>
export type Ok<O> = { ok: true, value: O }
export type Fail<E> = { ok: false, error: E }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Input<D extends Decode<any, unknown, unknown>> = D extends Decode<infer I, unknown, unknown> ? I : never
export type Output<D extends Decode<any, unknown, unknown>> = D extends Decode<any, infer O, unknown> ? O : never
export type Errors<D extends Decode<any, unknown, unknown>> = D extends Decode<any, unknown, infer E> ? E : never

export const ok = <O>(value: O): Ok<O> => ({ ok: true, value })
export const fail = <E>(error: E): Fail<E> => ({ ok: false, error })

export const decode = <I, O, E>(d: Decode<I, O, E>, i: I): DecodeResult<O, E> =>
  d(i)

export const is = <I, O extends I, E>(d: Decode<I, O, E>, i: I): i is O =>
  decode(d, i).ok

export const pipe = <I, X, O, E1, E2>(d1: Decode<I, X, E1>, d2: Decode<X, O, E2>): Decode<I, O, E1 | E2> =>
  i => {
    const x = decode(d1, i)
    return x.ok ? decode(d2, x.value) : x
  }

export const map = <I, O, E>(f: (i: I) => O): Decode<I, O, E> =>
  i => ok(f(i))

export const mapInput = <I, H, O, E>(f: (i: I) => H, d: Decode<H, O, E>): Decode<I, O, E> =>
  pipe(map(f), d)

export const mapOutput = <I, O, R, E>(d: Decode<I, O, E>, f: (o: O) => R): Decode<I, R, E> =>
  pipe(d, map(f))

export const mapError = <I, O, E, F>(d: Decode<I, O, E>, f: (e: E) => F): Decode<I, O, F> =>
  i => {
    const o = decode(d, i)
    return o.ok ? o : fail(f(o.error))
  }

export type Label<L, A> = { type: 'Label', label: L, value: A }

export const label = <L>(label: L) => <A>(value: A): Label<L, A> =>
  ({ type: 'Label', label, value })

export const context = <Context, I, O, E>(context: Context, d: Decode<I, O, E>): Decode<I, O, Label<Context, E>> =>
  mapError(d, label(context))

export const or = <I1, I2, O1, O2, E1, E2>(d1: Decode<I1, O1, E1>, d2: Decode<I2, O2, E2>): Decode<I1 & I2, O1 | O2, [E1, E2]> =>
  i => {
    const r1 = d1(i)
    if (r1.ok) return r1

    const r2 = d2(i)
    if (r2.ok) return r2

    return fail([r1.error, r2.error])
  }

export const nullable = <I, O, E>(d: Decode<I, O, E>) =>
  or(d, exactly(null))

export const optional = <I, O, E>(d: Decode<I, O, E>) =>
  or(d, exactly(undefined))

export type UnexpectedInput<H, I> = { type: 'UnexpectedInput', expected: H, input: I }

export const exactly = <A>(a: A): Decode<unknown, A, UnexpectedInput<A, unknown>> =>
  input => input === a ? ok(input as A) : fail({ type: 'UnexpectedInput', expected: a, input })

export const guard = <Hint, O extends I, I = unknown>(expected: Hint, p: (input: I) => input is O): Decode<I, O, UnexpectedInput<Hint, I>> =>
  input => p(input)
    ? ok(input as O)
    : fail({ type: 'UnexpectedInput', expected, input })

export const number = guard('number' as const, (x: unknown): x is number => typeof x === 'number')
export const string = guard('string' as const, (x: unknown): x is string => typeof x === 'string')
export const boolean = guard('boolean' as const, (x: unknown): x is boolean => typeof x === 'boolean')
export const unknown = guard('unknown' as const, (x: unknown): x is unknown => true)

export const array = guard('unknown[]' as const, (x: unknown): x is readonly unknown[] => Array.isArray(x))

export type KeyItemsFailed<E> = { type: 'KeyItemsFailed', errors: E }
export type AtKey<K, E> = { type: 'AtKey', key: K, error: E }

export const arrayOf = <I, O, E>(d: Decode<I, O, E>): Decode<readonly I[], readonly O[], KeyItemsFailed<readonly AtKey<number, E>[]>> =>
  ai => {
    const r: unknown[] = []
    const errors: AtKey<number, E>[] = []
    for (let k = 0; k < ai.length; k++) {
      const ir = decode(d, ai[k])
      if (!ir.ok) errors.push({ type: 'AtKey', key: k, error: ir.error })
      else r.push(ir.value)
    }
    return errors.length === 0 ? ok(r) as Ok<readonly O[]> : fail({ type: 'KeyItemsFailed', errors })
  }

export const record = <K extends PropertyKey, V, KE, VE>(keys: Decode<unknown, K, KE>, values: Decode<unknown, V, VE>): Decode<unknown, Record<K, V>, UnexpectedInput<'Record<string, unknown>', unknown> | KeyItemsFailed<readonly AtKey<unknown, KE | VE>[]>> =>
  i => {
    if (Object.prototype.toString.call(i) !== '[object Object]')
      return fail({ type: 'UnexpectedInput', expected: 'Record<string, unknown>', input: i })

    const r = i as Record<PropertyKey, unknown>
    const ks = Object.keys(r)
    const errors: AtKey<unknown, KE | VE>[] = []
    const result = {} as Record<K, V>

    for (const k of ks) {
      const kr = keys(k)
      if (!kr.ok) errors.push({ type: 'AtKey', key: k, error: kr.error })
      else {
        const kv = values(r[k])
        if (!kv.ok) errors.push({ type: 'AtKey', key: k, error: kv.error })
        else result[kr.value] = kv.value
      }
    }

    return errors.length === 0
      ? ok(result)
      : fail({ type: 'KeyItemsFailed', errors })
  }

export const object = record(string, unknown)

type DecodeRecordInput<R extends Record<string, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R as string]: Input<R[K]>
}

type DecodeRecordResult<R extends Record<string, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R]: Output<R[K]>
}

type DecodeRecordErrors<R extends Record<string, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R]: Errors<R[K]>
}[keyof R]

export const properties = <R extends Record<string, Decode<unknown, unknown, unknown>>>(r: R): Decode<DecodeRecordInput<R>, DecodeRecordResult<R>, KeyItemsFailed<readonly AtKey<keyof R, DecodeRecordErrors<R>>[]>> =>
  ri => {
    const ro: Record<string, unknown> = {}
    const errors: AtKey<keyof R, DecodeRecordErrors<R>>[] = []
    for (const k of Object.keys(r)) {
      const ir = decode(r[k], ri[k]) as DecodeResult<DecodeRecordResult<R>[keyof R], DecodeRecordErrors<R>>
      if (!ir.ok) errors.push({ type: 'AtKey', key: k, error: ir.error })
      else ro[k] = ir.value
    }

    return Object.keys(errors).length === 0
      ? ok(ro as DecodeRecordResult<R>)
      : fail({ type: 'KeyItemsFailed', errors })
  }
