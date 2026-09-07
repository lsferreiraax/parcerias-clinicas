import { useState } from 'react'
import { Plus, Trash2, CheckCircle, Pencil } from 'lucide-react'
import { Card, Button, Badge, Modal, Input, Select, FiltroData } from '@/components/ui'
import { useLancamentos, useCriarLancamento, useAtualizarStatusLancamento, useDeletarLancamento, useEditarLancamento } from '@/hooks/useLancamentos'
import { fmt } from '@/lib/utils'
import { calcularRateio, LABELS_PARCERIA } from '@/services/rateio'
import { usePerfil } from '@/contexts/PerfilContext'
import type { Lancamento, ParceriaId, FormaPagamento } from '@/types'

const INIT = {
  data_atendimento: new Date().toISOString().split('T')[0],
  paciente: '',
  parceria_id: 'A' as ParceriaId,
  forma_pagamento: 'avista' as FormaPagamento,
  num_parcelas: 1,
  valor_total: 0,
  observacoes: '',
}

type FormEdicao = {
  data_atendimento: string
  paciente: string
  parceria_id: ParceriaId
  valor_total: number
  observacoes: string
}

export default function Lancamentos() {
  const { isAdmin, isGestor } = usePerfil()
  const podeEditar = isAdmin || isGestor

  const [modal, setModal]         = useState(false)
  const [modalEdicao, setModalEdicao] = useState(false)
  const [lancamentoEditando, setLancamentoEditando] = useState<Lancamento | null>(null)
  const [filtros, setFiltros]     = useState<{ parceria?: string; status?: string; dataInicio?: string; dataFim?: string }>({})
  const [form, setForm]           = useState(INIT)
  const [formEdicao, setFormEdicao] = useState<FormEdicao>({
    data_atendimento: '',
    paciente: '',
    parceria_id: 'A',
    valor_total: 0,
    observacoes: '',
  })

  const { data: lancamentos, isLoading } = useLancamentos(filtros)
  const criar     = useCriarLancamento()
  const atualizar = useAtualizarStatusLancamento()
  const deletar   = useDeletarLancamento()
  const editar    = useEditarLancamento()

  const rateioPreview = form.valor_total > 0
    ? calcularRateio(form.parceria_id, form.valor_total)
    : null

const handleSubmit = async () => {
    if (!form.paciente || !form.valor_total) return
    await criar.mutateAsync({
      ...form,
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
      parceria_id:      l.parceria_id,
      valor_total:      Number(l.valor_total),
      observacoes:      l.observacoes ?? '',
    })
    setModalEdicao(true)
  }

  const handleSalvarEdicao = async () => {
    if (!lancamentoEditando || !formEdicao.paciente || !formEdicao.valor_total) return
    await editar.mutateAsync({ id: lancamentoEditando.id, dados: formEdicao })
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
        <Button onClick={() => setModal(true)}><Plus size={16} /> Novo Lançamento</Button>
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
                {['Data','Paciente','Parceria','Pagamento','Valor Total','Camta','Médico','Psi1','Psi2','Status','Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
              )}
              {!isLoading && (!lancamentos || lancamentos.length === 0) && (
                <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-400">Nenhum lançamento encontrado</td></tr>
              )}
              {(lancamentos ?? []).map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">{fmt.data(l.data_atendimento)}</td>
                  <td className="px-4 py-3 font-medium">{l.paciente}</td>
                  <td className="px-4 py-3"><Badge variant={l.parceria_id as ParceriaId}>Parceria {l.parceria_id}</Badge></td>
                  <td className="px-4 py-3">{l.forma_pagamento === 'avista' ? 'À Vista' : `Parcelado ${l.num_parcelas}x`}</td>
                  <td className="px-4 py-3 font-semibold">{fmt.moeda(l.valor_total)}</td>
                  <td className="px-4 py-3 text-blue-700">{l.camta_valor > 0 ? fmt.moeda(l.camta_valor) : '—'}</td>
                  <td className="px-4 py-3 text-green-700">{l.medico_valor > 0 ? fmt.moeda(l.medico_valor) : '—'}</td>
                  <td className="px-4 py-3 text-yellow-700">{fmt.moeda(l.psi1_valor)}</td>
                  <td className="px-4 py-3 text-orange-700">{fmt.moeda(l.psi2_valor)}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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

          <Input
            label="Nome do Paciente" placeholder="Nome completo"
            value={form.paciente}
            onChange={e => setForm(f => ({ ...f, paciente: e.target.value }))} />

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

          <Input
            label="Valor Total (R$)" type="number" min={0} step={0.01} placeholder="0,00"
            value={form.valor_total || ''}
            onChange={e => setForm(f => ({ ...f, valor_total: Number(e.target.value) }))} />

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

          <Input
            label="Nome do Paciente" placeholder="Nome completo"
            value={formEdicao.paciente}
            onChange={e => setFormEdicao(f => ({ ...f, paciente: e.target.value }))} />

          <Input
            label="Valor Total (R$)" type="number" min={0} step={0.01}
            value={formEdicao.valor_total || ''}
            onChange={e => setFormEdicao(f => ({ ...f, valor_total: Number(e.target.value) }))} />

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
