// Next.js hands a page `searchParams` where every value is
// `string | string[] | undefined` — a repeated query parameter
// (?fish=1&fish=2) arrives as an array at runtime even when the TypeScript
// type says string. Normalising to the first value keeps hand-edited or
// shared URLs on the normal path: bad input must show one sentence saying
// what to fix, never crash the page (docs/00-global.md §6).
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
