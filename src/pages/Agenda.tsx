import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useSessoes, useCriarSessao, useAtualizarSessao, useDeletarSessao } from '@/hooks/useSessoes'
import { usePacientes } from '@/hooks/usePacientes'
import {
  Sessao, NovaSessao, StatusSessao, ModalidadeSessao,
  STATUS_SESSAO, MODALIDADE_SESSAO,
  semanaDeData, formatarData, diasDaSemana,
} from '@/services/sessoes'

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const COR_STATUS: Record<StatusSessao, string> = {
  agendada:  'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  realizada: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700/40 dark:text-gray-400 dark:border-gray-600',
  faltou:    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800',
}

const VAZIA: NovaSessao = {
  paciente_id: '',
  data_sessao: '',
  hora_inicio: '08:00',
  hora_fim: '',
  modalidade: 'presencial',
  status: 'agendada',
  valor_sessao: undefined,
  observacoes: '',
}

export default function Agenda() {
  const [semanaRef, setSemanaRef] = useState(new Date())
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Sessao | null>(null)
  const [form, setForm] = useState<NovaSessao>(VAZIA)
  const [confirmarDeletar, setConfirmarDeletar] = useState<string | null>(null)
  const [, setDiaPreSelecionado] = useState<string>('')

  const { inicio, fim } = semanaDeData(semanaRef)
  const dias = diasDaSemana(inicio)

  const { data: sessoes = [], isLoading } = useSessoes(formatarData(inicio), formatarData(fim))
  const { data: pacientes = [] } = usePacientes()
  const criar = useCriarSessao()
  const atualizar = useAtualizarSessao()
  const deletar = useDeletarSessao()

  // Agrupa sessões por data
  const sessoesPorDia = useMemo(() => {
    const mapa: Record<string, Sessao[]> = {}
    for (const s of sessoes) {
      if (!mapa[s.data_sessao]) mapa[s.data_sessao] = []
      mapa[s.data_sessao].push(s)
    }
    return mapa
  }, [sessoes])

  const hoje = formatarData(new Date())

  function semanaAnterior() {
    const d = new Date(semanaRef)
    d.setDate(d.getDate() - 7)
    setSemanaRef(d)
  }

  function semanaProxima() {
    const d = new Date(semanaRef)
    d.setDate(d.getDate() + 7)
    setSemanaRef(d)
  }

  function semanaAtual() { setSemanaRef(new Date()) }

  function abrirNova(data?: string) {
    setEditando(null)
    setForm({ ...VAZIA, data_sessao: data ?? hoje })
    setDiaPreSelecionado(data ?? '')
    setModalAberto(true)
  }

  function abrirEdicao(s: Sessao) {
    setEditando(s)
    setForm({
      paciente_id: s.paciente_id,
      profissional_id: s.profissional_id,
      data_sessao: s.data_sessao,
      hora_inicio: s.hora_inicio,
      hora_fim: s.hora_fim ?? '',
      modalidade: s.modalidade,
      status: s.status,
      valor_sessao: s.valor_sessao,
      observacoes: s.observacoes ?? '',
    })
    setModalAberto(true)
  }

  async function salvar() {
    const dados: NovaSessao = {
      ...form,
      hora_fim: form.hora_fim || undefined,
      observacoes: form.observacoes || undefined,
      valor_sessao: form.valor_sessao || undefined,
      profissional_id: form.profissional_id || undefined,
    }
    if (editando) {
      await atualizar.mutateAsync({ id: editando.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    setModalAberto(false)
  }

  async function confirmarExcluir() {
    if (!confirmarDeletar) return
    await deletar.mutateAsync(confirmarDeletar)
    setConfirmarDeletar(null)
  }

  const salvando = criar.isPending || atualizar.isPending
  const labelSemana = `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Agenda</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{labelSemana}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={semanaAtual}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Hoje
          </button>
          <button onClick={semanaAnterior} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={semanaProxima} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => abrirNova()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            Nova Sessão
          </button>
        </div>
      </div>

      {/* Grade semanal */}
      <div className="grid grid-cols-7 gap-2">
        {/* Cabeçalhos dos dias */}
        {dias.map((dia, i) => {
          const dataStr = formatarData(dia)
          const isHoje = dataStr === hoje
          return (
            <div key={i} className="text-center">
              <div className={`text-xs font-semibold mb-1 ${isHoje ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {DIAS_SEMANA[i]}
              </div>
              <div className={`text-sm font-medium w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2
                ${isHoje
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 dark:text-gray-300'}`}
              >
                {dia.getDate()}
              </div>
            </div>
          )
        })}

        {/* Colunas dos dias */}
        {dias.map((dia, i) => {
          const dataStr = formatarData(dia)
          const isHoje = dataStr === hoje
          const listaSessoes = sessoesPorDia[dataStr] ?? []

          return (
            <div
              key={i}
              className={`min-h-32 rounded-lg border p-1.5 space-y-1
                ${isHoje
                  ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-700 dark:bg-indigo-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
            >
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {listaSessoes.map(s => (
                    <div
                      key={s.id}
                      className={`text-xs rounded border px-1.5 py-1 cursor-pointer group relative ${COR_STATUS[s.status]}`}
                      onClick={() => abrirEdicao(s)}
                    >
                      <div className="font-medium truncate">{s.pacientes?.nome ?? '—'}</div>
                      <div className="opacity-70">{s.hora_inicio.slice(0, 5)}{s.hora_fim ? `–${s.hora_fim.slice(0, 5)}` : ''}</div>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmarDeletar(s.id) }}
                        className="absolute top-0.5 right-0.5 hidden group-hover:flex p-0.5 rounded hover:bg-black/10"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => abrirNova(dataStr)}
                    className="w-full flex items-center justify-center gap-1 py-1 text-xs text-gray-400 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mt-4 flex-wrap">
        {STATUS_SESSAO.map(s => (
          <div key={s.value} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className={`w-2.5 h-2.5 rounded-sm border ${COR_STATUS[s.value]}`} />
            {s.label}
          </div>
        ))}
      </div>

      {/* Modal nova / edição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editando ? 'Editar Sessão' : 'Nova Sessão'}
              </h2>
              {editando && (
                <button
                  onClick={() => { setConfirmarDeletar(editando.id); setModalAberto(false) }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              {/* Paciente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Paciente <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.paciente_id}
                  onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione o paciente</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              {/* Data e horários */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.data_sessao}
                    onChange={e => setForm(f => ({ ...f, data_sessao: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim</label>
                  <input
                    type="time"
                    value={form.hora_fim}
                    onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Status e Modalidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusSessao }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUS_SESSAO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modalidade</label>
                  <select
                    value={form.modalidade}
                    onChange={e => setForm(f => ({ ...f, modalidade: e.target.value as ModalidadeSessao }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {MODALIDADE_SESSAO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Valor e Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor da sessão (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_sessao ?? ''}
                  onChange={e => setForm(f => ({ ...f, valor_sessao: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Notas rápidas sobre a sessão..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancelar</button>
              <button
                onClick={salvar}
                disabled={!form.paciente_id || !form.data_sessao || !form.hora_inicio || salvando}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmarDeletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Excluir sessão?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmarDeletar(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancelar</button>
              <button
                onClick={confirmarExcluir}
                disabled={deletar.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deletar.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
