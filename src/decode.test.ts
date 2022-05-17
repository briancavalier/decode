import { test } from 'tap'
import fc from 'fast-check'
import { fail, isOk, ok } from './decode'

test(isOk.name, t => {
  fc.assert(fc.property(fc.anything(), x => t.ok(isOk(ok(x)))))
  fc.assert(fc.property(fc.anything(), x => t.notOk(isOk(fail(x)))))
  t.end()
})
