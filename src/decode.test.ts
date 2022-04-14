import { test } from 'tap'
import fc from 'fast-check'
import { array, arrayOf, boolean, decode, fail, isOk, number, object, ok, string, tuple, unknown } from './decode'

test(isOk.name, t => {
  fc.assert(fc.property(fc.anything(), x => t.ok(isOk(ok(x)))))
  fc.assert(fc.property(fc.anything(), x => t.notOk(isOk(fail(x)))))
  t.end()
})

test(unknown.name, t => {
  fc.assert(fc.property(fc.anything(), x => t.same(decode(unknown, x), ok(x))))
  t.end()
})

test(number.name, t => {
  fc.assert(fc.property(fc.float(), x => t.same(decode(number, x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => typeof x !== 'number'), x => t.notSame(decode(number, x), ok(x))))
  t.end()
})

test(string.name, t => {
  fc.assert(fc.property(fc.string(), x => t.same(decode(string, x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => typeof x !== 'string'), x => t.notSame(decode(string, x), ok(x))))
  t.end()
})

test(boolean.name, t => {
  fc.assert(fc.property(fc.boolean(), x => t.same(decode(boolean, x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => typeof x !== 'boolean'), x => t.notSame(decode(boolean, x), ok(x))))
  t.end()
})

test(array.name, t => {
  fc.assert(fc.property(fc.array(fc.anything()), x => t.same(decode(array, x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => !Array.isArray(x)), x => t.notSame(decode(array, x), ok(x))))
  t.end()
})

test(object.name, t => {
  fc.assert(fc.property(fc.object(), x => t.same(decode(object, x), ok(x))))
  fc.assert(fc.property(fc.anything().filter(x => x == null || Array.isArray(x) || typeof x !== 'object'), x => t.notSame(decode(object, x), ok(x))))
  t.end()
})

test(arrayOf.name, t => {
  fc.assert(fc.property(fc.array(fc.float()), x => t.same(decode(arrayOf(number), x), ok(x))))
  fc.assert(fc.property(fc.array(fc.anything().filter(x => typeof x !== 'number'), { minLength: 1 }), x => t.notSame(decode(arrayOf(number), x), ok(x))))
  t.end()
})

test(tuple.name, t => {
  t.same(decode(tuple(), []), ok([]))
  fc.assert(fc.property(fc.tuple(fc.float(), fc.string(), fc.boolean()), x => t.same(decode(tuple(number, string, boolean), x), ok(x))))
  fc.assert(fc.property(fc.tuple(fc.float(), fc.string()), x => t.notSame(decode(tuple(number), x), ok(x))))
  fc.assert(fc.property(fc.tuple(fc.float()), x => t.notSame(decode(tuple(number, string), x), ok(x))))
  fc.assert(fc.property(fc.tuple(fc.anything().filter(x => typeof x !== 'number')), x => t.notSame(decode(tuple(number), x), ok(x))))
  t.end()
})
