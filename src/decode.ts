/**
 * A Decoder attempts to map an input type to an output type
 * with the possibilty of failure, represented by the type E.
 */
export interface Decode<I, O, E> {
  (i: I): DecodeResult<O, E>
}

export type DecodeResult<O, E> = Ok<O> | E
export type Ok<O> = { type: 'ok', value: O }

export type Input<D> = D extends Decode<infer I, unknown, unknown> ? I : never
export type Output<D> = D extends Decode<any, infer O, unknown> ? O : never
export type Errors<D> = D extends Decode<any, unknown, infer E> ? E : never

export const ok = <O>(value: O): Ok<O> => ({ type: 'ok', value })

/** Check if DecodeResult is successful */
export const isOk = <A>(x: Ok<A> | unknown): x is Ok<A> =>
  !!x && (x as Record<string, unknown>).type === 'ok'

/** Use a decoder to decode an input value */
export const decode = <I, O, E>(d: Decode<I, O, E>, i: I): DecodeResult<O, E> =>
  d(i)

/** Feed the result of one decoder into another */
export const pipe = <I, X, O, E1, E2>(d1: Decode<I, X, E1>, d2: Decode<X, O, E2>): Decode<I, O, E1 | E2> =>
  i => {
    const x = decode(d1, i)
    return isOk(x) ? decode(d2, x.value) : x
  }

/** Create a decoder from a function */
export const map = <I, O>(f: (i: I) => O): Decode<I, O, never> =>
  i => ok(f(i))

/** Transform the output of a decoder */
export const mapInput = <I1, I2, O, E>(f: (i: I1) => I2, d: Decode<I2, O, E>): Decode<I1, O, E> =>
  pipe(map(f), d)

/** Transform the input of a decoder */
export const mapOutput = <I, O1, O2, E>(d: Decode<I, O1, E>, f: (o: O1) => O2): Decode<I, O2, E> =>
  pipe(d, map(f))

/** Transform the error of a decoder */
export const mapError = <I, O, E1, E2>(d: Decode<I, O, E1>, f: (e: E1) => E2): Decode<I, O, E2> =>
  i => {
    const o = decode(d, i)
    return isOk(o) ? o : f(o)
  }

/** Label a value */
export type Label<L, A> = { type: 'Label', label: L, value: A }

export const label = <L>(label: L) => <A>(value: A): Label<L, A> =>
  ({ type: 'Label', label, value })

/** Add a contextual label to a decoder's error */
export const context = <Context, I, O, E>(context: Context, d: Decode<I, O, E>): Decode<I, O, Label<Context, E>> =>
  mapError(d, label(context))

export type OneOf<E> = { type: 'OneOf', errors: E }

export type Intersect<A extends readonly any[]> = A extends [infer Head, ...infer Tail]
  ? Head extends (i: infer I) => any
  ? I & Intersect<Tail>
  : Intersect<Tail>
  : unknown

export type AtLeastTwo<A> = readonly [A, A, ...readonly A[]]

/** Create a decoder that accepts values accepted by any of the provided decoders */
export const or = <Decoders extends AtLeastTwo<Decode<any, unknown, unknown>>, K extends number & keyof Decoders>(...d: Decoders): Decode<Intersect<Decoders>, ProductOutput<Decoders, K>[K], OneOf<readonly ProductErrors<Decoders, K>[]>> =>
  i => {
    const errors = []
    for (let k = 0; k < d.length; k++) {
      const r = decode(d[k], i)
      if (isOk(r)) return r as Ok<ProductOutput<Decoders, K>[typeof k]>
      else errors.push(r)
    }

    return { type: 'OneOf', errors } as OneOf<readonly ProductErrors<Decoders, K>[]>
  }

export type AllOf<E> = { type: 'AllOf', errors: E }

/**
 * Accepts values in the intersection of values accepted by all the provided decoders
 * Applies all decoders to the input, and applies f to merge all the results into a final result
 */
export const and = <Decoders extends AtLeastTwo<Decode<any, unknown, unknown>>, K extends number & keyof Decoders, R>(f: (...o: ProductOutput<Decoders, K>) => R, ...d: Decoders): Decode<Intersect<Decoders>, R, AllOf<readonly ProductErrors<Decoders, K>[]>> =>
  i => {
    const errors = []
    const results = []
    for (let k = 0; k < d.length; k++) {
      const r = decode(d[k], i)
      if (isOk(r)) results.push(r.value)
      else errors.push(r)
    }

    return errors.length === 0
      ? ok(f(...results as unknown as ProductOutput<Decoders, K>))
      : { type: 'AllOf', errors } as AllOf<readonly ProductErrors<Decoders, K>[]>
  }

/** Given a decoder, create a new decoder that accepts all the values of the original plus null */
export const nullable = <I, O, E>(d: Decode<I, O, E>) =>
  or(d, exactly(null))

/** Given a decoder, create a new decoder that accepts all the values of the original plus undefined */
export const optional = <I, O, E>(d: Decode<I, O, E>) =>
  or(d, exactly(undefined))

export type Expect<E, A> = { type: 'Expect', expected: E, value: A }

/** Annotate a decoder with information about its expected input */
export const expect = <Expected, I, O, E>(expected: Expected, d: Decode<I, O, E>): Decode<I, O, Expect<Expected, E>> =>
  mapError(d, e => ({ type: 'Expect', expected, value: e }))

export type UnexpectedInput<I> = { type: 'UnexpectedInput', input: I }

// ---------------------------------------------------------------------------------------
// Decoders

/** Create a decoder that always produces o, and never fails, regardless of input */
export const always = <O>(o: O): Decode<unknown, O, never> =>
  () => ok(o)

/** Create a decoder that accepts only the provided a */
export const exactly = <A extends number | string | boolean | null | undefined | readonly unknown[] | Record<PropertyKey, unknown>>(a: A): Decode<unknown, A, UnexpectedInput<unknown>> =>
  input => input === a ? ok(input as A) : { type: 'UnexpectedInput', expected: a, input }

/** Create a decoder from a refinement */
export const refine = <I, O extends I>(p: (input: I) => input is O): Decode<I, O, UnexpectedInput<I>> =>
  input => p(input)
    ? ok(input as O)
    : { type: 'UnexpectedInput', input }

/** Accepts any number */
export const number = expect('number' as const, refine((x: unknown): x is number => typeof x === 'number'))

/** Accepts any string */
export const string = expect('string' as const, refine((x: unknown): x is string => typeof x === 'string'))

/** Accepts true or false */
export const boolean = expect('boolean' as const, refine((x: unknown): x is boolean => typeof x === 'boolean'))

/** Accepts any value */
export const unknown = expect('unknown' as const, refine((x: unknown): x is unknown => true))

/** Accepts an array of any items */
export const array = expect('unknown[]' as const, refine((x: unknown): x is readonly unknown[] => Array.isArray(x)))

/** Accepts any object */
export const object = expect('object' as const, refine((x: unknown): x is Record<string, unknown> =>
  Object.prototype.toString.call(x) === '[object Object]'))

export type KeyItemsFailed<C, E> = { type: 'KeyItemsFailed', context: C, errors: E }

export type ProductInput<R extends Record<K, Decode<any, unknown, unknown>>, K extends keyof R = keyof R> = {
  readonly [K in keyof R]: Input<R[K]>
}

export type ProductOutput<R extends Record<K, Decode<any, unknown, unknown>>, K extends keyof R = keyof R> = {
  readonly [K in keyof R]: Output<R[K]>
}

export type ProductErrors<R extends Record<K, Decode<any, unknown, unknown>>, K extends keyof R = keyof R> = {
  readonly [K in keyof R]: Errors<R[K]>
}

export type Missing<E> = { type: 'Missing', value: E }

export type DecodeRecord<Fields extends Record<string, Decode<any, unknown, unknown>>> =
  Decode<
    Record<string, unknown>,
    { readonly [K in keyof Fields]: Output<Fields[K]> },
    KeyItemsFailed<
      Record<string, unknown>,
      readonly Label<keyof Fields, ProductErrors<Fields> | Missing<ProductErrors<Fields>>>[]
    >
  >

/** Given an object, refines fields using the provided decoders */
export const record = <Fields extends Record<string, Decode<any, unknown, unknown>>>(r: Fields): DecodeRecord<Fields> =>
  ri => {
    const ro: Record<string, unknown> = {}
    const errors = []
    for (const k of Object.keys(r)) {
      const ir = decode(r[k], ri[k]) as DecodeResult<Output<Fields[keyof Fields]>, ProductErrors<Fields>>
      if (isOk(ir)) ro[k] = ir.value
      else {
        if (k in ri) errors.push({ type: 'Label', label: k, value: ir } as const)
        else errors.push({ type: 'Label', label: k, value: { type: 'Missing', value: ir } } as const)
      }
    }

    return errors.length === 0
      ? ok(ro as ProductOutput<Fields>)
      : { type: 'KeyItemsFailed', context: ri, errors }
  }

/** Accepts an array of values accepted by the provided decoder */
export const arrayOf = <I, O, E>(d: Decode<I, O, E>): Decode<readonly I[], readonly O[], KeyItemsFailed<readonly I[], readonly Label<number, E>[]>> =>
  ai => {
    const r: unknown[] = []
    const errors: Label<number, E>[] = []
    for (let k = 0; k < ai.length; k++) {
      const ir = decode(d, ai[k])
      if (isOk(ir)) r[k] = ir.value
      else errors.push({ type: 'Label', label: k, value: ir })
    }
    return errors.length === 0 ? ok(r) as Ok<readonly O[]> : { type: 'KeyItemsFailed', context: ai, errors }
  }

export type DecodeTuple<R extends readonly Decode<unknown, unknown, unknown>[], K extends number & keyof R = number & keyof R> =
  Decode<
    readonly unknown[],
    ProductOutput<R, K>,
    KeyItemsFailed<
      readonly unknown[],
      readonly Label<K, Missing<ProductErrors<R, K>> | ProductErrors<R, K>>[]
    >
  >

/** Given an array, refines a type using the provided decoders */
export const tuple = <R extends readonly Decode<unknown, unknown, unknown>[], K extends number & keyof R>(...r: R): DecodeTuple<R, K> =>
  ri => {
    const ro = [] as unknown[]
    const errors: Label<K, Missing<ProductErrors<R, K>> | ProductErrors<R, K>>[] = []
    for (let k = 0; k < r.length; k++) {
      const ir = decode(r[k], ri[k]) as DecodeResult<ProductOutput<R, K>[K], ProductErrors<R, K>>
      if (isOk(ir)) ro[k] = ir.value
      else {
        if (k in ri) errors.push({ type: 'Label', label: k as K, value: ir })
        else errors.push({ type: 'Label', label: k as K, value: { type: 'Missing', value: ir } })
      }
    }

    return errors.length === 0
      ? ok(ro as unknown as ProductOutput<R, K>)
      : { type: 'KeyItemsFailed', context: ri, errors }
  }
