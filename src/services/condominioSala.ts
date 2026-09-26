import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────

export type ModalidadeContrato  = 'permanente' | 'hora'
export type CategoriaDepesa     = 'utilidade' | 'servico' | 'imposto'
export type CriterioRateio      = 'igualitario' | 'por_peso'
export type StatusDemonstrativo = 'aberto' | 'fechado'
export type StatusItem          = 'pendente' | 'pago' | 'isento'

export interface ContratoSala {
  id: string
  sala_id: string
  profissional_id: string
  modalidade: ModalidadeContrato
  valor_mensal: number | null
  valor_hora: number | null
  dia_vencimento: number | null
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  observacoes: string | null
  created_at: string
  updated_at: string
  sala?: { nome: string; cor_hex: string }
  profissional?: { nome: string }
}

export interface NovoContrato {
  sala_id: string
  profissional_id: string
  modalidade: ModalidadeContrato
  valor_mensal?: number
  valor_hora?: number
  dia_vencimento?: number
  data_inicio: string
  data_fim?: string
  observacoes?: string
}

export interface PesoRateioSala {
  sala_id: string
  fator: number
}

export interface DespesaCondominio {
  id: string
  competencia: string
  descricao: string
  categoria: CategoriaDepesa
  valor_total: number
  criterio_rateio: CriterioRateio
  observacoes: string | null
  created_at: string
}

export interface NovaDespesa {
  competencia: string
  descricao: string
  categoria: CategoriaDepesa
  valor_total: number
  criterio_rateio: CriterioRateio
  observacoes?: string
}

export interface DemonstrativoCondominio {
  id: string
  competencia: string
  status: StatusDemonstrativo
  fechado_em: string | null
  created_at: string
}

export interface DemonstrativoItem {
  id: string
  demonstrativo_id: string
  profissional_id: string
  sala_id: string | null
  contrato_id: string | null
  valor_mensalidade: number
  valor_rateio: number
  status: StatusItem
  lancamento_id: string | null
  profissional?: { nome: string }
  sala?: { nome: string; cor_hex: string }
  rateio?: { id: string; despesa_id: string; percentual: number; valor: number }[]
}

// Resultado do cálculo em memória (antes de fechar)
export interface CalcItemRateio {
  despesaId: string
  descricao: string
  categoria: CategoriaDepesa
  valor: number
  percentual: number
}

export interface CalcItem {
  contratoId: string
  profissionalId: string
  profissionalNome: string
  salaId: string
  salaNome: string
  salaCorHex: string
  fator: number
  valorMensalidade: number
  despesasRateadas: CalcItemRateio[]
  totalRateio: number
  total: number
}

// ── Contratos ─────────────────────────────────────────────────

export async function listarContratos(apenasAtivos = false): Promise<ContratoSala[]> {
  let q = supabase
    .schema('psicologia')
    .from('contratos_sala')
    .select('*, salas(nome, cor_hex)')
    .order('created_at', { ascending: false })

  if (apenasAtivos) q = q.eq('ativo', true)

  const { data: contratos, error } = await q
  if (error) throw error

  const rows = (contratos ?? []) as (ContratoSala & { salas?: { nome: string; cor_hex: string } })[]

  // busca profissionais separado (cross-schema join)
  const profIds = [...new Set(rows.map(c => c.profissional_id))]
  const profMap = new Map<string, { nome: string }>()
  if (profIds.length > 0) {
    const { data: profs } = await supabase
      .from('user_profiles')
      .select('id, nome')
      .in('id', profIds)
    ;(profs ?? []).forEach(p => profMap.set(p.id, { nome: p.nome }))
  }

  return rows.map(c => ({
    ...c,
    sala: c.salas ?? undefined,
    profissional: profMap.get(c.profissional_id),
  }))
}

export async function criarContrato(dados: NovoContrato): Promise<ContratoSala> {
  const { data: { user } } = await supabase.auth.getUser()
  const payload = {
    ...dados,
    criado_por: user?.id,
    valor_mensal: dados.modalidade === 'permanente' ? dados.valor_mensal : null,
    valor_hora:   dados.modalidade === 'hora'       ? dados.valor_hora   : null,
    dia_vencimento: dados.modalidade === 'permanente' ? dados.dia_vencimento : null,
  }
  const { data, error } = await supabase
    .schema('psicologia')
    .from('contratos_sala')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as ContratoSala
}

export async function atualizarContrato(id: string, dados: Partial<NovoContrato>): Promise<ContratoSala> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('contratos_sala')
    .update(dados)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ContratoSala
}

export async function alternarAtivoContrato(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .schema('psicologia')
    .from('contratos_sala')
    .update({ ativo })
    .eq('id', id)
  if (error) throw error
}

// ── Pesos de rateio ───────────────────────────────────────────

export async function listarPesos(): Promise<PesoRateioSala[]> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('pesos_rateio_sala')
    .select('*')
  if (error) throw error
  return (data ?? []) as PesoRateioSala[]
}

export async function salvarPeso(sala_id: string, fator: number): Promise<void> {
  const { error } = await supabase
    .schema('psicologia')
    .from('pesos_rateio_sala')
    .upsert({ sala_id, fator, updated_at: new Date().toISOString() }, { onConflict: 'sala_id' })
  if (error) throw error
}

// ── Despesas ──────────────────────────────────────────────────

export async function listarDespesas(competencia?: string): Promise<DespesaCondominio[]> {
  let q = supabase
    .schema('psicologia')
    .from('despesas_condominio')
    .select('*')
    .order('created_at', { ascending: true })

  if (competencia) q = q.eq('competencia', competencia)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as DespesaCondominio[]
}

export async function criarDespesa(dados: NovaDespesa): Promise<DespesaCondominio> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .schema('psicologia')
    .from('despesas_condominio')
    .insert({ ...dados, criado_por: user?.id })
    .select()
    .single()
  if (error) throw error
  return data as DespesaCondominio
}

export async function atualizarDespesa(id: string, dados: Partial<NovaDespesa>): Promise<DespesaCondominio> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('despesas_condominio')
    .update(dados)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as DespesaCondominio
}

export async function excluirDespesa(id: string): Promise<void> {
  const { error } = await supabase
    .schema('psicologia')
    .from('despesas_condominio')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Demonstrativos ────────────────────────────────────────────

export async function listarDemonstrativos(): Promise<DemonstrativoCondominio[]> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('demonstrativos_condominio')
    .select('*')
    .order('competencia', { ascending: false })
  if (error) throw error
  return (data ?? []) as DemonstrativoCondominio[]
}

export async function getDemonstrativo(competencia: string): Promise<DemonstrativoCondominio | null> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('demonstrativos_condominio')
    .select('*')
    .eq('competencia', competencia)
    .maybeSingle()
  if (error) throw error
  return data as DemonstrativoCondominio | null
}

export async function listarItensDemonstrativo(demonstrativo_id: string): Promise<DemonstrativoItem[]> {
  const { data: itens, error } = await supabase
    .schema('psicologia')
    .from('demonstrativo_itens')
    .select('*, salas(nome, cor_hex), demonstrativo_rateio(*)')
    .eq('demonstrativo_id', demonstrativo_id)
    .order('created_at')
  if (error) throw error

  const rows = (itens ?? []) as (DemonstrativoItem & { salas?: { nome: string; cor_hex: string }; demonstrativo_rateio?: DemonstrativoItem['rateio'] })[]

  const profIds = [...new Set(rows.map(r => r.profissional_id))]
  const profMap = new Map<string, { nome: string }>()
  if (profIds.length > 0) {
    const { data: profs } = await supabase.from('user_profiles').select('id, nome').in('id', profIds)
    ;(profs ?? []).forEach(p => profMap.set(p.id, { nome: p.nome }))
  }

  return rows.map(r => ({
    ...r,
    sala: r.salas ?? undefined,
    profissional: profMap.get(r.profissional_id),
    rateio: r.demonstrativo_rateio ?? [],
  }))
}

export async function fecharCompetencia(competencia: string, itens: CalcItem[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dem, error: e1 } = await supabase
    .schema('psicologia')
    .from('demonstrativos_condominio')
    .insert({ competencia, status: 'fechado', fechado_em: new Date().toISOString(), fechado_por: user?.id })
    .select()
    .single()
  if (e1) throw e1

  // Mês de referência para movimentacoes_parceria (primeiro dia do mês)
  const compDate = competencia  // já é 'YYYY-MM-01'
  const mesLabel = (() => {
    const [y, m] = competencia.split('-')
    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return `${nomes[+m - 1]}/${y}`
  })()

  for (const item of itens) {
    // 1. Cria entrada financeira em movimentacoes_parceria
    const { data: mov, error: eMov } = await supabase
      .from('movimentacoes_parceria')
      .insert({
        parceria_id:    item.profissionalId,  // UUID como texto (sem FK constraint)
        profissional_id: item.profissionalId,
        tipo:           'debito',
        categoria:      'aluguel_sala',
        valor:          item.valorMensalidade + item.totalRateio,
        descricao:      `Condomínio ${mesLabel} — ${item.salaNome}`,
        competencia:    compDate,
        status:         'pendente',
        criado_por:     user?.id,
      })
      .select('id')
      .single()

    const lancamentoId = eMov ? null : mov?.id ?? null

    // 2. Cria item do demonstrativo com referência financeira
    const { data: demItem, error: e2 } = await supabase
      .schema('psicologia')
      .from('demonstrativo_itens')
      .insert({
        demonstrativo_id:  dem.id,
        profissional_id:   item.profissionalId,
        sala_id:           item.salaId,
        contrato_id:       item.contratoId,
        valor_mensalidade: item.valorMensalidade,
        valor_rateio:      item.totalRateio,
        status:            'pendente',
        lancamento_id:     lancamentoId,
      })
      .select()
      .single()
    if (e2) throw e2

    if (item.despesasRateadas.length > 0) {
      const { error: e3 } = await supabase
        .schema('psicologia')
        .from('demonstrativo_rateio')
        .insert(item.despesasRateadas.map(r => ({
          item_id:    demItem.id,
          despesa_id: r.despesaId,
          percentual: r.percentual,
          valor:      r.valor,
        })))
      if (e3) throw e3
    }
  }
}

export async function atualizarStatusItem(id: string, status: StatusItem): Promise<void> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('demonstrativo_itens')
    .update({ status })
    .eq('id', id)
    .select('lancamento_id')
    .single()
  if (error) throw error

  // Sincroniza status na movimentação financeira
  if (data?.lancamento_id) {
    const movStatus = status === 'pago' ? 'liquidado' : status === 'isento' ? 'cancelado' : 'pendente'
    await supabase
      .from('movimentacoes_parceria')
      .update({ status: movStatus })
      .eq('id', data.lancamento_id)
  }
}

// ── Analytics ─────────────────────────────────────────────────

export interface DespesaMensal {
  competencia: string   // 'YYYY-MM'
  total: number
  utilidade: number
  servico: number
  imposto: number
}

export interface StatusResumo {
  pendente: number
  pago: number
  isento: number
  totalValor: number
}

export async function listarDespesasHistorico(): Promise<DespesaMensal[]> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('despesas_condominio')
    .select('competencia, valor_total, categoria')
    .order('competencia', { ascending: true })
  if (error) throw error

  const map = new Map<string, DespesaMensal>()
  for (const row of data ?? []) {
    const key = (row.competencia as string).slice(0, 7)
    if (!map.has(key)) map.set(key, { competencia: key, total: 0, utilidade: 0, servico: 0, imposto: 0 })
    const m = map.get(key)!
    m.total += row.valor_total
    if (row.categoria === 'utilidade') m.utilidade += row.valor_total
    else if (row.categoria === 'servico') m.servico += row.valor_total
    else if (row.categoria === 'imposto') m.imposto += row.valor_total
  }
  return Array.from(map.values())
}

export async function listarStatusItens(): Promise<StatusResumo> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('demonstrativo_itens')
    .select('status, valor_mensalidade, valor_rateio')
  if (error) throw error

  const result: StatusResumo = { pendente: 0, pago: 0, isento: 0, totalValor: 0 }
  for (const row of data ?? []) {
    result[row.status as StatusItem]++
    result.totalValor += (row.valor_mensalidade ?? 0) + (row.valor_rateio ?? 0)
  }
  return result
}

// ── Cálculo em memória ────────────────────────────────────────

export function calcularRateio(
  contratos: ContratoSala[],
  despesas: DespesaCondominio[],
  pesos: PesoRateioSala[],
): CalcItem[] {
  const pesoMap = new Map(pesos.map(p => [p.sala_id, p.fator]))
  const totalPeso = contratos.reduce((s, c) => s + (pesoMap.get(c.sala_id) ?? 1.0), 0)
  const n = contratos.length

  return contratos.map(c => {
    const fator = pesoMap.get(c.sala_id) ?? 1.0
    const despesasRateadas: CalcItemRateio[] = despesas.map(d => {
      const percentual = d.criterio_rateio === 'igualitario'
        ? (n > 0 ? 100 / n : 0)
        : (totalPeso > 0 ? (fator / totalPeso) * 100 : 0)
      return {
        despesaId: d.id,
        descricao: d.descricao,
        categoria: d.categoria,
        valor:     d.valor_total * (percentual / 100),
        percentual,
      }
    })
    const totalRateio = despesasRateadas.reduce((s, r) => s + r.valor, 0)
    return {
      contratoId:       c.id,
      profissionalId:   c.profissional_id,
      profissionalNome: c.profissional?.nome ?? '—',
      salaId:           c.sala_id,
      salaNome:         c.sala?.nome ?? '—',
      salaCorHex:       c.sala?.cor_hex ?? '#94a3b8',
      fator,
      valorMensalidade: c.valor_mensal ?? 0,
      despesasRateadas,
      totalRateio,
      total: (c.valor_mensal ?? 0) + totalRateio,
    }
  })
}
