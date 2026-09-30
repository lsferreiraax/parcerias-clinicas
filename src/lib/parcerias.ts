const nomes = new Map<string, string>()

export function registrarParcerias(lista: { id: string; descricao?: string | null }[]) {
  nomes.clear()
  for (const p of lista) if (p.descricao) nomes.set(p.id, p.descricao)
}

export function nomeParceria(id?: string | null): string {
  if (!id) return '—'
  return nomes.get(id) ?? `Parceria ${id}`
}
