import fc from 'fast-check'
import { test } from 'tap'
import { isOk, } from './decode'
import { arrayOf, boolean, fromSchema, number, string } from './schema'

test(fromSchema.name, t => {
  const schema = {
    a: string,
    b: number,
    c: {
      c1: boolean,
      c2: arrayOf(number)
    }
  } as const

  fc.assert(fc.property(fc.record({
    a: fc.string(),
    b: fc.float(),
    c: fc.record({
      c1: fc.boolean(),
      c2: fc.array(fc.float())
    })
  }), r => t.ok(isOk(fromSchema(schema)(r)))))

  t.notOk(isOk(fromSchema(schema)({})))

  fc.assert(fc.property(fc.record({
    a: fc.float(),
    b: fc.anything(),
    c: fc.anything()
  }), r => t.notOk(isOk(fromSchema(schema)(r)))))

  t.end()
})
