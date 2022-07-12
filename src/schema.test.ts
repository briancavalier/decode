import fc from 'fast-check'
import { test } from 'tap'
import { isOk, ok, } from './decode'
import { array, arrayOf, boolean, fromSchema, nullable, number, object, optional, string, union, unknown } from './schema'

test(fromSchema.name, t => {
  const schema = {
    a: string,
    b: number,
    c: {
      c1: boolean,
      c2: arrayOf(number)
    },
    d: [1, 2, 3]
  } as const

  fc.assert(fc.property(fc.record({
    a: fc.string(),
    b: fc.float(),
    c: fc.record({
      c1: fc.boolean(),
      c2: fc.array(fc.float())
    }),
    d: fc.constant([1, 2, 3] as const)
  }), r => t.ok(isOk(fromSchema(schema)(r)))))

  t.notOk(isOk(fromSchema(schema)({})))

  fc.assert(fc.property(fc.record({
    a: fc.float(),
    b: fc.anything(),
    c: fc.anything(),
    d: fc.array(fc.float())
  }), r => t.notOk(isOk(fromSchema(schema)(r)))))

  t.end()
})

test(unknown.name, t => {
  fc.assert(fc.property(fc.anything(), x => t.same(unknown(x), ok(x))))
  t.end()
})

test(number.name, t => {
  fc.assert(fc.property(fc.float(), x => t.same(number(x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => typeof x !== 'number'), x => t.notSame(number(x), ok(x))))
  t.end()
})

test(string.name, t => {
  fc.assert(fc.property(fc.string(), x => t.same(string(x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => typeof x !== 'string'), x => t.notSame(string(x), ok(x))))
  t.end()
})

test(boolean.name, t => {
  fc.assert(fc.property(fc.boolean(), x => t.same(boolean(x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => typeof x !== 'boolean'), x => t.notSame(boolean(x), ok(x))))
  t.end()
})

test(array.name, t => {
  fc.assert(fc.property(fc.array(fc.anything()), x => t.same(array(x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => !Array.isArray(x)), x => t.notSame(array(x), ok(x))))
  t.end()
})

test(object.name, t => {
  fc.assert(fc.property(fc.object(), x => t.same(object(x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => x == null || Array.isArray(x) || typeof x !== 'object'), x => t.notSame(object(x), ok(x))))
  t.end()
})

test(nullable.name, t => {
  fc.assert(fc.property(fc.option(fc.string(), { nil: null }), s => t.same(fromSchema(nullable(string))(s), ok(s))))
  t.end()
})

test(optional.name, t => {
  fc.assert(fc.property(fc.option(fc.string(), { nil: undefined }), s => t.same(fromSchema(optional(string))(s), ok(s))))
  t.end()
})

test('optional properties', t => {
  const decode = fromSchema({
    test: optional(number)
  } as const)

  const r1 = decode({})
  const r2 = decode({ test: undefined })

  // Ensure that optional properties are decoded as present-and-undefined
  // and that missing optional properties are treated the same.
  t.ok(isOk(r1) && 'test' in r1.value && r1.value.test === undefined)
  t.ok(isOk(r2) && 'test' in r2.value && r2.value.test === undefined)

  t.strictSame(r1, r2)

  t.end()
})

test(union.name, t => {
  const values = ['a', 'b', 'c'] as const
  const schema = union(...values)
  fc.assert(
    fc.property(fc.string().filter(s => !(values as readonly string[]).includes(s)),
      s => t.notOk(isOk(fromSchema(schema)(s)))))

  values.forEach(s => t.ok(isOk(fromSchema(schema)(s))))

  t.end()
})

test(arrayOf.name, t => {
  const schema = arrayOf(string)
  fc.assert(
    fc.property(fc.array(fc.string()),
      s => t.ok(isOk(fromSchema(schema)(s)))))

  // Empty array is a valid arrayOf(string) at runtime, so filter it out
  fc.assert(
    fc.property(fc.array(fc.float()).filter(a => a.length > 0),
      s => t.notOk(isOk(fromSchema(schema)(s)))))

  t.end()
})
