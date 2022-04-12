import { test } from 'tap'
import { boolean, decode, isOk, number, ok, string } from './decode'

test(number.name, t => {
  const n = Math.random()
  t.same(decode(number, n), ok(n), 'Accepts number')
  t.notOk(isOk(decode(number, '')), 'Rejects non-number')
  t.notOk(isOk(decode(number, {})), 'Rejects non-number')
  t.notOk(isOk(decode(number, [])), 'Rejects non-number')
  t.notOk(isOk(decode(number, null)), 'Rejects non-number')
  t.notOk(isOk(decode(number, undefined)), 'Rejects non-number')
  t.notOk(isOk(decode(number, true)), 'Rejects non-number')
  t.notOk(isOk(decode(number, false)), 'Rejects non-number')
  t.end()
})

test(string.name, t => {
  const s = `${Math.random()}`
  t.same(decode(string, s), ok(s), 'Accepts string')
  t.notOk(isOk(decode(string, Math.random())), 'Rejects non-string')
  t.notOk(isOk(decode(string, {})), 'Rejects non-string')
  t.notOk(isOk(decode(string, [])), 'Rejects non-string')
  t.notOk(isOk(decode(string, null)), 'Rejects non-number')
  t.notOk(isOk(decode(string, undefined)), 'Rejects non-number')
  t.notOk(isOk(decode(string, true)), 'Rejects non-number')
  t.notOk(isOk(decode(string, false)), 'Rejects non-number')
  t.end()
})

test(boolean.name, t => {
  t.same(decode(boolean, true), ok(true), 'Accepts string')
  t.same(decode(boolean, false), ok(false), 'Accepts string')
  t.notOk(isOk(decode(boolean, '')), 'Rejects non-boolean')
  t.notOk(isOk(decode(boolean, Math.random())), 'Rejects non-boolean')
  t.notOk(isOk(decode(boolean, {})), 'Rejects non-boolean')
  t.notOk(isOk(decode(boolean, [])), 'Rejects non-boolean')
  t.notOk(isOk(decode(boolean, null)), 'Rejects non-boolean')
  t.notOk(isOk(decode(boolean, undefined)), 'Rejects non-boolean')
  t.end()
})
