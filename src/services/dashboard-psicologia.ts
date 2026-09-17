import { supabase } from '@/lib/supabase'
import { StatusSessao } from '@/services/sessoes'

export interface KpisPsicologia {
  sessoesRealizadasMes: number
  receitaMes: number
  taxaComparecimento: number | null
  pacientesAtendidosMes: number
}

export interface SessoesPorMes {
  mes: string       // 'YYYY-MM'
  label: string     // 'Set/26'
  realizada: number
  agendada: number
  cancelada: number
  faltou: number
  total: number
}

export interface SessoesPorStatus {
  status: StatusSessao
  label: string
  count: number
  cor: string
}

export interface SessoesPorModalidade {
  modalidade: string
  label: string
  count: number
}

export interface ProximaSessao {
  id: string
  data_sessao: string
  hora_inicio: string
  modalidade: string
  paciente_nome: string
}

export interface DashboardPsicologiaData {
  kpis: KpisPsicologia
  sessoesPorMes: SessoesPorMes[]
  sessoesPorStatus: SessoesPorStatus[]
  sessoesPorModalidade: SessoesPorModalidade[]
  proximasSessoes: ProximaSessao[]
}

const STATUS_META: Record<StatusSessao, { label: string; cor: string }> = {
  realizada: { label: 'Realizada',  cor: '#16a34a' },
  agendada:  { label: 'Agendada',   cor: '#2563eb' },
  cancelada: { label: 'Cancelada',  cor: '#6b7280' },
  faltou:    { label: 'Faltou',     cor: '#dc2626' },
}

function mesLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`
}

export async function getDashboardPsicologia(): Promise<DashboardPsicologiaData> {
  const hoje = new Date()
  const anoMes = hoje.toISOString().slice(0, 7)
  const iniciMes = `${anoMes}-01`
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)

  // Últimos 6 meses para o gráfico
  const meses6: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    meses6.push(d.toISOString().slice(0, 7))
  }
  const inicio6m = `${meses6[0]}-01`

  // Próximas sessões (7 dias)
  const fimProximas = new Date(hoje)
  fimProximas.setDate(hoje.getDate() + 7)

  const [{ data: sessoesHistorico }, { data: sessoesMes }, { data: proximas }] = await Promise.all([
    supabase
      .schema('psicologia')
      .from('sessoes')
      .select('data_sessao, status, valor_sessao, modalidade, paciente_id')
      .gte('data_sessao', inicio6m)
      .lte('data_sessao', fimMes),
    supabase
      .schema('psicologia')
      .from('sessoes')
      .select('status, valor_sessao, paciente_id')
      .gte('data_sessao', iniciMes)
      .lte('data_sessao', fimMes),
    supabase
      .schema('psicologia')
      .from('sessoes')
      .select('id, data_sessao, hora_inicio, modalidade, pacientes(nome)')
      .eq('status', 'agendada')
      .gte('data_sessao', hoje.toISOString().slice(0, 10))
      .lte('data_sessao', fimProximas.toISOString().slice(0, 10))
      .order('data_sessao')
      .order('hora_inicio')
      .limit(10),
  ])

  const historicoRows = sessoesHistorico ?? []
  const mesRows = sessoesMes ?? []
  const proximasRows = proximas ?? []

  // KPIs do mês
  const realizadas = mesRows.filter(r => r.status === 'realizada')
  const faltou = mesRows.filter(r => r.status === 'faltou')
  const sessoesRealizadasMes = realizadas.length
  const receitaMes = realizadas.reduce((s, r) => s + (r.valor_sessao ?? 0), 0)
  const denominador = sessoesRealizadasMes + faltou.length
  const taxaComparecimento = denominador > 0 ? sessoesRealizadasMes / denominador : null
  const pacientesAtendidosMes = new Set(realizadas.map(r => r.paciente_id)).size

  // Sessões por mês (últimos 6)
  const porMesMap: Record<string, Record<StatusSessao, number>> = {}
  meses6.forEach(m => {
    porMesMap[m] = { realizada: 0, agendada: 0, cancelada: 0, faltou: 0 }
  })
  historicoRows.forEach(r => {
    const m = r.data_sessao.slice(0, 7)
    if (porMesMap[m]) porMesMap[m][r.status as StatusSessao]++
  })
  const sessoesPorMes: SessoesPorMes[] = meses6.map(m => ({
    mes: m,
    label: mesLabel(m),
    realizada: porMesMap[m].realizada,
    agendada: porMesMap[m].agendada,
    cancelada: porMesMap[m].cancelada,
    faltou: porMesMap[m].faltou,
    total: Object.values(porMesMap[m]).reduce((a, b) => a + b, 0),
  }))

  // Sessões por status (mês atual)
  const statusCount: Record<StatusSessao, number> = { realizada: 0, agendada: 0, cancelada: 0, faltou: 0 }
  mesRows.forEach(r => { statusCount[r.status as StatusSessao]++ })
  const sessoesPorStatus: SessoesPorStatus[] = (Object.keys(statusCount) as StatusSessao[])
    .filter(s => statusCount[s] > 0)
    .map(s => ({ status: s, label: STATUS_META[s].label, count: statusCount[s], cor: STATUS_META[s].cor }))
    .sort((a, b) => b.count - a.count)

  // Sessões por modalidade (mês atual + histórico 6m)
  const modCount: Record<string, number> = { presencial: 0, online: 0 }
  historicoRows.forEach(r => { modCount[r.modalidade] = (modCount[r.modalidade] ?? 0) + 1 })
  const sessoesPorModalidade: SessoesPorModalidade[] = [
    { modalidade: 'presencial', label: 'Presencial', count: modCount['presencial'] ?? 0 },
    { modalidade: 'online',     label: 'Online',     count: modCount['online']     ?? 0 },
  ]

  // Próximas sessões
  const proximasSessoes: ProximaSessao[] = proximasRows.map((r: any) => ({
    id: r.id,
    data_sessao: r.data_sessao,
    hora_inicio: r.hora_inicio,
    modalidade: r.modalidade,
    paciente_nome: r.pacientes?.nome ?? '—',
  }))

  return {
    kpis: { sessoesRealizadasMes, receitaMes, taxaComparecimento, pacientesAtendidosMes },
    sessoesPorMes,
    sessoesPorStatus,
    sessoesPorModalidade,
    proximasSessoes,
  }
}
