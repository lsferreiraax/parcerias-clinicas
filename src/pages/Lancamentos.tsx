import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, CheckCircle, Pencil, Info, CreditCard, Banknote, QrCode, AlertTriangle } from 'lucide-react'
import { Card, Button, Badge, Modal, Input, Select, FiltroData } from '@/components/ui'
import { useLancamentos, useCriarLancamento, useAtualizarStatusLancamento, useDeletarLancamento, useEditarLancamento, useDeletarEmLote } from '@/hooks/useLancamentos'
import { fmt } from '@/lib/utils'
import { calcularRateio, LABELS_PARCERIA } from '@/services/rateio'
import { usePerfil } from '@/contexts/PerfilContext'
import type { Lancamento, ParceriaId, FormaPagamento } from '@/types'

const MEIOS_PAGAMENTO = [
  { value: 'cartao_credito', label: 'Cartão de Crédito', icon: CreditCard },
  { value: 'pix',            label: 'Pix',               icon: QrCode     },
  { value: 'dinheiro',       label: 'Dinheiro',           icon: Banknote   },
] as const

function MeioPagamentoCheckboxes({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (meio: string) =>
    onChange(value.includes(meio) ? value.filter(m => m !== meio) : [...value, meio])

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Meio de Pagamento</p>
      <div className="flex gap-3 flex-wrap">
        {MEIOS_PAGAMENTO.map(({ value: v, label, icon: Icon }) => {
          const checked = value.includes(v)
          return (
            <label
              key={v}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none text-sm transition-colors ${
                checked
                  ? 'border-[#1F3864] bg-[#1F3864]/5 text-[#1F3864] font-medium'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggle(v)}
              />
              <Icon size={15} />
              {label}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function MeioPagamentoBadges({ meios }: { meios?: string[] }) {
  if (!meios || meios.length === 0) return <span className="text-gray-400">—</span>
  return (
    <div className="flex gap-1 flex-wrap">
      {meios.map(m => {
        const found = MEIOS_PAGAMENTO.find(x => x.value === m)
        const Icon = found?.icon
        return (
          <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs whitespace-nowrap">
            {Icon && <Icon size={11} />}
            {found?.label ?? m}
          </span>
        )
      })}
    </div>
  )
}

const INIT = {
  data_atendimento: new Date().toISOString().split('T')[0],
  paciente: '',
  nome_responsavel: '',
  data_pagamento: '',
  meio_pagamento: [] as string[],
  parceria_id: 'A' as ParceriaId,
  forma_pagamento: 'avista' as FormaPagamento,
  num_parcelas: 1,
  valor_total: 0,
  observacoes: '',
}

type FormEdicao = {
  data_atendimento: string
  paciente: string
  nome_responsavel: string
  data_pagamento: string
  meio_pagamento: string[]
  parceria_id: ParceriaId
  valor_total: number
  observacoes: string
}

function TooltipResponsavel({ nome }: { nome: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    const handler = () => setVisible(false)
    document.addEventListener('scroll', handler, true)
    return () => document.removeEventListener('scroll', handler, true)
  }, [visible])

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
        aria-label="Ver responsável"
      >
        <Info size={14} />
      </button>
      {visible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-white shadow-lg">
          <span className="font-medium">Responsável:</span> {nome || '—'}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  )
}

export default function Lancamentos() {
  const { isAdmin, isGestor } = usePerfil()
  const podeEditar = isAdmin || isGestor

  const [modal, setModal]               = useState(false)
  const [modalEdicao, setModalEdicao]   = useState(false)
  const [modalExclusao, setModalExclusao] = useState(false)
  const [lancamentoEditando, setLancamentoEditando] = useState<Lancamento | null>(null)
  const [filtros, setFiltros]           = useState<{ parceria?: string; status?: string; dataInicio?: string; dataFim?: string }>({})
  const [form, setForm]                 = useState(INIT)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [motivoExclusao, setMotivoExclusao] = useState('')
  const [formEdicao, setFormEdicao] = useState<FormEdicao>({
    data_atendimento: '',
    paciente: '',
    nome_responsavel: '',
    data_pagamento: '',
    meio_pagamento: [],
    parceria_id: 'A',
    valor_total: 0,
    observacoes: '',
  })

  const { data: lancamentos, isLoading } = useLancamentos(filtros)
  const criar          = useCriarLancamento()
  const atualizar      = useAtualizarStatusLancamento()
  const deletar        = useDeletarLancamento()
  const editar         = useEditarLancamento()
  const deletarLote    = useDeletarEmLote()

  // Lançamentos disponíveis para seleção (apenas não-pagos)
  const selecionaveis  = (lancamentos ?? []).filter(l => l.status !== 'pago')
  const todosSelecionados = selecionaveis.length > 0 && selecionaveis.every(l => selecionados.has(l.id))
  const algunsSelecionados = selecionaveis.some(l => selecionados.has(l.id))

  const toggleSelecionado = (id: string, status: string) => {
    if (status === 'pago') return
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    if (todosSelecionados) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(selecionaveis.map(l => l.id)))
    }
  }

  const abrirModalExclusao = () => {
    setMotivoExclusao('')
    setModalExclusao(true)
  }

  const handleExcluirLote = async () => {
    if (!motivoExclusao.trim() || selecionados.size === 0) return
    await deletarLote.mutateAsync({ ids: Array.from(selecionados), motivo: motivoExclusao.trim() })
    setSelecionados(new Set())
    setModalExclusao(false)
  }

  const rateioPreview = form.valor_total > 0
    ? calcularRateio(form.parceria_id, form.valor_total)
    : null

  const handleSubmit = async () => {
    if (!form.paciente || !form.valor_total) return
    await criar.mutateAsync({
      ...form,
      nome_responsavel: form.nome_responsavel || undefined,
      data_pagamento:   form.data_pagamento   || undefined,
      meio_pagamento:   form.meio_pagamento.length > 0 ? form.meio_pagamento : undefined,
      valor_total:  Number(form.valor_total),
      num_parcelas: Number(form.num_parcelas),
    })
    setModal(false)
    setForm(INIT)
  }

  const abrirEdicao = (l: Lancamento) => {
    setLancamentoEditando(l)
    setFormEdicao({
      data_atendimento: l.data_atendimento,
      paciente:         l.paciente,
      nome_responsavel: l.nome_responsavel ?? '',
      data_pagamento:   l.data_pagamento   ?? '',
      meio_pagamento:   l.meio_pagamento   ?? [],
      parceria_id:      l.parceria_id,
      valor_total:      Number(l.valor_total),
      observacoes:      l.observacoes ?? '',
    })
    setModalEdicao(true)
  }

  const handleSalvarEdicao = async () => {
    if (!lancamentoEditando || !formEdicao.paciente || !formEdicao.valor_total) return
    await editar.mutateAsync({
      id: lancamentoEditando.id,
      dados: {
        ...formEdicao,
        nome_responsavel: formEdicao.nome_responsavel || undefined,
        data_pagamento:   formEdicao.data_pagamento   || undefined,
        meio_pagamento:   formEdicao.meio_pagamento.length > 0 ? formEdicao.meio_pagamento : undefined,
      },
    })
    setModalEdicao(false)
    setLancamentoEditando(null)
  }

  const RateioPreview = ({ parceria_id, valor_total }: { parceria_id: ParceriaId; valor_total: number }) => {
    const r = calcularRateio(parceria_id, valor_total)
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-sm">
        <p className="font-semibold text-gray-700 mb-2">Preview do Rateio</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {r.camta_valor  > 0 && <div className="flex justify-between"><span className="text-gray-500">Camta</span><span className="font-medium text-blue-700">{fmt.moeda(r.camta_valor)}</span></div>}
          {r.medico_valor > 0 && <div className="flex justify-between"><span className="text-gray-500">Médico</span><span className="font-medium text-green-700">{fmt.moeda(r.medico_valor)}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Psi1</span><span className="font-medium text-yellow-700">{fmt.moeda(r.psi1_valor)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Psi2</span><span className="font-medium text-orange-700">{fmt.moeda(r.psi2_valor)}</span></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Lançamentos</h1>
          <p className="text-gray-500 text-sm mt-1">Registro de atendimentos e rateio automático</p>
        </div>
        <div className="flex gap-2">
          {podeEditar && selecionados.size > 0 && (
            <Button
              onClick={abrirModalExclusao}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 size={16} />
              Excluir selecionados ({selecionados.size})
            </Button>
          )}
          <Button onClick={() => setModal(true)}><Plus size={16} /> Novo Lançamento</Button>
        </div>
      </div>

      <Card>
        <div className="px-6 py-4 flex gap-4 flex-wrap items-center">
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            onChange={e => setFiltros(f => ({ ...f, parceria: e.target.value || undefined }))}>
            <option value="">Todas as parcerias</option>
            {(['A','B','C'] as ParceriaId[]).map(p => <option key={p} value={p}>Parceria {p}</option>)}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            onChange={e => setFiltros(f => ({ ...f, status: e.target.value || undefined }))}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <div className="h-5 border-l border-gray-200" />
          <FiltroData
            dataInicio={filtros.dataInicio ?? ''}
            dataFim={filtros.dataFim ?? ''}
            onChangeInicio={v => setFiltros(f => ({ ...f, dataInicio: v || undefined }))}
            onChangeFim={v => setFiltros(f => ({ ...f, dataFim: v || undefined }))}
            onLimpar={() => setFiltros(f => ({ ...f, dataInicio: undefined, dataFim: undefined }))}
          />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {podeEditar && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={todosSelecionados}
                      ref={el => { if (el) el.indeterminate = algunsSelecionados && !todosSelecionados }}
                      onChange={toggleTodos}
                      className="rounded border-gray-300 text-[#1F3864] focus:ring-[#1F3864]"
                      title="Selecionar todos (exceto pagos)"
                    />
                  </th>
                )}
                {['Data','Paciente','Parceria','Pagamento','Meio','Valor Total','Camta','Médico','Psi1','Psi2','Dt. Pagamento','Status','Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={14} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
              )}
              {!isLoading && (!lancamentos || lancamentos.length === 0) && (
                <tr><td colSpan={14} className="px-6 py-8 text-center text-gray-400">Nenhum lançamento encontrado</td></tr>
              )}
              {(lancamentos ?? []).map(l => {
                const isSelecionado = selecionados.has(l.id)
                const isPago        = l.status === 'pago'
                return (
                <tr key={l.id} className={`hover:bg-gray-50 ${isSelecionado ? 'bg-red-50' : ''}`}>
                  {podeEditar && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelecionado}
                        disabled={isPago}
                        onChange={() => toggleSelecionado(l.id, l.status)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={isPago ? 'Lançamentos pagos não podem ser excluídos' : ''}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">{fmt.data(l.data_atendimento)}</td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      {l.paciente}
                      {l.nome_responsavel && <TooltipResponsavel nome={l.nome_responsavel} />}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant={l.parceria_id as ParceriaId}>Parceria {l.parceria_id}</Badge></td>
                  <td className="px-4 py-3">{l.forma_pagamento === 'avista' ? 'À Vista' : `Parcelado ${l.num_parcelas}x`}</td>
                  <td className="px-4 py-3"><MeioPagamentoBadges meios={l.meio_pagamento} /></td>
                  <td className="px-4 py-3 font-semibold">{fmt.moeda(l.valor_total)}</td>
                  <td className="px-4 py-3 text-blue-700">{l.camta_valor > 0 ? fmt.moeda(l.camta_valor) : '—'}</td>
                  <td className="px-4 py-3 text-green-700">{l.medico_valor > 0 ? fmt.moeda(l.medico_valor) : '—'}</td>
                  <td className="px-4 py-3 text-yellow-700">{fmt.moeda(l.psi1_valor)}</td>
                  <td className="px-4 py-3 text-orange-700">{fmt.moeda(l.psi2_valor)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {l.data_pagamento ? fmt.data(l.data_pagamento) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={l.status === 'pago' ? 'success' : l.status === 'cancelado' ? 'danger' : 'warning'}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {l.status === 'pendente' && (
                        <button
                          onClick={() => atualizar.mutate({ id: l.id, status: 'pago' })}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Marcar como pago">
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {podeEditar && (
                        <button
                          onClick={() => abrirEdicao(l)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Editar lançamento">
                          <Pencil size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => { if (window.confirm('Excluir lançamento?')) deletar.mutate(l.id) }}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded" title="Excluir">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Excluir em lote */}
      <Modal open={modalExclusao} onClose={() => setModalExclusao(false)} title="Excluir Lançamentos">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">Ação irreversível</p>
              <p>
                Você está prestes a excluir <strong>{selecionados.size} lançamento(s)</strong> e todas as
                parcelas associadas. Esta operação não pode ser desfeita.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo da exclusão <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              rows={3}
              placeholder="Descreva o motivo da exclusão..."
              value={motivoExclusao}
              onChange={e => setMotivoExclusao(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setModalExclusao(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              loading={deletarLote.isPending}
              disabled={!motivoExclusao.trim()}
              onClick={handleExcluirLote}
            >
              <Trash2 size={15} />
              Confirmar exclusão
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Novo Lançamento */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo Lançamento">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data do Atendimento" type="date"
              value={form.data_atendimento}
              onChange={e => setForm(f => ({ ...f, data_atendimento: e.target.value }))} />
            <Select
              label="Parceria" value={form.parceria_id}
              onChange={e => setForm(f => ({ ...f, parceria_id: e.target.value as ParceriaId }))}>
              {(['A','B','C'] as ParceriaId[]).map(p => (
                <option key={p} value={p}>{LABELS_PARCERIA[p]}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome do Paciente" placeholder="Nome completo"
              value={form.paciente}
              onChange={e => setForm(f => ({ ...f, paciente: e.target.value }))} />
            <Input
              label="Nome do Responsável (opcional)" placeholder="Responsável pelo paciente"
              value={form.nome_responsavel}
              onChange={e => setForm(f => ({ ...f, nome_responsavel: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Forma de Pagamento" value={form.forma_pagamento}
              onChange={e => setForm(f => ({
                ...f,
                forma_pagamento: e.target.value as FormaPagamento,
                num_parcelas: e.target.value === 'avista' ? 1 : f.num_parcelas,
              }))}>
              <option value="avista">À Vista</option>
              <option value="parcelado">Parcelado</option>
            </Select>
            {form.forma_pagamento === 'parcelado' && (
              <Input
                label="Nº de Parcelas" type="number" min={2} max={24}
                value={form.num_parcelas}
                onChange={e => setForm(f => ({ ...f, num_parcelas: Number(e.target.value) }))} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor Total (R$)" type="number" min={0} step={0.01} placeholder="0,00"
              value={form.valor_total || ''}
              onChange={e => setForm(f => ({ ...f, valor_total: Number(e.target.value) }))} />
            <Input
              label="Data do Pagamento (opcional)" type="date"
              value={form.data_pagamento}
              onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))} />
          </div>

          <MeioPagamentoCheckboxes
            value={form.meio_pagamento}
            onChange={v => setForm(f => ({ ...f, meio_pagamento: v }))}
          />

          {rateioPreview && (
            <RateioPreview parceria_id={form.parceria_id} valor_total={form.valor_total} />
          )}

          <Input
            label="Observações (opcional)" placeholder="..."
            value={form.observacoes}
            onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={criar.isPending} onClick={handleSubmit}>Salvar Lançamento</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Lançamento */}
      <Modal open={modalEdicao} onClose={() => setModalEdicao(false)} title="Editar Lançamento">
        <div className="space-y-4">
          {lancamentoEditando?.forma_pagamento === 'parcelado' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              Este lançamento é parcelado. Alterar a parceria recalculará o rateio das
              <strong> parcelas pendentes</strong> automaticamente. Parcelas já pagas não são afetadas.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data do Atendimento" type="date"
              value={formEdicao.data_atendimento}
              onChange={e => setFormEdicao(f => ({ ...f, data_atendimento: e.target.value }))} />
            <Select
              label="Parceria" value={formEdicao.parceria_id}
              onChange={e => setFormEdicao(f => ({ ...f, parceria_id: e.target.value as ParceriaId }))}>
              {(['A','B','C'] as ParceriaId[]).map(p => (
                <option key={p} value={p}>{LABELS_PARCERIA[p]}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome do Paciente" placeholder="Nome completo"
              value={formEdicao.paciente}
              onChange={e => setFormEdicao(f => ({ ...f, paciente: e.target.value }))} />
            <Input
              label="Nome do Responsável (opcional)" placeholder="Responsável pelo paciente"
              value={formEdicao.nome_responsavel}
              onChange={e => setFormEdicao(f => ({ ...f, nome_responsavel: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor Total (R$)" type="number" min={0} step={0.01}
              value={formEdicao.valor_total || ''}
              onChange={e => setFormEdicao(f => ({ ...f, valor_total: Number(e.target.value) }))} />
            <Input
              label="Data do Pagamento (opcional)" type="date"
              value={formEdicao.data_pagamento}
              onChange={e => setFormEdicao(f => ({ ...f, data_pagamento: e.target.value }))} />
          </div>

          <MeioPagamentoCheckboxes
            value={formEdicao.meio_pagamento}
            onChange={v => setFormEdicao(f => ({ ...f, meio_pagamento: v }))}
          />

          {formEdicao.valor_total > 0 && (
            <RateioPreview parceria_id={formEdicao.parceria_id} valor_total={formEdicao.valor_total} />
          )}

          <Input
            label="Observações (opcional)" placeholder="..."
            value={formEdicao.observacoes}
            onChange={e => setFormEdicao(f => ({ ...f, observacoes: e.target.value }))} />

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalEdicao(false)}>Cancelar</Button>
            <Button className="flex-1" loading={editar.isPending} onClick={handleSalvarEdicao}>Salvar Alterações</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
