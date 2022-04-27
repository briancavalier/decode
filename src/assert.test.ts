import fc from 'fast-check'
import { test } from 'tap'
import { assertOk } from './assert'
import { fail, ok } from './decode'

test(assertOk.name, t => {
  // NOTE: NaN !== NaN, so use isNaN
  fc.assert(fc.property(fc.anything(), x => Number.isNaN(x)
    ? t.ok(Number.isNaN(assertOk(ok(x))))
    : t.equal(assertOk(ok(x)), x)), { seed: -276356743, path: "67", endOnFailure: true })
  // NOTE: t.throws returns the thrown value, but fc.assert expects
  // strict boolean true for success
  fc.assert(fc.property(fc.anything(), x => !!t.throws(() => assertOk(fail(x)))))
  t.end()
})
