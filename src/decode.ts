export type Decode<I, O, E> = (i: I) => DecodeResult<O, E>

export type DecodeResult<O, E> = Ok<O> | Fail<E>
export type Ok<O> = { ok: true, value: O }
export type Fail<E> = { ok: false, error: E }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Input<D> = D extends Decode<infer I, unknown, unknown> ? I : never
export type Output<D> = D extends Decode<any, infer O, unknown> ? O : never
export type Errors<D> = D extends Decode<any, unknown, infer E> ? E : never

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

export const always = <O>(o: O): Decode<unknown, O, never> =>
  () => ok(o)

export const map = <I, O>(f: (i: I) => O): Decode<I, O, never> =>
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

export type OneOf<E> = { type: 'OneOf', errors: E }

export type Intersect<A extends readonly any[]> = A extends [infer Head, ...infer Tail]
  ? Head extends (i: infer I) => any
  ? I & Intersect<Tail>
  : Intersect<Tail>
  : unknown

export const or = <D extends readonly [Decode<any, unknown, unknown>, Decode<any, unknown, unknown>, ...Decode<any, unknown, unknown>[]], K extends number & keyof D>(...d: D): Decode<Intersect<D>, ProductOutput<K, D>[K], OneOf<readonly ProductErrors<K, D>[]>> =>
  i => {
    const errors = []
    for (let k = 0; k < d.length; k++) {
      const r = d[k](i)
      if (r.ok) return r as Ok<ProductOutput<K, D>[typeof k]>
      errors.push(r.error)
    }

    return fail({ type: 'OneOf', errors }) as Fail<OneOf<readonly ProductErrors<K, D>[]>>
  }

export const and = <I1, I2, O1, O2, R, E1, E2>(d1: Decode<I1, O1, E1>, d2: Decode<I2, O2, E2>, f: (o1: O1, o2: O2) => R): Decode<I1 & I2, R, E1 | E2 | [E1, E2]> =>
  i => {
    const r1 = d1(i)
    const r2 = d2(i)

    if (r1.ok) return r2.ok ? ok(f(r1.value, r2.value)) : r2
    else return r2.ok ? r1 : fail([r1.error, r2.error])
  }

export const nullable = <I, O, E>(d: Decode<I, O, E>) =>
  or(d, exactly(null))

export const optional = <I, O, E>(d: Decode<I, O, E>) =>
  or(d, exactly(undefined))

export type Expect<E, A> = { type: 'Expect', expected: E, value: A }

export const expect = <Expected, I, O, E>(expected: Expected, d: Decode<I, O, E>): Decode<I, O, Expect<Expected, E>> =>
  mapError(d, e => ({ type: 'Expect', expected, value: e }))

export type UnexpectedInput<I> = { type: 'UnexpectedInput', input: I }

export const exactly = <A>(a: A): Decode<unknown, A, UnexpectedInput<unknown>> =>
  input => input === a ? ok(input as A) : fail({ type: 'UnexpectedInput', expected: a, input })

export const guard = <O extends I, I = unknown>(p: (input: I) => input is O): Decode<I, O, UnexpectedInput<I>> =>
  input => p(input)
    ? ok(input as O)
    : fail({ type: 'UnexpectedInput', input })

export const number = expect('number' as const, guard((x: unknown): x is number => typeof x === 'number'))
export const string = expect('string' as const, guard((x: unknown): x is string => typeof x === 'string'))
export const boolean = expect('boolean' as const, guard((x: unknown): x is boolean => typeof x === 'boolean'))
export const unknown = expect('unknown' as const, guard((x: unknown): x is unknown => true))

export const array = expect('unknown[]' as const, guard((x: unknown): x is readonly unknown[] => Array.isArray(x)))

export type KeyItemsFailed<C, E> = { type: 'KeyItemsFailed', context: C, errors: E }

export const arrayOf = <I, O, E>(d: Decode<I, O, E>): Decode<readonly I[], readonly O[], KeyItemsFailed<readonly I[], readonly Label<number, E>[]>> =>
  ai => {
    const r: unknown[] = []
    const errors: Label<number, E>[] = []
    for (let k = 0; k < ai.length; k++) {
      const ir = decode(d, ai[k])
      if (!ir.ok) errors.push({ type: 'Label', label: k, value: ir.error })
      else r.push(ir.value)
    }
    return errors.length === 0 ? ok(r) as Ok<readonly O[]> : fail({ type: 'KeyItemsFailed', context: ai, errors })
  }

export const object = expect('object' as const, guard((x: unknown): x is Record<string, unknown> =>
  Object.prototype.toString.call(x) === '[object Object]'))

export type ProductInput<K extends PropertyKey, R extends Record<K, Decode<any, unknown, unknown>>> = {
  readonly [K in keyof R]: Input<R[K]>
}

export type ProductOutput<K extends PropertyKey, R extends Record<K, Decode<any, unknown, unknown>>> = {
  readonly [K in keyof R]: Output<R[K]>
}

export type ProductErrors<K extends PropertyKey, R extends Record<K, Decode<any, unknown, unknown>>> = {
  readonly [K in keyof R]: Errors<R[K]>
}

export type Missing<E> = { type: 'Missing', value: E }

export const record = <R extends Record<string, Decode<unknown, unknown, unknown>>>(r: R): Decode<Record<string, unknown>, ProductOutput<keyof R, R>, KeyItemsFailed<Record<string, unknown>, readonly Label<keyof R, Missing<ProductErrors<keyof R, R>> | ProductErrors<keyof R, R>>[]>> =>
  ri => {
    const ro: Record<string, unknown> = {}
    const errors: Label<keyof R, Missing<ProductErrors<keyof R, R>> | ProductErrors<keyof R, R>>[] = []
    for (const k of Object.keys(r)) {
      const ir = decode(r[k], ri[k]) as DecodeResult<ProductOutput<keyof R, R>[keyof R], ProductErrors<keyof R, R>>
      if (ir.ok) ro[k] = ir.value
      else {
        if (k in ri) errors.push({ type: 'Label', label: k, value: ir.error })
        else errors.push({ type: 'Label', label: k, value: { type: 'Missing', value: ir.error } })
      }
    }

    return errors.length === 0
      ? ok(ro as ProductOutput<keyof R, R>)
      : fail({ type: 'KeyItemsFailed', context: ri, errors })
  }

export const tuple = <R extends readonly Decode<unknown, unknown, unknown>[], K extends number & keyof R>(...r: R): Decode<readonly unknown[], ProductOutput<K, R>, KeyItemsFailed<readonly unknown[], readonly Label<keyof R, Missing<ProductErrors<K, R>> | ProductErrors<K, R>>[]>> =>
  ri => {
    const ro = [] as unknown[]
    const errors: Label<keyof R, Missing<ProductErrors<K, R>> | ProductErrors<K, R>>[] = []
    for (let k = 0; k < r.length; k++) {
      const ir = decode(r[k], ri[k]) as DecodeResult<ProductOutput<K, R>[keyof R], ProductErrors<K, R>>
      if (ir.ok) ro[k] = ir.value
      else {
        if (k in ri) errors.push({ type: 'Label', label: k, value: ir.error })
        else errors.push({ type: 'Label', label: k, value: { type: 'Missing', value: ir.error } })
      }
    }

    return errors.length === 0
      ? ok(ro as unknown as ProductOutput<K, R>)
      : fail({ type: 'KeyItemsFailed', context: ri, errors })

  }
