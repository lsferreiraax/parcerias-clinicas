import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, CheckCircle, AlertCircle, Clock, X, BarChart2 } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { listarSalas } from '@/services/salas'
import {
  listarContratos, criarContrato, atualizarContrato, alternarAtivoContrato,
  listarPesos, salvarPeso,
  listarDespesas, criarDespesa, atualizarDespesa, excluirDespesa,
  listarDemonstrativos, getDemonstrativo, listarItensDemonstrativo,
  fecharCompetencia, atualizarStatusItem, calcularRateio,
  listarDespesasHistorico, listarStatusItens,
  type ContratoSala, type NovoContrato,
  type DespesaCondominio, type NovaDespesa,
  type CalcItem,
  type StatusItem,
} from '@/services/condominioSala'

// ── helpers ───────────────────────────────────────────────────

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const mesAno = (ym: string) => {
  const [y, m] = ym.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[+m - 1]} ${y}`
}

const competenciaParaDate = (ym: string) => `${ym}-01`
const dateParaCompetencia = (d: string) => d.slice(0, 7)

function navegarMes(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const hojeCompetencia = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const CATEGORIA_LABEL: Record<string, string> = {
  utilidade: 'Utilidade', servico: 'Serviço', imposto: 'Imposto',
}
const CATEGORIA_COLOR: Record<string, string> = {
  utilidade: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  servico:   'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  imposto:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}
const STATUS_ITEM: Record<StatusItem, { label: string; icon: typeof CheckCircle; cls: string }> = {
  pendente: { label: 'Pendente', icon: Clock,        cls: 'text-amber-600 dark:text-amber-400' },
  pago:     { label: 'Pago',     icon: CheckCircle,  cls: 'text-green-600 dark:text-green-400' },
  isento:   { label: 'Isento',   icon: AlertCircle,  cls: 'text-gray-500 dark:text-gray-400'   },
}

// ── shared UI ─────────────────────────────────────────────────

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{children}</label>
)
const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 ${p.className ?? ''}`} />
)
const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 ${p.className ?? ''}`} />
)
const Btn = ({ variant = 'primary', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) => {
  const cls = {
    primary:   'bg-orange-500 hover:bg-orange-600 text-white',
    secondary: 'border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
    danger:    'bg-red-500 hover:bg-red-600 text-white',
  }[variant]
  return <button {...p} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${cls} ${p.className ?? ''}`} />
}

// ── Nav competência ───────────────────────────────────────────

function NavCompetencia({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(navegarMes(value, -1))} className="p-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <span className="px-4 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-800 dark:text-white min-w-[110px] text-center">
        {mesAno(value)}
      </span>
      <button onClick={() => onChange(navegarMes(value, 1))} className="p-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  )
}

// ── Modal Contrato ────────────────────────────────────────────

const VAZIO_CONTRATO: NovoContrato = {
  sala_id: '', profissional_id: '', modalidade: 'permanente',
  valor_mensal: undefined, valor_hora: undefined,
  dia_vencimento: 5, data_inicio: new Date().toISOString().slice(0, 10),
}

function ModalContrato({
  inicial, onSalvar, onFechar,
}: {
  inicial?: ContratoSala
  onSalvar: (d: NovoContrato) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState<NovoContrato>(
    inicial
      ? { sala_id: inicial.sala_id, profissional_id: inicial.profissional_id,
          modalidade: inicial.modalidade, valor_mensal: inicial.valor_mensal ?? undefined,
          valor_hora: inicial.valor_hora ?? undefined, dia_vencimento: inicial.dia_vencimento ?? undefined,
          data_inicio: inicial.data_inicio, data_fim: inicial.data_fim ?? undefined,
          observacoes: inicial.observacoes ?? undefined }
      : VAZIO_CONTRATO
  )

  const { data: salas = [] } = useQuery({ queryKey: ['salas', true], queryFn: () => listarSalas(true) })
  const { data: profissionais = [] } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('id, nome, role').order('nome')
      if (error) throw error
      return data ?? []
    },
  })

  const f = <K extends keyof NovoContrato>(k: K, v: NovoContrato[K]) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {inicial ? 'Editar contrato' : 'Novo contrato'}
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18}/></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sala *</Label>
              <Select value={form.sala_id} onChange={e => f('sala_id', e.target.value)}>
                <option value="">Selecione</option>
                {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </Select>
            </div>
            <div>
              <Label>Profissional *</Label>
              <Select value={form.profissional_id} onChange={e => f('profissional_id', e.target.value)}>
                <option value="">Selecione</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </div>
          </div>

          <div>
            <Label>Modalidade *</Label>
            <div className="flex gap-4">
              {(['permanente', 'hora'] as const).map(m => (
                <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="modalidade" value={m} checked={form.modalidade === m}
                    onChange={() => f('modalidade', m)} />
                  <span className="text-gray-700 dark:text-gray-200 capitalize">{m}</span>
                </label>
              ))}
            </div>
          </div>

          {form.modalidade === 'permanente' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor mensal (R$) *</Label>
                <Input type="number" min="0" step="0.01" value={form.valor_mensal ?? ''}
                  onChange={e => f('valor_mensal', +e.target.value)} />
              </div>
              <div>
                <Label>Dia de vencimento</Label>
                <Input type="number" min="1" max="28" value={form.dia_vencimento ?? ''}
                  onChange={e => f('dia_vencimento', +e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <Label>Valor por hora (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={form.valor_hora ?? ''}
                onChange={e => f('valor_hora', +e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Início *</Label>
              <Input type="date" value={form.data_inicio} onChange={e => f('data_inicio', e.target.value)} />
            </div>
            <div>
              <Label>Fim (opcional)</Label>
              <Input type="date" value={form.data_fim ?? ''} onChange={e => f('data_fim', e.target.value || undefined)} />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Input value={form.observacoes ?? ''} onChange={e => f('observacoes', e.target.value || undefined)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Btn variant="secondary" onClick={onFechar}>Cancelar</Btn>
          <Btn onClick={() => onSalvar(form)}
            disabled={!form.sala_id || !form.profissional_id ||
              (form.modalidade === 'permanente' ? !form.valor_mensal : !form.valor_hora)}>
            Salvar
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── Modal Despesa ─────────────────────────────────────────────

const VAZIA_DESPESA = (competencia: string): NovaDespesa => ({
  competencia: competenciaParaDate(competencia),
  descricao: '', categoria: 'utilidade', valor_total: 0, criterio_rateio: 'igualitario',
})

function ModalDespesa({
  inicial, competencia, onSalvar, onFechar,
}: {
  inicial?: DespesaCondominio
  competencia: string
  onSalvar: (d: NovaDespesa) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState<NovaDespesa>(
    inicial
      ? { competencia: inicial.competencia, descricao: inicial.descricao,
          categoria: inicial.categoria, valor_total: inicial.valor_total,
          criterio_rateio: inicial.criterio_rateio, observacoes: inicial.observacoes ?? undefined }
      : VAZIA_DESPESA(competencia)
  )
  const f = <K extends keyof NovaDespesa>(k: K, v: NovaDespesa[K]) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {inicial ? 'Editar despesa' : 'Nova despesa'}
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18}/></button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={e => f('descricao', e.target.value)} placeholder="Ex: Conta de luz — Set/26" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onChange={e => f('categoria', e.target.value as NovaDespesa['categoria'])}>
                <option value="utilidade">Utilidade</option>
                <option value="servico">Serviço</option>
                <option value="imposto">Imposto</option>
              </Select>
            </div>
            <div>
              <Label>Valor total (R$) *</Label>
              <Input type="number" min="0.01" step="0.01" value={form.valor_total || ''}
                onChange={e => f('valor_total', +e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Critério de rateio</Label>
            <div className="flex gap-4">
              {([
                { v: 'igualitario', l: 'Igualitário (÷ nº contratos)' },
                { v: 'por_peso',    l: 'Por peso (fator por sala)'    },
              ] as const).map(({ v, l }) => (
                <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="criterio" value={v} checked={form.criterio_rateio === v}
                    onChange={() => f('criterio_rateio', v)} />
                  <span className="text-gray-700 dark:text-gray-200">{l}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Input value={form.observacoes ?? ''} onChange={e => f('observacoes', e.target.value || undefined)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Btn variant="secondary" onClick={onFechar}>Cancelar</Btn>
          <Btn onClick={() => onSalvar(form)} disabled={!form.descricao || !form.valor_total}>Salvar</Btn>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

type Aba = 'contratos' | 'despesas' | 'demonstrativo' | 'historico' | 'dashboard'

export default function Condominio() {
  const qc = useQueryClient()
  const [aba, setAba] = useState<Aba>('contratos')
  const [competencia, setCompetencia] = useState(hojeCompetencia)
  const [modalContrato, setModalContrato] = useState<'novo' | ContratoSala | null>(null)
  const [modalDespesa, setModalDespesa]   = useState<'novo' | DespesaCondominio | null>(null)
  const [expandedItem, setExpandedItem]   = useState<string | null>(null)
  const [editandoPeso, setEditandoPeso]   = useState<Record<string, string>>({})

  const compDate = competenciaParaDate(competencia)

  // ── Queries ──────────────────────────────────────────────────
  const { data: contratos = [] } = useQuery({ queryKey: ['contratos-sala'], queryFn: () => listarContratos() })
  const { data: pesos = [] }     = useQuery({ queryKey: ['pesos-rateio'],   queryFn: listarPesos })
  const { data: despesas = [] }  = useQuery({ queryKey: ['despesas-cond', compDate], queryFn: () => listarDespesas(compDate) })
  const { data: demonstrativos = [] } = useQuery({ queryKey: ['demonstrativos'], queryFn: listarDemonstrativos })
  const { data: demAtual } = useQuery({
    queryKey: ['demonstrativo', compDate],
    queryFn: () => getDemonstrativo(compDate),
    enabled: aba === 'demonstrativo',
  })
  const { data: itensFechados = [] } = useQuery({
    queryKey: ['demonstrativo-itens', demAtual?.id],
    queryFn: () => listarItensDemonstrativo(demAtual!.id),
    enabled: !!demAtual?.id && aba === 'demonstrativo',
  })

  const { data: despesasHistorico = [] } = useQuery({
    queryKey: ['despesas-historico'],
    queryFn: listarDespesasHistorico,
    enabled: aba === 'dashboard',
  })
  const { data: statusItens } = useQuery({
    queryKey: ['status-itens'],
    queryFn: listarStatusItens,
    enabled: aba === 'dashboard',
  })

  // ── Calc (só para contratos permanentes ativos) ───────────────
  const contratosParaRateio = useMemo(
    () => contratos.filter(c => c.modalidade === 'permanente' && c.ativo),
    [contratos]
  )
  const calcItens: CalcItem[] = useMemo(
    () => calcularRateio(contratosParaRateio, despesas, pesos),
    [contratosParaRateio, despesas, pesos]
  )
  const totalGeralCalc = calcItens.reduce((s, i) => s + i.total, 0)
  const totalDespesas  = despesas.reduce((s, d) => s + d.valor_total, 0)

  // ── Mutations ─────────────────────────────────────────────────
  const invContrato = () => qc.invalidateQueries({ queryKey: ['contratos-sala'] })
  const invDespesa  = () => { qc.invalidateQueries({ queryKey: ['despesas-cond', compDate] }); qc.invalidateQueries({ queryKey: ['demonstrativo', compDate] }) }
  const invDem      = () => { qc.invalidateQueries({ queryKey: ['demonstrativos'] }); qc.invalidateQueries({ queryKey: ['demonstrativo', compDate] }); qc.invalidateQueries({ queryKey: ['demonstrativo-itens'] }) }

  const mutCriarContrato    = useMutation({ mutationFn: criarContrato,    onSuccess: invContrato })
  const mutEditarContrato   = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<NovoContrato> }) => atualizarContrato(id, d), onSuccess: invContrato })
  const mutToggleContrato   = useMutation({ mutationFn: ({ id, v }: { id: string; v: boolean }) => alternarAtivoContrato(id, v), onSuccess: invContrato })
  const mutCriarDespesa     = useMutation({ mutationFn: criarDespesa,     onSuccess: invDespesa })
  const mutEditarDespesa    = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<NovaDespesa> }) => atualizarDespesa(id, d), onSuccess: invDespesa })
  const mutExcluirDespesa   = useMutation({ mutationFn: excluirDespesa,   onSuccess: invDespesa })
  const mutFechar           = useMutation({ mutationFn: ({ itens }: { itens: CalcItem[] }) => fecharCompetencia(compDate, itens), onSuccess: invDem })
  const mutStatusItem       = useMutation({ mutationFn: ({ id, s }: { id: string; s: StatusItem }) => atualizarStatusItem(id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ['demonstrativo-itens'] }) })
  const mutPeso             = useMutation({ mutationFn: ({ sala_id, fator }: { sala_id: string; fator: number }) => salvarPeso(sala_id, fator), onSuccess: () => qc.invalidateQueries({ queryKey: ['pesos-rateio'] }) })

  const salvarContrato = (d: NovoContrato) => {
    if (modalContrato === 'novo') mutCriarContrato.mutate(d, { onSuccess: () => setModalContrato(null) })
    else mutEditarContrato.mutate({ id: (modalContrato as ContratoSala).id, d }, { onSuccess: () => setModalContrato(null) })
  }
  const salvarDespesa = (d: NovaDespesa) => {
    if (modalDespesa === 'novo') mutCriarDespesa.mutate(d, { onSuccess: () => setModalDespesa(null) })
    else mutEditarDespesa.mutate({ id: (modalDespesa as DespesaCondominio).id, d }, { onSuccess: () => setModalDespesa(null) })
  }

  // ── Render ────────────────────────────────────────────────────
  const abas: { id: Aba; label: string }[] = [
    { id: 'contratos',     label: 'Contratos'     },
    { id: 'despesas',      label: 'Despesas'      },
    { id: 'demonstrativo', label: 'Demonstrativo' },
    { id: 'historico',     label: 'Histórico'     },
    { id: 'dashboard',     label: 'Dashboard'     },
  ]

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-orange-500" />
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Condomínio Clínico</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Contratos e rateio de despesas por sala</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              aba === a.id
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── ABA CONTRATOS ─────────────────────────────────────── */}
      {aba === 'contratos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {contratos.filter(c => c.ativo).length} contrato(s) ativo(s) ·{' '}
              {contratos.filter(c => c.modalidade === 'permanente' && c.ativo).length} permanente(s) no rateio
            </p>
            <Btn onClick={() => setModalContrato('novo')}><Plus size={14} className="inline mr-1"/>Novo Contrato</Btn>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <tr>
                    {['Profissional','Sala','Modalidade','Valor','Vencimento','Vigência','Status',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {contratos.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Nenhum contrato cadastrado.</td></tr>
                  )}
                  {contratos.map(c => (
                    <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!c.ativo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.profissional?.nome ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.sala?.cor_hex ?? '#94a3b8' }}/>
                          {c.sala?.nome ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.modalidade === 'permanente'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>{c.modalidade === 'permanente' ? 'Permanente' : 'Por hora'}</span>
                      </td>
                      <td className="px-4 py-3 font-variant-numeric">
                        {c.modalidade === 'permanente'
                          ? `${fmtBRL(c.valor_mensal ?? 0)}/mês`
                          : `${fmtBRL(c.valor_hora ?? 0)}/h`}
                      </td>
                      <td className="px-4 py-3">{c.dia_vencimento ? `Dia ${c.dia_vencimento}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {c.data_inicio} → {c.data_fim ?? '∞'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.ativo ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setModalContrato(c)} className="text-gray-400 hover:text-orange-500 transition-colors"><Pencil size={14}/></button>
                          <button onClick={() => mutToggleContrato.mutate({ id: c.id, v: !c.ativo })}
                            className={`text-xs px-2 py-0.5 rounded border transition-colors ${c.ativo ? 'border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-green-200 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                            {c.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pesos de rateio */}
          {contratos.filter(c => c.modalidade === 'permanente' && c.ativo).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Pesos de rateio por sala (critério "por peso")</h3>
              <div className="flex flex-wrap gap-3">
                {[...new Map(contratos.filter(c => c.modalidade === 'permanente' && c.ativo).map(c => [c.sala_id, c])).values()].map(c => {
                  const pesoAtual = pesos.find(p => p.sala_id === c.sala_id)?.fator ?? 1.0
                  const editando  = editandoPeso[c.sala_id] ?? String(pesoAtual)
                  return (
                    <div key={c.sala_id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.sala?.cor_hex ?? '#94a3b8' }}/>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{c.sala?.nome}</span>
                      <span className="text-gray-400">×</span>
                      <input type="number" min="0.1" step="0.1" value={editando}
                        onChange={e => setEditandoPeso(p => ({ ...p, [c.sala_id]: e.target.value }))}
                        className="w-16 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                      <button onClick={() => {
                        const f = parseFloat(editandoPeso[c.sala_id] ?? '1')
                        if (f > 0) mutPeso.mutate({ sala_id: c.sala_id, fator: f })
                      }} className="text-xs text-orange-600 dark:text-orange-400 font-medium hover:underline">salvar</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA DESPESAS ──────────────────────────────────────── */}
      {aba === 'despesas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <NavCompetencia value={competencia} onChange={setCompetencia} />
            <div className="flex items-center gap-3">
              {despesas.length > 0 && (
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Total: {fmtBRL(totalDespesas)}
                </span>
              )}
              <Btn onClick={() => setModalDespesa('novo')}><Plus size={14} className="inline mr-1"/>Nova Despesa</Btn>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <tr>
                  {['Descrição','Categoria','Critério de Rateio','Valor',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {despesas.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Nenhuma despesa em {mesAno(competencia)}.</td></tr>
                )}
                {despesas.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.descricao}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORIA_COLOR[d.categoria]}`}>
                        {CATEGORIA_LABEL[d.categoria]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {d.criterio_rateio === 'igualitario' ? 'Igualitário' : 'Por peso'}
                    </td>
                    <td className="px-4 py-3 font-medium font-variant-numeric">{fmtBRL(d.valor_total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModalDespesa(d)} className="text-gray-400 hover:text-orange-500 transition-colors"><Pencil size={14}/></button>
                        <button onClick={() => { if (confirm('Excluir despesa?')) mutExcluirDespesa.mutate(d.id) }}
                          className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {despesas.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">Total</td>
                    <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white font-variant-numeric">{fmtBRL(totalDespesas)}</td>
                    <td/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── ABA DEMONSTRATIVO ─────────────────────────────────── */}
      {aba === 'demonstrativo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <NavCompetencia value={competencia} onChange={setCompetencia} />
            {demAtual?.status === 'fechado' && (
              <span className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-3 py-1 rounded-full font-medium">
                ✓ Fechado em {demAtual.fechado_em ? new Date(demAtual.fechado_em).toLocaleDateString('pt-BR') : '—'}
              </span>
            )}
          </div>

          {/* competência já fechada → mostra itens salvos */}
          {demAtual?.status === 'fechado' ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <tr>
                    {['Profissional','Sala','Mensalidade','Rateio','Total','Status',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {itensFechados.map(item => {
                    const StatusIcon = STATUS_ITEM[item.status].icon
                    return (
                      <>
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.profissional?.nome ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: item.sala?.cor_hex ?? '#94a3b8' }}/>
                              {item.sala?.nome ?? '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-variant-numeric">{fmtBRL(item.valor_mensalidade)}</td>
                          <td className="px-4 py-3 font-variant-numeric">{fmtBRL(item.valor_rateio)}</td>
                          <td className="px-4 py-3 font-bold font-variant-numeric">{fmtBRL(item.valor_mensalidade + item.valor_rateio)}</td>
                          <td className="px-4 py-3">
                            <StatusIcon size={14} className={`inline mr-1 ${STATUS_ITEM[item.status].cls}`}/>
                            <span className={`text-xs ${STATUS_ITEM[item.status].cls}`}>{STATUS_ITEM[item.status].label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Select value={item.status} onChange={e => mutStatusItem.mutate({ id: item.id, s: e.target.value as StatusItem })}
                              className="text-xs py-1 px-2 w-auto" onClick={e => e.stopPropagation()}>
                              <option value="pendente">Pendente</option>
                              <option value="pago">Pago</option>
                              <option value="isento">Isento</option>
                            </Select>
                          </td>
                        </tr>
                        {expandedItem === item.id && (item.rateio ?? []).length > 0 && (
                          <tr key={`${item.id}-exp`}>
                            <td colSpan={7} className="px-8 py-3 bg-gray-50 dark:bg-gray-900/50">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Detalhamento das despesas rateadas:</p>
                              <div className="flex flex-wrap gap-2">
                                {item.rateio!.map(r => (
                                  <span key={r.id} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1">
                                    {despesas.find(d => d.id === r.despesa_id)?.descricao ?? r.despesa_id.slice(0,8)}: {fmtBRL(r.valor)} ({r.percentual?.toFixed(1)}%)
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* competência ainda aberta → mostra cálculo em memória */
            <>
              {contratosParaRateio.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  Nenhum contrato permanente ativo. Cadastre contratos na aba Contratos.
                </div>
              ) : (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Contratos permanentes', value: String(contratosParaRateio.length) },
                      { label: 'Total despesas', value: fmtBRL(totalDespesas) },
                      { label: 'Total a cobrar', value: fmtBRL(totalGeralCalc) },
                    ].map(k => (
                      <div key={k.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white font-variant-numeric">{k.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        <tr>
                          {['Profissional','Sala','Fator','Mensalidade','Rateio','Total'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {calcItens.map(item => (
                          <>
                            <tr key={item.contratoId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                              onClick={() => setExpandedItem(expandedItem === item.contratoId ? null : item.contratoId)}>
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.profissionalNome}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ background: item.salaCorHex }}/>
                                  {item.salaNome}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.fator.toFixed(2)}×</td>
                              <td className="px-4 py-3 font-variant-numeric">{fmtBRL(item.valorMensalidade)}</td>
                              <td className="px-4 py-3 font-variant-numeric">{fmtBRL(item.totalRateio)}</td>
                              <td className="px-4 py-3 font-bold font-variant-numeric">{fmtBRL(item.total)}</td>
                            </tr>
                            {expandedItem === item.contratoId && item.despesasRateadas.length > 0 && (
                              <tr key={`${item.contratoId}-exp`}>
                                <td colSpan={6} className="px-8 py-3 bg-gray-50 dark:bg-gray-900/50">
                                  <div className="flex flex-wrap gap-2">
                                    {item.despesasRateadas.map(r => (
                                      <span key={r.despesaId} className={`text-xs border rounded-lg px-3 py-1 ${CATEGORIA_COLOR[r.categoria]}`}>
                                        {r.descricao}: {fmtBRL(r.valor)} ({r.percentual.toFixed(1)}%)
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-xs text-gray-500">Total geral</td>
                          <td className="px-4 py-2 font-bold font-variant-numeric">{fmtBRL(calcItens.reduce((s,i) => s+i.totalRateio, 0))}</td>
                          <td className="px-4 py-2 font-bold font-variant-numeric text-orange-600 dark:text-orange-400">{fmtBRL(totalGeralCalc)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {calcItens.length > 0 && (
                    <div className="flex justify-end">
                      <Btn
                        onClick={() => { if (confirm(`Fechar competência ${mesAno(competencia)}? Esta ação não pode ser desfeita.`)) mutFechar.mutate({ itens: calcItens }) }}
                        disabled={mutFechar.isPending}>
                        {mutFechar.isPending ? 'Salvando…' : `Fechar ${mesAno(competencia)}`}
                      </Btn>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO ─────────────────────────────────────── */}
      {aba === 'historico' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                {['Competência','Status','Fechado em'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {demonstrativos.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">Nenhuma competência fechada.</td></tr>
              )}
              {demonstrativos.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <button className="hover:text-orange-500 transition-colors"
                      onClick={() => { setCompetencia(dateParaCompetencia(d.competencia)); setAba('demonstrativo') }}>
                      {mesAno(dateParaCompetencia(d.competencia))}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      ✓ Fechado
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {d.fechado_em ? new Date(d.fechado_em).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ABA DASHBOARD ─────────────────────────────────────── */}
      {aba === 'dashboard' && (() => {
        const CORES = { utilidade: '#3b82f6', servico: '#a855f7', imposto: '#f97316' }
        const PIE_CORES = ['#f59e0b', '#22c55e', '#94a3b8']
        const mesLabel = (ym: string) => {
          const [y, m] = ym.split('-')
          const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
          return `${nomes[+m-1]}/${y.slice(2)}`
        }
        const historicoFormatado = despesasHistorico.slice(-12).map(d => ({
          ...d, mes: mesLabel(d.competencia),
          total: +d.total.toFixed(2), utilidade: +d.utilidade.toFixed(2),
          servico: +d.servico.toFixed(2), imposto: +d.imposto.toFixed(2),
        }))
        const pieData = statusItens ? [
          { name: 'Pendente', value: statusItens.pendente },
          { name: 'Pago',     value: statusItens.pago     },
          { name: 'Isento',   value: statusItens.isento   },
        ].filter(d => d.value > 0) : []

        const totalContratos = contratos.filter(c => c.ativo).length
        const totalPermanentes = contratos.filter(c => c.ativo && c.modalidade === 'permanente').length
        const totalMensalidades = contratos
          .filter(c => c.ativo && c.modalidade === 'permanente')
          .reduce((s, c) => s + (c.valor_mensal ?? 0), 0)
        const ultimoMes = historicoFormatado[historicoFormatado.length - 1]

        return (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Contratos ativos', value: totalContratos, sub: `${totalPermanentes} permanentes` },
                { label: 'Mensalidades/mês', value: fmtBRL(totalMensalidades), sub: 'contratos permanentes' },
                { label: 'Despesas último mês', value: ultimoMes ? fmtBRL(ultimoMes.total) : '—', sub: ultimoMes ? mesLabel(ultimoMes.competencia) : 'sem dados' },
                { label: 'Competências fechadas', value: demonstrativos.length, sub: 'histórico total' },
              ].map(k => (
                <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white font-variant-numeric">{k.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Evolução de despesas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Evolução de despesas — últimos 12 meses</h3>
              </div>
              {historicoFormatado.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Nenhum dado de despesas ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={historicoFormatado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CORES.utilidade} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CORES.utilidade} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CORES.servico} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CORES.servico} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CORES.imposto} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CORES.imposto} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="utilidade" name="Utilidade" stroke={CORES.utilidade} fill="url(#gU)" strokeWidth={2} />
                    <Area type="monotone" dataKey="servico"   name="Serviço"   stroke={CORES.servico}   fill="url(#gS)" strokeWidth={2} />
                    <Area type="monotone" dataKey="imposto"   name="Imposto"   stroke={CORES.imposto}   fill="url(#gI)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Barra + pizza */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Total por categoria (barras) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Total acumulado por categoria</h3>
                {historicoFormatado.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={historicoFormatado} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={38} />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Bar dataKey="utilidade" name="Utilidade" fill={CORES.utilidade} stackId="a" />
                      <Bar dataKey="servico"   name="Serviço"   fill={CORES.servico}   stackId="a" />
                      <Bar dataKey="imposto"   name="Imposto"   fill={CORES.imposto}   stackId="a" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Status dos itens */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Status dos lançamentos</h3>
                {pieData.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhuma competência fechada ainda.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={3}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_CORES[i % PIE_CORES.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_CORES[i % PIE_CORES.length] }} />
                          <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                          <span className="ml-auto font-semibold text-gray-900 dark:text-white">{d.value}</span>
                        </div>
                      ))}
                      {statusItens && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                          Total: {fmtBRL(statusItens.totalValor)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Modais ────────────────────────────────────────────── */}
      {modalContrato !== null && (
        <ModalContrato
          inicial={modalContrato === 'novo' ? undefined : modalContrato}
          onSalvar={salvarContrato}
          onFechar={() => setModalContrato(null)}
        />
      )}
      {modalDespesa !== null && (
        <ModalDespesa
          inicial={modalDespesa === 'novo' ? undefined : modalDespesa}
          competencia={competencia}
          onSalvar={salvarDespesa}
          onFechar={() => setModalDespesa(null)}
        />
      )}
    </div>
  )
}
