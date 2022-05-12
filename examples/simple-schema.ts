import { isOk, arrayOf, fromSchema, FromSchema, number, optional, string, renderFailure } from '../src'

// Schema for an address
// Note: as const isn't required, but helps TS to derive better types
const address = {
  street: string,
  city: string,
  state: string
} as const

// Schema for a person
const person = {
  name: string,
  age: optional(number),
  addresses: arrayOf(address)
} as const

// Derive a Person type from the person schema
type Person = FromSchema<typeof person>

// Derive a decoder than decodes Record<string, unknown> to Person
const decodePerson = fromSchema(person)

const maybePerson = {
  name: 'Bob',
  addresses: [{
    street: '1234 Some St.',
    city: 'Pittsburgh',
    state: 'PA'
  }]
}

const result = decodePerson(maybePerson)

if (isOk(result)) {
  console.log('valid input', result.value)
} else {
  console.error('invalid input', renderFailure(result.error))
}
