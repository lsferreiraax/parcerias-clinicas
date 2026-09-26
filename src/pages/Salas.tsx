import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Plus, Pencil, Power, Trash2, Clock, Users, X, Check,
} from 'lucide-react'
import {
  listarSalas, criarSala, atualizarSala, alternarAtivoSala, excluirSala,
  TIPOS_SALA, CORES_SALA,
  type Sala, type NovaSala, type TipoSala,
} from '@/services/salas'

const SALA_VAZIA: NovaSala = {
  nome: '',
  tipo: 'sala',
  descricao: '',
  cor_hex: '#6366f1',
  capacidade: 1,
  horario_inicio: '08:00',
  horario_fim: '20:00',
  buffer_minutos: 0,
}

export default function Salas() {
  const qc = useQueryClient()
  const [mostrarInativas, setMostrarInativas] = useState(false)
  const [modal, setModal] = useState<{ aberto: boolean; sala: Sala | null }>({ aberto: false, sala: null })
  const [form, setForm] = useState<NovaSala>(SALA_VAZIA)
  const [confirmarExclusao, setConfirmarExclusao] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const { data: salas = [], isLoading } = useQuery({
    queryKey: ['salas', mostrarInativas],
    queryFn: () => listarSalas(!mostrarInativas),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['salas'] })

  const mutCriar = useMutation({ mutationFn: criarSala, onSuccess: () => { invalidar(); fecharModal() } })
  const mutAtualizar = useMutation({ mutationFn: ({ id, dados }: { id: string; dados: Partial<NovaSala> }) => atualizarSala(id, dados), onSuccess: () => { invalidar(); fecharModal() } })
  const mutAtivar = useMutation({ mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => alternarAtivoSala(id, ativo), onSuccess: invalidar })
  const mutExcluir = useMutation({ mutationFn: excluirSala, onSuccess: () => { invalidar(); setConfirmarExclusao(null) } })

  function abrirCriar() {
    setForm(SALA_VAZIA)
    setErro('')
    setModal({ aberto: true, sala: null })
  }

  function abrirEditar(sala: Sala) {
    setForm({
      nome: sala.nome,
      tipo: sala.tipo,
      descricao: sala.descricao ?? '',
      cor_hex: sala.cor_hex,
      capacidade: sala.capacidade,
      horario_inicio: sala.horario_inicio,
      horario_fim: sala.horario_fim,
      buffer_minutos: sala.buffer_minutos,
    })
    setErro('')
    setModal({ aberto: true, sala })
  }

  function fecharModal() {
    setModal({ aberto: false, sala: null })
    setErro('')
  }

  function salvar() {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    if (form.horario_inicio >= form.horario_fim) { setErro('Horário de início deve ser antes do horário de fim.'); return }

    if (modal.sala) {
      mutAtualizar.mutate({ id: modal.sala.id, dados: form })
    } else {
      mutCriar.mutate(form)
    }
  }

  const isPending = mutCriar.isPending || mutAtualizar.isPending

  const corDaSala = (hex: string) => ({ backgroundColor: hex })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Salas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gerenciamento de salas e espaços clínicos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarInativas}
              onChange={e => setMostrarInativas(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Mostrar inativas
          </label>
          <button
            onClick={abrirCriar}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Sala
          </button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando salas...</div>
      ) : salas.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Nenhuma sala cadastrada.</p>
          <button onClick={abrirCriar} className="mt-4 text-orange-500 hover:underline text-sm">Criar primeira sala</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {salas.map(sala => (
            <div
              key={sala.id}
              className={`bg-white dark:bg-gray-800 border rounded-xl overflow-hidden shadow-sm transition-opacity ${!sala.ativo ? 'opacity-60' : ''}`}
              style={{ borderColor: sala.cor_hex + '66' }}
            >
              {/* Barra colorida */}
              <div className="h-1.5" style={corDaSala(sala.cor_hex)} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={corDaSala(sala.cor_hex)} />
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{sala.nome}</span>
                    {!sala.ativo && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">Inativa</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">
                  {TIPOS_SALA.find(t => t.value === sala.tipo)?.label}
                </p>

                {sala.descricao && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{sala.descricao}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {sala.capacidade} {sala.capacidade === 1 ? 'pessoa' : 'pessoas'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {sala.horario_inicio.slice(0,5)}–{sala.horario_fim.slice(0,5)}
                  </span>
                  {sala.buffer_minutos > 0 && (
                    <span>+{sala.buffer_minutos}min buffer</span>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                  <button
                    onClick={() => abrirEditar(sala)}
                    className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button
                    onClick={() => mutAtivar.mutate({ id: sala.id, ativo: !sala.ativo })}
                    className={`flex items-center gap-1 text-xs transition-colors ${sala.ativo ? 'text-gray-600 dark:text-gray-400 hover:text-yellow-600' : 'text-green-600 dark:text-green-400 hover:text-green-700'}`}
                  >
                    <Power className="w-3 h-3" />
                    {sala.ativo ? 'Inativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => setConfirmarExclusao(sala.id)}
                    className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors ml-auto"
                  >
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal.aberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {modal.sala ? 'Editar Sala' : 'Nova Sala'}
              </h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Sala 1, Consultório A..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoSala }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {TIPOS_SALA.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <textarea
                  value={form.descricao ?? ''}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  placeholder="Informações adicionais sobre a sala..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor de identificação</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {CORES_SALA.map(c => (
                    <button
                      key={c.hex}
                      title={c.label}
                      onClick={() => setForm(f => ({ ...f, cor_hex: c.hex }))}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c.hex,
                        borderColor: form.cor_hex === c.hex ? c.hex : 'transparent',
                        outline: form.cor_hex === c.hex ? `3px solid ${c.hex}44` : 'none',
                        outlineOffset: '2px',
                      }}
                    >
                      {form.cor_hex === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacidade (pessoas)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.capacidade}
                  onChange={e => setForm(f => ({ ...f, capacidade: Number(e.target.value) }))}
                  className="w-32 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário de início</label>
                  <input
                    type="time"
                    value={form.horario_inicio}
                    onChange={e => setForm(f => ({ ...f, horario_inicio: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário de fim</label>
                  <input
                    type="time"
                    value={form.horario_fim}
                    onChange={e => setForm(f => ({ ...f, horario_fim: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              {/* Buffer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buffer entre sessões (minutos)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  step={5}
                  value={form.buffer_minutos}
                  onChange={e => setForm(f => ({ ...f, buffer_minutos: Number(e.target.value) }))}
                  className="w-32 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-400 mt-1">Tempo reservado para limpeza/preparação entre atendimentos.</p>
              </div>

              {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={fecharModal}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={isPending}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isPending ? 'Salvando...' : modal.sala ? 'Salvar alterações' : 'Criar sala'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmarExclusao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir esta sala? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmarExclusao(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => mutExcluir.mutate(confirmarExclusao)}
                disabled={mutExcluir.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {mutExcluir.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
