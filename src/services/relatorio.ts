import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { fmt } from '@/lib/utils'
import type { Repasse, TipoRepasse, ResumoParceria, ResumoProfissional } from '@/types'
import type { ParcelaRenegociada } from '@/services/parcelas'

const TIPO_LABEL: Record<TipoRepasse, string> = {
  camta: 'Repasse Camta',
  medico: 'Repasse Médico',
  psi1: 'Repasse Psi1',
  psi2: 'Repasse Psi2',
}

const COR_PRIMARIA  = [31, 56, 100]   // #1F3864
const COR_SECUNDARIA = [46, 117, 182] // #2E75B6
const RODAPE_MSG    = 'Documento de acesso restrito. Uso exclusivo interno. Não compartilhe este relatório.'

async function logoBase64(): Promise<string | null> {
  try {
    const res  = await fetch('/logo.jpeg')
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function cabecalho(doc: jsPDF, logo: string | null, titulo: string, subtitulo?: string) {
  const largura = doc.internal.pageSize.getWidth()

  // Faixa de topo
  doc.setFillColor(...COR_PRIMARIA as [number, number, number])
  doc.rect(0, 0, largura, 28, 'F')

  // Logo
  if (logo) {
    doc.addImage(logo, 'JPEG', 10, 4, 0, 20) // altura fixa 20mm, largura automática
  }

  // Título
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, largura / 2, 13, { align: 'center' })

  if (subtitulo) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitulo, largura / 2, 20, { align: 'center' })
  }

  doc.setTextColor(0, 0, 0)
  return 34 // y após cabeçalho
}

function rodape(doc: jsPDF, usuarioNome: string) {
  const largura = doc.internal.pageSize.getWidth()
  const altura  = doc.internal.pageSize.getHeight()
  const total   = (doc as any).internal.getNumberOfPages()

  for (let i = 1; i <= total; i++) {
    doc.setPage(i)

    doc.setFillColor(240, 240, 240)
    doc.rect(0, altura - 16, largura, 16, 'F')

    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'italic')
    doc.text(RODAPE_MSG, largura / 2, altura - 9, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} por ${usuarioNome}`,
      10,
      altura - 4
    )
    doc.text(`Página ${i} de ${total}`, largura - 10, altura - 4, { align: 'right' })
  }
}

// ─── 0. Resumo Financeiro ────────────────────────────────────────────────────

const PROF_LABEL: Record<string, string> = {
  camta: 'Camta', medico: 'Médico', psi1: 'Psi 1', psi2: 'Psi 2',
}

export async function gerarRelatorioResumo(
  parcerias: ResumoParceria[],
  profissionais: ResumoProfissional[],
  periodo: string,
  usuarioNome: string,
) {
  const logo = await logoBase64()
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = cabecalho(doc, logo, 'Resumo Financeiro', periodo || 'Período completo')

  // ── Tabela por parceria ──
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COR_PRIMARIA as [number, number, number])
  doc.text('Consolidado por Parceria', 14, y + 4)
  doc.setTextColor(0, 0, 0)

  const totalGeral = profissionais.reduce((s, p) => s + Number(p.total), 0)

  autoTable(doc, {
    startY: y + 8,
    head: [['Parceria', 'Descrição', 'Atend.', 'Valor Total', 'Camta', 'Médico', 'Psi 1', 'Psi 2']],
    body: parcerias.map(r => [
      `Parceria ${r.parceria}`,
      r.descricao,
      r.total_atendimentos,
      fmt.moeda(Number(r.valor_total)),
      Number(r.camta_total)  > 0 ? fmt.moeda(Number(r.camta_total))  : '—',
      Number(r.medico_total) > 0 ? fmt.moeda(Number(r.medico_total)) : '—',
      Number(r.psi1_total)   > 0 ? fmt.moeda(Number(r.psi1_total))   : '—',
      Number(r.psi2_total)   > 0 ? fmt.moeda(Number(r.psi2_total))   : '—',
    ]),
    foot: [[
      'TOTAL', '', parcerias.reduce((s, r) => s + r.total_atendimentos, 0),
      fmt.moeda(parcerias.reduce((s, r) => s + Number(r.valor_total), 0)),
      '', '', '', '',
    ]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: COR_PRIMARIA as [number, number, number], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: [31, 56, 100], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold' }, 3: { fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Tabela por profissional ──
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COR_PRIMARIA as [number, number, number])
  doc.text('Consolidado por Profissional', 14, y)
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: y + 4,
    head: [['Profissional', 'Total Repasse', '% do Total']],
    body: profissionais.map(p => [
      PROF_LABEL[p.profissional] ?? p.profissional,
      fmt.moeda(Number(p.total)),
      totalGeral > 0 ? `${((Number(p.total) / totalGeral) * 100).toFixed(1)}%` : '0%',
    ]),
    foot: [['Total Geral', fmt.moeda(totalGeral), '100%']],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: COR_SECUNDARIA as [number, number, number], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: [31, 56, 100], fontStyle: 'bold' },
    columnStyles: { 1: { fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })

  rodape(doc, usuarioNome)

  const dataHoje = new Date().toISOString().split('T')[0]
  doc.save(`resumo-financeiro_${dataHoje}.pdf`)
}

// ─── 1. Relatório de Lançamentos ─────────────────────────────────────────────

export interface FiltrosLancamentos {
  dataInicio?: string
  dataFim?: string
  parceria?: string
}

export async function gerarRelatorioLancamentos(
  lancamentos: any[],
  filtros: FiltrosLancamentos,
  usuarioNome: string
) {
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logo = await logoBase64()

  const periodo = filtros.dataInicio && filtros.dataFim
    ? `Período: ${fmt.data(filtros.dataInicio)} a ${fmt.data(filtros.dataFim)}`
    : filtros.dataInicio
    ? `A partir de ${fmt.data(filtros.dataInicio)}`
    : filtros.dataFim
    ? `Até ${fmt.data(filtros.dataFim)}`
    : 'Todos os períodos'

  const subtitulo = `${periodo}${filtros.parceria ? ` · Parceria ${filtros.parceria}` : ''}`
  const startY    = cabecalho(doc, logo, 'Relatório de Lançamentos', subtitulo)

  const totalGeral   = lancamentos.reduce((s, l) => s + Number(l.valor_total), 0)
  const totalCamta   = lancamentos.reduce((s, l) => s + Number(l.camta_valor  ?? 0), 0)
  const totalMedico  = lancamentos.reduce((s, l) => s + Number(l.medico_valor ?? 0), 0)
  const totalPsi1    = lancamentos.reduce((s, l) => s + Number(l.psi1_valor   ?? 0), 0)
  const totalPsi2    = lancamentos.reduce((s, l) => s + Number(l.psi2_valor   ?? 0), 0)

  autoTable(doc, {
    startY,
    head: [['Data', 'Paciente', 'Responsável', 'Parceria', 'Pagamento', 'Meio', 'Valor Total', 'Camta', 'Médico', 'Psi1', 'Psi2', 'Status']],
    body: lancamentos.map(l => [
      fmt.data(l.data_atendimento),
      l.paciente,
      l.nome_responsavel ?? '—',
      `Parceria ${l.parceria_id}`,
      l.forma_pagamento === 'avista' ? 'À Vista' : `${l.num_parcelas}x`,
      (l.meio_pagamento ?? []).map((m: string) => ({
        cartao_credito: 'Cartão',
        pix: 'Pix',
        dinheiro: 'Dinheiro',
      }[m] ?? m)).join(', ') || '—',
      fmt.moeda(l.valor_total),
      l.camta_valor  > 0 ? fmt.moeda(l.camta_valor)  : '—',
      l.medico_valor > 0 ? fmt.moeda(l.medico_valor) : '—',
      fmt.moeda(l.psi1_valor),
      fmt.moeda(l.psi2_valor),
      l.status,
    ]),
    foot: [[
      '', '', '', '', '', 'TOTAL',
      fmt.moeda(totalGeral),
      totalCamta  > 0 ? fmt.moeda(totalCamta)  : '—',
      totalMedico > 0 ? fmt.moeda(totalMedico) : '—',
      fmt.moeda(totalPsi1),
      fmt.moeda(totalPsi2),
      `${lancamentos.length} lançamentos`,
    ]],
    headStyles:   { fillColor: COR_PRIMARIA   as [number,number,number], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles:   { fillColor: COR_SECUNDARIA as [number,number,number], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { bottom: 20 },
  })

  rodape(doc, usuarioNome)
  doc.save(`lancamentos_${new Date().toISOString().slice(0,10)}.pdf`)
}

// ─── 2. Relatório de Parcelas (inadimplência) ────────────────────────────────

export async function gerarRelatorioInadimplencia(
  parcelas: any[],
  usuarioNome: string
) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logo = await logoBase64()
  const startY = cabecalho(doc, logo, 'Relatório de Inadimplência', 'Parcelas vencidas e não pagas')

  const totalEmAberto = parcelas.reduce((s, p) => s + Number(p.valor_parcela), 0)

  autoTable(doc, {
    startY,
    head: [['Vencimento', 'Paciente', 'Parceria', 'Parcela', 'Valor', 'Status', 'Dias em Atraso']],
    body: parcelas.map(p => {
      const venc     = new Date(p.data_vencimento)
      const hoje     = new Date()
      const diasAtraso = Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000)
      return [
        fmt.data(p.data_vencimento),
        p.lancamentos?.paciente ?? '—',
        `Parceria ${p.lancamentos?.parceria_id ?? '—'}`,
        `${p.parcela_num}/${p.parcela_total}`,
        fmt.moeda(p.valor_parcela),
        p.status,
        diasAtraso > 0 ? `${diasAtraso}d` : '—',
      ]
    }),
    foot: [['', '', '', 'TOTAL EM ABERTO', fmt.moeda(totalEmAberto), `${parcelas.length} parcelas`, '']],
    headStyles:   { fillColor: COR_PRIMARIA   as [number,number,number], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    footStyles:   { fillColor: [180, 0, 0], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 8.5 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { bottom: 20 },
  })

  rodape(doc, usuarioNome)
  doc.save(`inadimplencia_${new Date().toISOString().slice(0,10)}.pdf`)
}

// ─── 3. Relatório de Rateio Mensal ───────────────────────────────────────────

export async function gerarRelatorioRateio(
  lancamentos: any[],
  mes: string,
  usuarioNome: string
) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logo   = await logoBase64()
  const startY = cabecalho(doc, logo, 'Relatório de Rateio Mensal', `Competência: ${mes}`)

  // Agrupar por parceria
  const grupos: Record<string, any[]> = {}
  for (const l of lancamentos) {
    const k = l.parceria_id as string
    grupos[k] = grupos[k] ?? []
    grupos[k].push(l)
  }

  const rows = Object.entries(grupos).map(([parc, ls]) => {
    const tot    = ls.reduce((s, l) => s + Number(l.valor_total),  0)
    const camta  = ls.reduce((s, l) => s + Number(l.camta_valor  ?? 0), 0)
    const medico = ls.reduce((s, l) => s + Number(l.medico_valor ?? 0), 0)
    const psi1   = ls.reduce((s, l) => s + Number(l.psi1_valor   ?? 0), 0)
    const psi2   = ls.reduce((s, l) => s + Number(l.psi2_valor   ?? 0), 0)
    return [`Parceria ${parc}`, ls.length, fmt.moeda(tot), fmt.moeda(camta), fmt.moeda(medico), fmt.moeda(psi1), fmt.moeda(psi2)]
  })

  const totGeral  = lancamentos.reduce((s, l) => s + Number(l.valor_total),  0)
  const totCamta  = lancamentos.reduce((s, l) => s + Number(l.camta_valor  ?? 0), 0)
  const totMedico = lancamentos.reduce((s, l) => s + Number(l.medico_valor ?? 0), 0)
  const totPsi1   = lancamentos.reduce((s, l) => s + Number(l.psi1_valor   ?? 0), 0)
  const totPsi2   = lancamentos.reduce((s, l) => s + Number(l.psi2_valor   ?? 0), 0)

  autoTable(doc, {
    startY,
    head: [['Parceria', 'Atendimentos', 'Valor Total', 'Camta', 'Médico', 'Psi1', 'Psi2']],
    body: rows,
    foot: [['TOTAL', lancamentos.length, fmt.moeda(totGeral), fmt.moeda(totCamta), fmt.moeda(totMedico), fmt.moeda(totPsi1), fmt.moeda(totPsi2)]],
    headStyles:   { fillColor: COR_PRIMARIA   as [number,number,number], textColor: 255, fontSize: 10, fontStyle: 'bold' },
    footStyles:   { fillColor: COR_SECUNDARIA as [number,number,number], textColor: 255, fontSize: 10, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { bottom: 20 },
  })

  // Detalhamento por lançamento
  const detalheY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COR_PRIMARIA as [number,number,number])
  doc.text('Detalhamento de Lançamentos', 14, detalheY)
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: detalheY + 4,
    head: [['Data', 'Paciente', 'Parceria', 'Valor Total', 'Camta', 'Médico', 'Psi1', 'Psi2']],
    body: lancamentos.map(l => [
      fmt.data(l.data_atendimento),
      l.paciente,
      `Parceria ${l.parceria_id}`,
      fmt.moeda(l.valor_total),
      l.camta_valor  > 0 ? fmt.moeda(l.camta_valor)  : '—',
      l.medico_valor > 0 ? fmt.moeda(l.medico_valor) : '—',
      fmt.moeda(l.psi1_valor),
      fmt.moeda(l.psi2_valor),
    ]),
    headStyles:   { fillColor: [80, 80, 80], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { bottom: 20 },
  })

  rodape(doc, usuarioNome)
  doc.save(`rateio_${mes.replace(/\s/g, '_')}.pdf`)
}

// ─── 4. Relatório de Repasse (PDF) ───────────────────────────────────────────

export async function gerarRelatorioRepasse(
  repasses: Repasse[],
  tipo: TipoRepasse,
  usuarioNome: string,
  periodo?: { inicio?: string; fim?: string }
) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logo   = await logoBase64()

  const subtitulo = periodo?.inicio || periodo?.fim
    ? `Período: ${periodo.inicio ? fmt.data(periodo.inicio) : '—'} a ${periodo.fim ? fmt.data(periodo.fim) : '—'}`
    : 'Todos os períodos'

  const startY = cabecalho(doc, logo, TIPO_LABEL[tipo], subtitulo)

  const conciliados    = repasses.filter(r => r.status === 'conciliado')
  const naoConciliados = repasses.filter(r => r.status === 'nao_conciliado')
  const totalRepasse   = repasses.reduce((s, r) => s + Number(r.valor_repasse), 0)
  const totalConciliado = conciliados.reduce((s, r) => s + Number(r.valor_repasse), 0)
  const totalPendente   = naoConciliados.reduce((s, r) => s + Number(r.valor_repasse), 0)

  // Resumo
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(`Total de repasses: ${repasses.length}  |  Conciliados: ${conciliados.length}  |  Pendentes: ${naoConciliados.length}`, 14, startY)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total: ${fmt.moeda(totalRepasse)}  |  Conciliado: ${fmt.moeda(totalConciliado)}  |  Pendente: ${fmt.moeda(totalPendente)}`, 14, startY + 6)
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: startY + 12,
    head: [['Dt. Atendimento', 'Paciente', 'Parceria', 'Dt. Pagamento', 'Valor Original', 'Valor Repasse', 'Dt. Repasse', 'Situação']],
    body: repasses.map(r => [
      r.lancamentos?.data_atendimento ? fmt.data(r.lancamentos.data_atendimento) : '—',
      r.lancamentos?.paciente ?? '—',
      r.lancamentos?.parceria_id ? `Parceria ${r.lancamentos.parceria_id}` : '—',
      r.lancamentos?.data_pagamento ? fmt.data(r.lancamentos.data_pagamento) : '—',
      fmt.moeda(Number(r.valor_original)),
      fmt.moeda(Number(r.valor_repasse)),
      r.data_repasse ? fmt.data(r.data_repasse) : '—',
      r.status === 'conciliado' ? 'Conciliado' : 'Não Conciliado',
    ]),
    foot: [['', '', '', 'TOTAL', fmt.moeda(totalRepasse), fmt.moeda(totalRepasse), '', `${repasses.length} repasses`]],
    headStyles:   { fillColor: COR_PRIMARIA as [number,number,number], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles:   { fillColor: COR_SECUNDARIA as [number,number,number], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = data.cell.raw as string
        data.cell.styles.textColor = val === 'Conciliado' ? [0, 120, 0] : [180, 0, 0]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    margin: { bottom: 20 },
  })

  rodape(doc, usuarioNome)
  doc.save(`repasse_${tipo}_${new Date().toISOString().slice(0,10)}.pdf`)
}

// ─── 5. Relatório Mensal de Repasses (PDF) ───────────────────────────────────

const TIPO_PROFISSIONAL: Record<string, string> = {
  camta: 'Camta',
  medico: 'Médico',
  psi1: 'Psi 1',
  psi2: 'Psi 2',
}

export async function gerarRelatorioMensalRepasses(
  repasses: any[],
  mes: string,
  usuarioNome: string
) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logo   = await logoBase64()
  let   startY = cabecalho(doc, logo, 'Repasses Mensais por Profissional', `Competência: ${mes}`)

  // Agrupar por tipo (profissional)
  const tipos = ['camta', 'medico', 'psi1', 'psi2']
  const grupos: Record<string, any[]> = {}
  for (const r of repasses) {
    grupos[r.tipo] = grupos[r.tipo] ?? []
    grupos[r.tipo].push(r)
  }

  // Resumo consolidado
  const resumoRows = tipos
    .filter(t => grupos[t]?.length)
    .map(t => {
      const lista = grupos[t]
      const totalOrig    = lista.reduce((s: number, r: any) => s + Number(r.valor_original), 0)
      const totalRepasse = lista.reduce((s: number, r: any) => s + Number(r.valor_repasse),  0)
      const conciliados  = lista.filter((r: any) => r.status === 'conciliado').length
      return [
        TIPO_PROFISSIONAL[t] ?? t,
        lista.length,
        conciliados,
        lista.length - conciliados,
        fmt.moeda(totalOrig),
        fmt.moeda(totalRepasse),
      ]
    })

  const totOriginal = repasses.reduce((s, r) => s + Number(r.valor_original), 0)
  const totRepasse  = repasses.reduce((s, r) => s + Number(r.valor_repasse),  0)
  const totConc     = repasses.filter(r => r.status === 'conciliado').length

  autoTable(doc, {
    startY,
    head: [['Profissional', 'Repasses', 'Conciliados', 'Pendentes', 'Valor Original', 'Valor Repasse']],
    body: resumoRows,
    foot: [['TOTAL', repasses.length, totConc, repasses.length - totConc, fmt.moeda(totOriginal), fmt.moeda(totRepasse)]],
    headStyles: { fillColor: COR_PRIMARIA   as [number,number,number], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    footStyles: { fillColor: COR_SECUNDARIA as [number,number,number], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { bottom: 20 },
  })

  // Detalhamento por profissional
  for (const tipo of tipos) {
    const lista = grupos[tipo]
    if (!lista?.length) continue

    const detalheY = (doc as any).lastAutoTable.finalY + 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COR_PRIMARIA as [number,number,number])
    doc.text(TIPO_PROFISSIONAL[tipo] ?? tipo, 14, detalheY)
    doc.setTextColor(0, 0, 0)

    autoTable(doc, {
      startY: detalheY + 4,
      head: [['Dt. Atendimento', 'Paciente', 'Parceria', 'Valor Original', 'Valor Repasse', 'Situação']],
      body: lista.map((r: any) => [
        r.lancamentos?.data_atendimento ? fmt.data(r.lancamentos.data_atendimento) : '—',
        r.lancamentos?.paciente ?? '—',
        r.lancamentos?.parceria_id ? `Parceria ${r.lancamentos.parceria_id}` : '—',
        fmt.moeda(Number(r.valor_original)),
        fmt.moeda(Number(r.valor_repasse)),
        r.status === 'conciliado' ? 'Conciliado' : 'Pendente',
      ]),
      foot: [['', '', 'SUBTOTAL',
        fmt.moeda(lista.reduce((s: number, r: any) => s + Number(r.valor_original), 0)),
        fmt.moeda(lista.reduce((s: number, r: any) => s + Number(r.valor_repasse),  0)),
        `${lista.length} repasses`,
      ]],
      headStyles:   { fillColor: [70, 90, 120], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      footStyles:   { fillColor: [100, 120, 150], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles:   { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = data.cell.raw as string
          data.cell.styles.textColor = val === 'Conciliado' ? [0, 120, 0] : [180, 80, 0]
          data.cell.styles.fontStyle = 'bold'
        }
      },
      margin: { bottom: 20 },
    })
  }

  rodape(doc, usuarioNome)
  doc.save(`repasses_mensais_${mes.replace(/\s/g, '_')}.pdf`)
}

// ─── 6. Relatório Mensal de Repasses (Excel) ─────────────────────────────────

export function exportarRepassesMensalExcel(repasses: any[], mes: string) {
  const wb = XLSX.utils.book_new()
  const tipos = ['camta', 'medico', 'psi1', 'psi2']
  const grupos: Record<string, any[]> = {}
  for (const r of repasses) {
    grupos[r.tipo] = grupos[r.tipo] ?? []
    grupos[r.tipo].push(r)
  }

  // Aba de resumo
  const resumoLinhas = tipos.filter(t => grupos[t]?.length).map(t => {
    const lista = grupos[t]
    return {
      'Profissional':    TIPO_PROFISSIONAL[t] ?? t,
      'Qtd. Repasses':  lista.length,
      'Conciliados':    lista.filter((r: any) => r.status === 'conciliado').length,
      'Pendentes':      lista.filter((r: any) => r.status === 'nao_conciliado').length,
      'Valor Original': repasses.reduce((s: number, r: any) => t === r.tipo ? s + Number(r.valor_original) : s, 0),
      'Valor Repasse':  repasses.reduce((s: number, r: any) => t === r.tipo ? s + Number(r.valor_repasse)  : s, 0),
    }
  })
  const wsResumo = XLSX.utils.json_to_sheet(resumoLinhas)
  wsResumo['!cols'] = [16, 14, 12, 12, 18, 16].map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(wb, wsResumo, `Resumo ${mes}`)

  // Uma aba por profissional
  for (const tipo of tipos) {
    const lista = grupos[tipo]
    if (!lista?.length) continue
    const linhas = lista.map((r: any) => ({
      'Dt. Atendimento': r.lancamentos?.data_atendimento ? fmt.data(r.lancamentos.data_atendimento) : '—',
      'Paciente':        r.lancamentos?.paciente ?? '—',
      'Parceria':        r.lancamentos?.parceria_id ? `Parceria ${r.lancamentos.parceria_id}` : '—',
      'Valor Original':  Number(r.valor_original),
      'Valor Repasse':   Number(r.valor_repasse),
      'Situação':        r.status === 'conciliado' ? 'Conciliado' : 'Pendente',
    }))
    const ws = XLSX.utils.json_to_sheet(linhas)
    ws['!cols'] = [14, 28, 12, 16, 16, 12].map(wch => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, TIPO_PROFISSIONAL[tipo] ?? tipo)
  }

  XLSX.writeFile(wb, `repasses_mensais_${mes.replace(/\s/g, '_')}.xlsx`)
}

// ─── 7. Relatório de Renegociações ───────────────────────────────────────────

export async function gerarRelatorioRenegociacoes(
  renegociadas: ParcelaRenegociada[],
  usuarioNome: string
) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logo   = await logoBase64()
  const startY = cabecalho(doc, logo, 'Relatório de Renegociações', `${renegociadas.length} parcela(s) renegociada(s)`)

  const totalValor = renegociadas.reduce((s, p) => s + p.valor_parcela, 0)

  autoTable(doc, {
    startY,
    head: [['Paciente', 'Parceria', 'Parcela', 'Novo Vencimento', 'Valor', 'Data Renegociação', 'Motivo']],
    body: renegociadas.map(p => [
      p.paciente,
      `Parceria ${p.parceria_id}`,
      `${p.parcela_num}/${p.parcela_total}`,
      fmt.data(p.data_vencimento),
      fmt.moeda(p.valor_parcela),
      p.data_renegociacao ? new Date(p.data_renegociacao).toLocaleDateString('pt-BR') : '—',
      p.observacoes ?? '—',
    ]),
    foot: [['', '', '', 'TOTAL', fmt.moeda(totalValor), `${renegociadas.length} parcelas`, '']],
    headStyles:   { fillColor: [180, 120, 0] as [number,number,number], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles:   { fillColor: COR_SECUNDARIA as [number,number,number], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    columnStyles: { 6: { cellWidth: 55 } },
    margin: { bottom: 20 },
  })

  rodape(doc, usuarioNome)
  doc.save(`renegociacoes_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ─── 7. Comprovante de Repasse (PDF individual por lançamento) ───────────────

const TIPO_LABEL_PROF: Record<string, string> = {
  camta: 'Camta',
  medico: 'Médico',
  psi1: 'Psi 1',
  psi2: 'Psi 2',
}

export interface LinhaExtratoParaComprovante {
  id: string
  data_atendimento: string
  paciente: string
  parceria_id: string
  forma_pagamento: string
  valor_total: number
  valor_profissional: number
  status: string
}

export async function gerarComprovante(
  linha: LinhaExtratoParaComprovante,
  profissional: string,
  usuarioNome: string
) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logo   = await logoBase64()
  const largura = doc.internal.pageSize.getWidth()

  const profLabel = TIPO_LABEL_PROF[profissional] ?? profissional
  const startY  = cabecalho(doc, logo, 'Comprovante de Repasse', profLabel)

  // Caixa de informações do atendimento
  const boxX = 14, boxW = largura - 28, boxY = startY + 4
  doc.setFillColor(245, 247, 252)
  doc.setDrawColor(200, 210, 230)
  doc.roundedRect(boxX, boxY, boxW, 52, 3, 3, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COR_PRIMARIA as [number, number, number])
  doc.text('DADOS DO ATENDIMENTO', boxX + 6, boxY + 8)
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'normal')

  const campo = (label: string, valor: string, x: number, y: number) => {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(label, x, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(valor, x, y + 5)
  }

  const col1 = boxX + 6, col2 = col1 + 70, col3 = col2 + 60
  campo('Paciente',        linha.paciente,                                    col1, boxY + 18)
  campo('Data Atendimento', fmt.data(linha.data_atendimento),                 col2, boxY + 18)
  campo('Parceria',        `Parceria ${linha.parceria_id}`,                   col3, boxY + 18)
  campo('Forma Pagamento', linha.forma_pagamento === 'avista' ? 'À Vista' : 'Parcelado', col1, boxY + 34)
  campo('Status',          linha.status.charAt(0).toUpperCase() + linha.status.slice(1), col2, boxY + 34)
  campo('Profissional',    profLabel,                                         col3, boxY + 34)

  // Destaque dos valores
  const valBoxY = boxY + 60
  const metade  = (boxW - 8) / 2

  // Valor total
  doc.setFillColor(...COR_PRIMARIA as [number, number, number])
  doc.roundedRect(boxX, valBoxY, metade, 28, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Valor Total do Atendimento', boxX + metade / 2, valBoxY + 9, { align: 'center' })
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt.moeda(linha.valor_total), boxX + metade / 2, valBoxY + 21, { align: 'center' })

  // Valor do repasse
  doc.setFillColor(...COR_SECUNDARIA as [number, number, number])
  doc.roundedRect(boxX + metade + 8, valBoxY, metade, 28, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Valor do Repasse — ${profLabel}`, boxX + metade + 8 + metade / 2, valBoxY + 9, { align: 'center' })
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt.moeda(linha.valor_profissional), boxX + metade + 8 + metade / 2, valBoxY + 21, { align: 'center' })

  doc.setTextColor(0, 0, 0)

  // Número de referência
  const refY = valBoxY + 36
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(150, 150, 150)
  doc.text(`Referência: ${linha.id}`, boxX, refY)

  rodape(doc, usuarioNome)
  const pacienteSlug = linha.paciente.replace(/\s+/g, '_').toLowerCase().slice(0, 20)
  doc.save(`comprovante_${profissional}_${pacienteSlug}_${linha.data_atendimento}.pdf`)
}

// ─── 8. Relatório de Repasse individual (PDF) ───────────────────────────────

export function exportarRepasseExcel(repasses: Repasse[], tipo: TipoRepasse) {
  const wb = XLSX.utils.book_new()

  const linhas = repasses.map(r => ({
    'Dt. Atendimento':  r.lancamentos?.data_atendimento ? fmt.data(r.lancamentos.data_atendimento) : '—',
    'Paciente':         r.lancamentos?.paciente ?? '—',
    'Parceria':         r.lancamentos?.parceria_id ? `Parceria ${r.lancamentos.parceria_id}` : '—',
    'Dt. Pagamento':    r.lancamentos?.data_pagamento ? fmt.data(r.lancamentos.data_pagamento) : '—',
    'Valor Original':   Number(r.valor_original),
    'Valor Repasse':    Number(r.valor_repasse),
    'Dt. Repasse':      r.data_repasse ? fmt.data(r.data_repasse) : '—',
    'Situação':         r.status === 'conciliado' ? 'Conciliado' : 'Não Conciliado',
  }))

  const totalRow = {
    'Dt. Atendimento': 'TOTAL',
    'Paciente': '',
    'Parceria': '',
    'Dt. Pagamento': '',
    'Valor Original': repasses.reduce((s, r) => s + Number(r.valor_original), 0),
    'Valor Repasse':  repasses.reduce((s, r) => s + Number(r.valor_repasse), 0),
    'Dt. Repasse': '',
    'Situação': `${repasses.length} repasses`,
  }

  const ws = XLSX.utils.json_to_sheet([...linhas, totalRow])
  ws['!cols'] = [16, 28, 12, 14, 16, 16, 14, 16].map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(wb, ws, TIPO_LABEL[tipo])

  XLSX.writeFile(wb, `repasse_${tipo}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ─── 9. Relatório de Parcelas por Período ────────────────────────────────────

export interface FiltrosParcelas {
  dataInicio?: string
  dataFim?: string
  status?: string
  parceria?: string
}

export async function gerarRelatorioParcelas(
  parcelas: any[],
  filtros: FiltrosParcelas,
  usuarioNome: string
) {
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logo = await logoBase64()

  const partes: string[] = []
  if (filtros.dataInicio || filtros.dataFim) {
    partes.push(`Vencimento: ${filtros.dataInicio ? fmt.data(filtros.dataInicio) : '—'} a ${filtros.dataFim ? fmt.data(filtros.dataFim) : '—'}`)
  }
  if (filtros.status) {
    const statusLabel: Record<string, string> = {
      pendente: 'Pendente', pago: 'Pago', vencido: 'Vencido',
      renegociada: 'Renegociada', cancelado: 'Cancelado',
    }
    partes.push(`Status: ${statusLabel[filtros.status] ?? filtros.status}`)
  }
  if (filtros.parceria) partes.push(`Parceria: ${filtros.parceria}`)
  const subtitulo = partes.length ? partes.join('  |  ') : 'Todas as parcelas'

  const y = cabecalho(doc, logo, 'Relatório de Parcelas', subtitulo)

  const totalParcelas = parcelas.length
  const totalValor    = parcelas.reduce((s, p) => s + Number(p.valor_parcela), 0)
  const totalPago     = parcelas.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_parcela), 0)
  const totalPendente = parcelas.filter(p => ['pendente','vencido'].includes(p.status)).reduce((s, p) => s + Number(p.valor_parcela), 0)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(
    `Total: ${totalParcelas} parcela(s)  |  Valor total: ${fmt.moeda(totalValor)}  |  Recebido: ${fmt.moeda(totalPago)}  |  Em aberto: ${fmt.moeda(totalPendente)}`,
    14, y
  )
  doc.setTextColor(0, 0, 0)

  const STATUS_LABEL: Record<string, string> = {
    pendente: 'Pendente', pago: 'Pago', vencido: 'Vencido',
    renegociada: 'Renegociada', cancelado: 'Cancelado',
  }
  const STATUS_COLOR: Record<string, [number, number, number]> = {
    pago:        [22, 101, 52],
    vencido:     [153, 27, 27],
    pendente:    [31, 56, 100],
    renegociada: [120, 53, 15],
    cancelado:   [75, 85, 99],
  }

  autoTable(doc, {
    startY: y + 6,
    head: [['Paciente', 'Parceria', 'Parcela', 'Vencimento', 'Dt. Pagamento', 'Valor', 'Forma Pgto', 'Status']],
    body: parcelas.map(p => {
      const lanc = p.lancamentos as { paciente: string; parceria_id: string } | null
      const [ano, mes, dia] = (p.data_vencimento ?? '').split('-')
      return [
        lanc?.paciente ?? '—',
        lanc?.parceria_id ? `Parceria ${lanc.parceria_id}` : '—',
        `${p.parcela_num}/${p.parcela_total}`,
        dia && mes && ano ? `${dia}/${mes}/${ano}` : '—',
        p.data_pagamento ? fmt.data(p.data_pagamento) : '—',
        fmt.moeda(Number(p.valor_parcela)),
        p.forma_pagamento === 'avista' ? 'À vista' : p.forma_pagamento === 'parcelado' ? 'Parcelado' : '—',
        STATUS_LABEL[p.status] ?? p.status,
      ]
    }),
    foot: [['', '', '', '', 'TOTAL', fmt.moeda(totalValor), '', `${totalParcelas} parcelas`]],
    headStyles: { fillColor: COR_PRIMARIA as [number,number,number], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles: { fillColor: COR_SECUNDARIA as [number,number,number], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 7) {
        const status = parcelas[data.row.index]?.status as string
        const cor = STATUS_COLOR[status]
        if (cor) {
          data.cell.styles.textColor = cor
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    margin: { bottom: 20 },
  })

  rodape(doc, usuarioNome)
  doc.save(`parcelas_${new Date().toISOString().slice(0, 10)}.pdf`)
}
