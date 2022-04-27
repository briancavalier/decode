import fc from 'fast-check'
import { test } from 'tap'
import { arrayOf, decode, isOk, number, string, boolean, object, pipe } from './decode'
import { assertOk } from './assert'
import { fromSchema } from './schema'

// const schema = {
//   a: string,
//   b: number,
//   c: {
//     c1: boolean,
//     c2: arrayOf(number)
//   }
// } as const

// assertOk(pipe(object, fromSchema(schema))({ "a": 0, "b": {}, "c": {} }))

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
  }), r => t.ok(isOk(decode(fromSchema(schema), r)))))

  t.notOk(isOk(decode(fromSchema(schema), {})))

  fc.assert(fc.property(fc.record({
    a: fc.float(),
    b: fc.anything(),
    c: fc.anything()
  }), r => t.notOk(isOk(decode(fromSchema(schema), r)))))

  t.end()
})
