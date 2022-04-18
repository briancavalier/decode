import { assertOk, decode, json, map, number, object, pipe, record, string } from '../src'

// For reference: subset of the fields from aws sdk v3's SecretsManager return type
type SecretsManagerOutput = {
  readonly SecretString?: string
}

// Record<string, unknown> -> SecretsManagerOutput
// Fails for inputs that don't match this shape
const decodeSecretsManagerOutput = record({
  SecretString: string
})

// General SecretsManager response decoder to extract JSON-encoded SecretString
// Record<string, unknown> -> Json
// Fails for inputs whose SecretString is not a JSON encoded value
const decodeSecretString = pipe(
  decodeSecretsManagerOutput,
  map(x => x.SecretString),
  json, // decode to *any* legal JSON value
)

// Type of our secret values we need to fetch from SecretsManager
// and decode from the SecretString in the response
// Note that this type can be derived: type MySecrets = Output<typeof decodeMySecrets>
type MySecrets = {
  readonly mySecret1: string
  readonly mySecret2: number
}

// Application-specific type decoder
// Record<string, unknown> -> MySecrets
// Fails for inputs that don't match this shape
const decodeMySecrets = record({
  mySecret1: string,
  mySecret2: number
})

// Compose final decoder from general SecretString decoder and
// application-specific decoder
// Since decodeSecretString outputs Json, we are required to prove
// that it's a JSON object by inserting the object decoder
const decodeSecretsManagerOutputToMySecrets = pipe(
  decodeSecretString,
  object, // allows only JSON object values
  decodeMySecrets
)

// A fake SecretsManager response to test
const fakeSecretsManagerOutput = {
  SecretString: JSON.stringify({
    mySecret1: `${Math.random()}`,
    mySecret2: Math.random()
  })
}

// Decode the response
// result is now Ok or Fail
const result = decode(decodeSecretsManagerOutputToMySecrets, fakeSecretsManagerOutput)

console.log(result)

// If assertOk returns at all, result is guaranteed to be
// of the expected type.  If it wasn't, then assertOk will throw
const mySecrets = assertOk(result)

console.log(mySecrets)
