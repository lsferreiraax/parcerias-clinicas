export const fmt = {
  moeda: (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  data: (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  },
  dataISO: (d: string) => d,
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}
