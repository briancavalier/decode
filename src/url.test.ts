import fc from 'fast-check'
import { test } from 'tap'
import { decode, isOk, ok } from './decode'
import { url } from './url'

test(url.name, t => {
  fc.assert(fc.property(fc.webUrl(), x => t.same(decode(url, x), ok(new URL(x)))))
  t.notOk(isOk(decode(url, '')))
  t.end()
})
