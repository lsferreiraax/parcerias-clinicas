export const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

export function acharUuids(texto: string): string[] {
  return [...new Set(texto.match(UUID_RE) ?? [])]
}
