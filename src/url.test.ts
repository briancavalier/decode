import { test } from 'tap'
import { decode, isOk, ok } from './decode'
import { url } from './url'

test(url.name, t => {
  const validUrl = 'https://foo.bar/baz'
  t.same(decode(url, validUrl), ok(new URL(validUrl)), 'Accepts valid URL string')
  t.notOk(isOk(decode(url, '')), 'Rejects invalid URL string')
  t.end()
})
