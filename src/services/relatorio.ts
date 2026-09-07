import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmt } from '@/lib/utils'

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
