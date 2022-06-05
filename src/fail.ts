import { KeyItemsFailed, UnexpectedInput, Label, Expect, Missing, OneOf, AllOf, Variant } from './decode'

type Node<T extends string | symbol> = Variant<T, object>

type ErrorAST = OneOf<readonly Node<string>[]> | AllOf<readonly Node<string>[]> | KeyItemsFailed<unknown, readonly Stringifiable[]> | UnexpectedInput<unknown> | Expect<unknown, Node<string>> | Label<unknown, Node<string>> | Missing<Node<string>>
export type Stringifiable = string | Error | Node<string> | readonly Stringifiable[] | ErrorAST

export const renderFailure = (s: Stringifiable, indent = '', pad = ' '): string => {
  if (typeof s === 'string') return s
  if (Array.isArray(s)) return s.map(x => renderFailure(x, indent + pad, pad)).join('\n')

  if (s instanceof Error) return s.stack ?? s.message

  const n = s as ErrorAST
  if (n.type === 'KeyItemsFailed') {
    return bracket(n.context, `\n${renderFailure(n.errors, indent + pad, pad)}\n${indent}`)
  }
  if (n.type === 'OneOf') {
    return `${n.errors.map(e => `${renderFailure(e, indent, pad)}`).join(`\n${indent + pad}| `)}`
  }
  if (n.type === 'AllOf') {
    return `\n${renderFailure(n.errors, indent, pad)}`
  }
  if (n.type === 'Label') return `${indent}${n.label}: ${renderFailure(n.value, indent, pad)}`
  if (n.type === 'Expect') return `expected ${n.expected}, got ${renderFailure(n.value, indent, pad)}`
  if (n.type === 'Missing') return `[MISSING] ${renderFailure(n.value, indent, pad)}`
  if (n.type === 'UnexpectedInput') return `${renderValue(n.input)}`

  const { type, ...data } = n as Node<string>
  return `${indent}${String(type)}: ${renderValue(data)} `
}

const renderValue = (x: unknown): string =>
  x === null ? 'null'
    : x === undefined ? 'undefined'
      : typeof x === 'string' ? `"${x}"`
        : Array.isArray(x) ? `[${x.length > 3 ? `${x.slice(0, 3)}...` : x}]`
          : JSON.stringify(x)

const bracket = (x: unknown, s: string): string =>
  Array.isArray(x) ? `[${s}]` : `{${s}}`
