import { Fail, KeyItemsFailed, UnexpectedInput, Label, AtKey } from './decode'

export const renderFail = ({ error }: Fail<Stringifiable>): string =>
  stringifyError(error)

const pad = (n: number, p = ' '): string => n > 1 ? p + pad(n - 1, p) : p

type Node<T extends string> = { type: T }
type ErrorAST = KeyItemsFailed<readonly Stringifiable[]> | UnexpectedInput<unknown, unknown> | Label<unknown, Node<string>> | AtKey<string, Node<string>>
export type Stringifiable = string | Error | Node<string> | readonly Stringifiable[] | ErrorAST

export const stringifyError = (s: Stringifiable, depth = 0): string => {
  if (typeof s === 'string') return s
  if (Array.isArray(s)) return s.map(x => stringifyError(x, depth + 1)).join('\n')

  const n = s as ErrorAST
  if (n.type === 'KeyItemsFailed') return `\n${stringifyError(n.errors, depth + 1)}`
  if (n.type === 'AtKey') return `${pad(depth)}${n.key}: ${stringifyError(n.error, depth + 1)}`
  if (n.type === 'Label') return `[${n.label}] ${stringifyError(n.value, depth + 1)}`
  if (n.type === 'UnexpectedInput') return `expected ${n.expected}, got ${n.input}: ${typeof n.input}`

  const { type, ...data } = n as Node<string>
  return `${type}: ${JSON.stringify(data)}`
}
