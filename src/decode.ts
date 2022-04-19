/**
 * A Decoder attempts to map an input type to an output type
 * with the possibilty of failure, represented by the type E.
 */
export interface Decode<I, O, E> {
  (i: I): DecodeResult<O, E>
}

/** Open variant used to represent decoding results */
export type Variant<T, A> = { readonly type: T } & A

export type DecodeResult<O, E> = Ok<O> | Fail<E>

export type Ok<O> = Variant<'ok', { value: O }>
export type Fail<E> = Variant<'fail', { error: E }>

/** Construct an Ok */
export const ok = <O>(value: O): Ok<O> => ({ type: 'ok', value })

/** Check if DecodeResult is Ok */
export const isOk = <A, E>(r: DecodeResult<A, E>): r is Ok<A> =>
  r.type === 'ok'

/** Construct a Fail */
export const fail = <E>(error: E): Fail<E> => ({ type: 'fail', error })

export type Input<D> = D extends Decode<infer I, unknown, unknown> ? I : never
export type Output<D> = D extends Decode<any, infer O, unknown> ? O : never
export type Errors<D> = D extends Decode<any, unknown, infer E> ? E : never

/** Use a decoder to decode an input value */
export const decode = <I, O, E>(d: Decode<I, O, E>, i: I): DecodeResult<O, E> =>
  d(i)

/** Feed the result of one decoder into another */
export function pipe<A, B, O, E1, E2>(d1: Decode<A, B, E1>, d2: Decode<B, O, E2>): Decode<A, O, E1 | E2>
export function pipe<A, B, C, O, E1, E2, E3>(d1: Decode<A, B, E1>, d2: Decode<B, C, E2>, d3: Decode<C, O, E3>): Decode<A, O, E1 | E2 | E3>
export function pipe<A, B, C, D, O, E1, E2, E3, E4>(d1: Decode<A, B, E1>, d2: Decode<B, C, E2>, d3: Decode<C, D, E3>, d4: Decode<D, O, E4>): Decode<A, O, E1 | E2 | E3 | E4>
export function pipe<A, B, C, D, E, O, E1, E2, E3, E4, E5>(d1: Decode<A, B, E1>, d2: Decode<B, C, E2>, d3: Decode<C, D, E3>, d4: Decode<D, E, E4>, d5: Decode<E, O, E5>): Decode<A, O, E1 | E2 | E3 | E4 | E5>
export function pipe<A, B, C, E1, E2>(...ds: readonly Decode<unknown, unknown, unknown>[]): Decode<unknown, unknown, unknown> {
  return i => {
    let x = i
    for (const d of ds) {
      const r = d(x)
      if (!isOk(r)) return r
      x = r.value
    }
    return ok(x)
  }
}

/**
 * Transform the input of a decoder
 * @deprecated Use pipe(map(f), d) instead
 */
export const mapInput = <I1, I2, O, E>(f: (i: I1) => I2, d: Decode<I2, O, E>): Decode<I1, O, E> =>
  pipe(map(f), d)

/**
 * Transform the output of a decoder
 * @deprecated Use pipe(d, map(f)) instead
 */
export const mapOutput = <I, O1, O2, E>(d: Decode<I, O1, E>, f: (o: O1) => O2): Decode<I, O2, E> =>
  pipe(d, map(f))

/**
 * Transform the error of a decoder
 */
export const mapError = <I, O, E1, E2>(d: Decode<I, O, E1>, f: (e: E1) => E2): Decode<I, O, E2> =>
  i => {
    const o = decode(d, i)
    return isOk(o) ? o : fail(f(o.error))
  }

/** Label a value */
export type Label<L, A> = Variant<'Label', { label: L, value: A }>

export const label = <L>(label: L) => <A>(value: A): Label<L, A> =>
  ({ type: 'Label', label, value })

/** Add a contextual label to a decoder's error */
export const context = <Context, I, O, E>(context: Context, d: Decode<I, O, E>): Decode<I, O, Label<Context, E>> =>
  mapError(d, label(context))

export type OneOf<E> = Variant<'OneOf', { readonly errors: E }>

export type Intersect<A extends readonly any[]> = A extends [infer Head, ...infer Tail]
  ? Head extends (i: infer I) => any
  ? I & Intersect<Tail>
  : Intersect<Tail>
  : unknown

export type AtLeastTwo<A> = readonly [A, A, ...readonly A[]]

/** Create a decoder that accepts values accepted by any of the provided decoders */
export const or = <Decoders extends AtLeastTwo<Decode<any, unknown, unknown>>, K extends number & keyof Decoders>(...d: Decoders): Decode<Intersect<Decoders>, ProductOutput<Decoders, K>[K], OneOf<readonly ProductErrors<Decoders, K>[]>> =>
  i => {
    const errors: ProductErrors<Decoders, K>[] = []
    for (let k = 0; k < d.length; k++) {
      const r = decode(d[k], i)
      if (isOk(r)) return r as Ok<ProductOutput<Decoders, K>[typeof k]>
      else errors.push(r.error as ProductErrors<Decoders, K>)
    }

    return fail({ type: 'OneOf', errors })
  }

export type AllOf<E> = Variant<'AllOf', { errors: E }>

/**
 * Accepts values in the intersection of values accepted by all the provided decoders
 * Applies all decoders to the input, and applies f to merge all the results into a final result
 */
export const and = <Decoders extends AtLeastTwo<Decode<any, unknown, unknown>>, K extends number & keyof Decoders, R>(f: (...o: ProductOutput<Decoders, K>) => R, ...d: Decoders): Decode<Intersect<Decoders>, R, AllOf<readonly ProductErrors<Decoders, K>[]>> =>
  i => {
    const errors: ProductErrors<Decoders, K>[] = []
    const results = []
    for (let k = 0; k < d.length; k++) {
      const r = decode(d[k], i)
      if (isOk(r)) results.push(r.value)
      else errors.push(r.error as ProductErrors<Decoders, K>)
    }

    return errors.length === 0
      ? ok(f(...results as unknown as ProductOutput<Decoders, K>))
      : fail({ type: 'AllOf', errors })
  }

/** Given a decoder, create a new decoder that accepts all the values of the original plus null */
export const nullable = <I, O, E>(d: Decode<I, O, E>) =>
  or(d, exactly(null))

/** Given a decoder, create a new decoder that accepts all the values of the original plus undefined */
export const optional = <I, O, E>(d: Decode<I, O, E>) =>
  or(d, exactly(undefined))

export type Expect<E, A> = Variant<'Expect', { expected: E, value: A }>

/** Annotate a decoder with information about its expected input */
export const expect = <Expected, I, O, E>(expected: Expected, d: Decode<I, O, E>): Decode<I, O, Expect<Expected, E>> =>
  mapError(d, e => ({ type: 'Expect', expected, value: e }))

export type UnexpectedInput<I> = Variant<'UnexpectedInput', { readonly input: I }>

// ---------------------------------------------------------------------------------------
// Decoders

/** Create a decoder that always produces o, and never fails, regardless of input */
export const always = <O>(o: O): Decode<unknown, O, never> =>
  () => ok(o)

/** Create a decoder that accepts only the provided a */
export const exactly = <A extends number | string | boolean | null | undefined | readonly unknown[] | Record<PropertyKey, unknown>>(a: A): Decode<unknown, A, UnexpectedInput<unknown>> =>
  input => input === a ? ok(input as A) : fail({ type: 'UnexpectedInput', expected: a, input } as const)

/** Create a decoder from a function */
export const map = <I, O>(f: (i: I) => O): Decode<I, O, never> =>
  i => ok(f(i))

/** Accepts any value, cannot fail */
export const unknown: Decode<unknown, unknown, never> = ok

/** Create a decoder from a refinement */
export const refine = <I, O extends I>(p: (input: I) => input is O): Decode<I, O, UnexpectedInput<I>> =>
  input => p(input)
    ? ok(input as O)
    : fail({ type: 'UnexpectedInput', input } as const)

/** Accepts any number */
export const number = expect('number' as const, refine((x: unknown): x is number => typeof x === 'number'))

/** Accepts any string */
export const string = expect('string' as const, refine((x: unknown): x is string => typeof x === 'string'))

/** Accepts true or false */
export const boolean = expect('boolean' as const, refine((x: unknown): x is boolean => typeof x === 'boolean'))

/** Accepts an array of any items */
export const array = expect('unknown[]' as const, refine((x: unknown): x is readonly unknown[] => Array.isArray(x)))

/** Accepts any object */
export const object = expect('object' as const, refine((x: unknown): x is Record<string, unknown> =>
  Object.prototype.toString.call(x) === '[object Object]'))

export type KeyItemsFailed<C, E> = Variant<'KeyItemsFailed', { context: C, errors: E }>

export type ProductInput<R extends Record<K, Decode<any, unknown, unknown>>, K extends keyof R = keyof R> = {
  readonly [K in keyof R]: Input<R[K]>
}

export type ProductOutput<R extends Record<K, Decode<any, unknown, unknown>>, K extends keyof R = keyof R> = {
  readonly [K in keyof R]: Output<R[K]>
}

export type ProductErrors<R extends Record<K, Decode<any, unknown, unknown>>, K extends keyof R = keyof R> = {
  readonly [K in keyof R]: Errors<R[K]>
}

export type Missing<E> = Variant<'Missing', { value: E }>

/** Given an object, refines fields using the provided decoders */
export const record = <Fields extends Record<string, Decode<any, unknown, unknown>>>(r: Fields): Decode<
  Record<string, unknown>,
  { readonly [K in keyof Fields]: Output<Fields[K]> },
  KeyItemsFailed<
    Record<string, unknown>,
    readonly Label<keyof Fields, ProductErrors<Fields> | Missing<ProductErrors<Fields>>>[]
  >
> =>
  ri => {
    const ro: Record<string, unknown> = {}
    const errors: Label<keyof Fields, ProductErrors<Fields> | Missing<ProductErrors<Fields>>>[] = []
    for (const k of Object.keys(r)) {
      const ir = decode(r[k], ri[k]) as DecodeResult<Output<Fields[keyof Fields]>, ProductErrors<Fields>>
      if (isOk(ir)) ro[k] = ir.value
      else {
        if (k in ri) errors.push({ type: 'Label', label: k, value: ir.error })
        else errors.push({ type: 'Label', label: k, value: { type: 'Missing', value: ir.error } })
      }
    }

    return errors.length === 0
      ? ok(ro as ProductOutput<Fields>)
      : fail({ type: 'KeyItemsFailed', context: ri, errors })
  }

/** Accepts an array of values accepted by the provided decoder */
export const arrayOf = <I, O, E>(d: Decode<I, O, E>): Decode<readonly I[], readonly O[], KeyItemsFailed<readonly I[], readonly Label<number, E>[]>> =>
  ai => {
    const r: O[] = []
    const errors: Label<number, E>[] = []
    for (let k = 0; k < ai.length; k++) {
      const ir = decode(d, ai[k])
      if (isOk(ir)) r[k] = ir.value
      else errors.push({ type: 'Label', label: k, value: ir.error })
    }

    return errors.length === 0
      ? ok(r)
      : fail({ type: 'KeyItemsFailed', context: ai, errors })
  }

/** Given an array, refines a type using the provided decoders */
export const tuple = <Items extends readonly Decode<unknown, unknown, unknown>[], K extends number & keyof Items>(...r: Items): Decode<
  readonly unknown[],
  ProductOutput<Items, K>,
  KeyItemsFailed<
    readonly unknown[],
    readonly Label<K, Missing<ProductErrors<Items, K>> | ProductErrors<Items, K>>[]
  >
> =>
  ti => {
    const ro = [] as unknown[]
    const errors: Label<K, Missing<ProductErrors<Items, K>> | ProductErrors<Items, K>>[] = []
    for (let k = 0; k < r.length; k++) {
      const ir = decode(r[k], ti[k]) as DecodeResult<ProductOutput<Items, K>[K], ProductErrors<Items, K>>
      if (isOk(ir)) ro[k] = ir.value
      else {
        if (k in ti) errors.push({ type: 'Label', label: k as K, value: ir.error })
        else errors.push({ type: 'Label', label: k as K, value: { type: 'Missing', value: ir.error } })
      }
    }

    return errors.length === 0
      ? ok(ro as unknown as ProductOutput<Items, K>)
      : fail({ type: 'KeyItemsFailed', context: ti, errors })
  }
