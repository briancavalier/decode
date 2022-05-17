import fc from 'fast-check'
import { test } from 'tap'
import { assert, assertOk } from './assert'
import { fail, ok } from './decode'
import { number } from './schema'

test(assert.name, t => {
  fc.assert(fc.property(fc.float(), x => t.equal(assert(number)(x), x)))
  fc.assert(fc.property(fc.string(), x => !!t.throws(x => assert(number)(x), x)))
  t.end()
})

test(assertOk.name, t => {
  // NOTE: NaN !== NaN, so use isNaN
  fc.assert(fc.property(fc.anything(), x => Number.isNaN(x)
    ? t.ok(Number.isNaN(assertOk(ok(x))))
    : t.equal(assertOk(ok(x)), x)))
  // NOTE: t.throws returns the thrown value, but fc.assert expects
  // strict boolean true for success
  fc.assert(fc.property(fc.anything(), x => !!t.throws(() => assertOk(fail(x)))))
  t.end()
})
