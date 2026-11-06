// Call sites only need strings and optional/conditional strings.
type ClassName = string | false | null | undefined

export function classes(first?: ClassName, second?: ClassName, third?: ClassName): string {
  let result = first || ''
  if (second) result = result ? `${result} ${second}` : second
  if (third) result = result ? `${result} ${third}` : third
  return result
}
