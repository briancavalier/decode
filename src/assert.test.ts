import fc from 'fast-check'
import { test } from 'tap'
import { assertOk } from './assert'
import { fail, ok } from './decode'

test(assertOk.name, t => {
  fc.assert(fc.property(fc.anything(), x => t.equal(assertOk(ok(x)), x)))
  // NOTE: t.throws returns the thrown value, but fc.assert expects
  // strict boolean true for success
  fc.assert(fc.property(fc.anything(), x => !!t.throws(() => assertOk(fail(x)))))
  t.end()
})
