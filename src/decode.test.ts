import { test } from 'tap'
import fc from 'fast-check'
import { fail, isOk, ok } from './decode'
import { array, boolean, object, string, unknown, number } from './schema'

test(isOk.name, t => {
  fc.assert(fc.property(fc.anything(), x => t.ok(isOk(ok(x)))))
  fc.assert(fc.property(fc.anything(), x => t.notOk(isOk(fail(x)))))
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
