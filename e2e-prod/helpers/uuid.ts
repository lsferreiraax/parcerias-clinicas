export const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Só a CONTAGEM de UUIDs distintos; o texto e os UUIDs nunca saem da memória. */
export function contarUuids(texto: string): number {
  return new Set(texto.match(UUID_RE) ?? []).size
}
