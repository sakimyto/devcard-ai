export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export function cardSerial(username: string): string {
  const hex = (fnv1a32(username) >>> 16).toString(16).toUpperCase().padStart(4, '0')
  return `#${hex}`
}

export function artSeed(username: string): number {
  return fnv1a32(username)
}
