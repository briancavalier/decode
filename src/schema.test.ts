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
    }
  } as const

  fc.assert(fc.property(fc.record({
    a: fc.string(),
    b: fc.float(),
    c: fc.record({
      c1: fc.boolean(),
      c2: fc.array(fc.float())
    })
  }), r => t.ok(isOk(fromSchema(schema)(r)))))

  t.notOk(isOk(fromSchema(schema)({})))

  fc.assert(fc.property(fc.record({
    a: fc.float(),
    b: fc.anything(),
    c: fc.anything()
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

  t.end()
})
