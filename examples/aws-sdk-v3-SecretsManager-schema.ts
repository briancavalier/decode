import { fromSchema, FromSchema, json, map, number, object, pipe, string } from '../src'

// Schema describing subset of the fields from aws sdk v3's SecretsManager return type
const secretsManagerOutputSchema = {
  SecretString: json
} as const

// Type of expected responses from SecretsManager
// Not explicitly needed in this example, but shows how types
// can be derived from schemas
type SecretsManagerOutput = FromSchema<typeof secretsManagerOutputSchema>

// Application-specific type schema
const mySecretsSchema = {
  mySecret1: string,
  mySecret2: number
} as const

// Type of our secret values we need to fetch from SecretsManager
// Not explicitly needed in this example, but shows how types
// can be derived from schemas
type MySecrets = FromSchema<typeof mySecretsSchema>

// Compose final decoder from general SecretString decoder and
// application-specific decoder
// Since decodeSecretString outputs Json, we are required to prove
// that it's a JSON object by inserting the object decoder
const decodeSecretsManagerOutputToMySecrets = pipe(
  fromSchema(secretsManagerOutputSchema),
  map(x => x.SecretString), // extract the encoded JSON string
  object, // allows only JSON object values
  fromSchema(mySecretsSchema)
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
const result = decodeSecretsManagerOutputToMySecrets(fakeSecretsManagerOutput)

console.log(result)
