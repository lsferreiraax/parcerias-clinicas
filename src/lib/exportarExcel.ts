import * as XLSX from 'xlsx'
import type { ResumoParceria, ResumoProfissional } from '@/types'

const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function exportarResumoExcel(
  parcerias: ResumoParceria[],
  profissionais: ResumoProfissional[],
) {
  const wb = XLSX.utils.book_new()

  // ── Aba 1: Rateio por Parceria ────────────────────────────────────
  const linhasParceria = parcerias.map(r => ({
    Parceria:          `Parceria ${r.parceria}`,
    Descrição:         r.descricao,
    Atendimentos:      r.total_atendimentos,
    'Valor Total':     moeda(Number(r.valor_total)),
    Camta:             moeda(Number(r.camta_total)),
    Médico:            moeda(Number(r.medico_total)),
    Psi1:              moeda(Number(r.psi1_total)),
    Psi2:              moeda(Number(r.psi2_total)),
  }))

  const totalParceria = {
    Parceria:          'TOTAL',
    Descrição:         '',
    Atendimentos:      parcerias.reduce((s, r) => s + r.total_atendimentos, 0),
    'Valor Total':     moeda(parcerias.reduce((s, r) => s + Number(r.valor_total), 0)),
    Camta:             moeda(parcerias.reduce((s, r) => s + Number(r.camta_total), 0)),
    Médico:            moeda(parcerias.reduce((s, r) => s + Number(r.medico_total), 0)),
    Psi1:              moeda(parcerias.reduce((s, r) => s + Number(r.psi1_total), 0)),
    Psi2:              moeda(parcerias.reduce((s, r) => s + Number(r.psi2_total), 0)),
  }

  const wsParceria = XLSX.utils.json_to_sheet([...linhasParceria, totalParceria])
  wsParceria['!cols'] = [14, 28, 14, 18, 16, 16, 16, 16].map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(wb, wsParceria, 'Por Parceria')

  // ── Aba 2: Rateio por Profissional ────────────────────────────────
  const LABELS: Record<string, string> = { camta: 'Camta', medico: 'Médico', psi1: 'Psi1', psi2: 'Psi2' }
  const totalGeral = profissionais.reduce((s, p) => s + Number(p.total), 0)

  const linhasProf = profissionais.map(p => ({
    Profissional: LABELS[p.profissional] ?? p.profissional,
    Total:        moeda(Number(p.total)),
    '%':          totalGeral > 0
      ? `${((Number(p.total) / totalGeral) * 100).toFixed(1)}%`
      : '0%',
  }))

  linhasProf.push({ Profissional: 'TOTAL GERAL', Total: moeda(totalGeral), '%': '100%' })

  const wsProf = XLSX.utils.json_to_sheet(linhasProf)
  wsProf['!cols'] = [18, 20, 10].map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(wb, wsProf, 'Por Profissional')

  // ── Download ──────────────────────────────────────────────────────
  const data = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `resumo-parcerias-${data}.xlsx`)
}
