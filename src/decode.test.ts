import { test } from 'tap'
import fc from 'fast-check'
import { array, boolean, decode, isOk, number, ok, string } from './decode'

test(isOk.name, t => {
  fc.assert(fc.property(fc.anything(), x => t.ok(isOk(ok(x)))))
  fc.assert(fc.property(fc.anything(), x => t.notOk(isOk(x))))
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
