import fc from 'fast-check'
import { test } from 'tap'
import { decode, isOk, ok } from './decode'
import { json } from './json'

test(json.name, t => {
  fc.assert(fc.property(fc.json(), x => t.same(decode(json, x), ok(JSON.parse(x)))))
  // TODO: more failure cases
  t.notOk(isOk(decode(json, '')))
  t.end()
})
