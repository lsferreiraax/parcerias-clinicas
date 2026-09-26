import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Plus, Pencil, Power, Trash2, Clock, Users, X, Check, Ban, CalendarX,
} from 'lucide-react'
import {
  listarSalas, criarSala, atualizarSala, alternarAtivoSala, excluirSala,
  TIPOS_SALA, CORES_SALA,
  type Sala, type NovaSala, type TipoSala,
} from '@/services/salas'
import {
  listarBloqueios, criarBloqueio, atualizarBloqueio, excluirBloqueio,
  type BloqueioSala, type NovoBloqueio,
} from '@/services/bloqueiosSala'

// ─── helpers ────────────────────────────────────────────────────────────────

const SALA_VAZIA: NovaSala = {
  nome: '', tipo: 'sala', descricao: '', cor_hex: '#6366f1',
  capacidade: 1, horario_inicio: '08:00', horario_fim: '20:00', buffer_minutos: 0,
}

function bloqueioVazio(sala_id = ''): NovoBloqueio {
  return { sala_id, titulo: '', motivo: '', data: new Date().toISOString().slice(0, 10), dia_inteiro: false, hora_inicio: '08:00', hora_fim: '09:00' }
}

function formatarData(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

// ─── componente ─────────────────────────────────────────────────────────────

export default function Salas() {
  const qc = useQueryClient()
  const [aba, setAba] = useState<'salas' | 'bloqueios'>('salas')
  const [mostrarInativas, setMostrarInativas] = useState(false)
  const [filtroBloqueioSala, setFiltroBloqueioSala] = useState('')

  // modal sala
  const [modalSala, setModalSala] = useState<{ aberto: boolean; sala: Sala | null }>({ aberto: false, sala: null })
  const [formSala, setFormSala] = useState<NovaSala>(SALA_VAZIA)
  const [erroSala, setErroSala] = useState('')
  const [confirmarExclusaoSala, setConfirmarExclusaoSala] = useState<string | null>(null)

  // modal bloqueio
  const [modalBloqueio, setModalBloqueio] = useState<{ aberto: boolean; bloqueio: BloqueioSala | null }>({ aberto: false, bloqueio: null })
  const [formBloqueio, setFormBloqueio] = useState<NovoBloqueio>(bloqueioVazio())
  const [erroBloqueio, setErroBloqueio] = useState('')
  const [confirmarExclusaoBloqueio, setConfirmarExclusaoBloqueio] = useState<string | null>(null)

  // ── queries ──────────────────────────────────────────────────────────────

  const { data: salas = [], isLoading: carregandoSalas } = useQuery({
    queryKey: ['salas', mostrarInativas],
    queryFn: () => listarSalas(!mostrarInativas),
  })

  const { data: bloqueios = [], isLoading: carregandoBloqueios } = useQuery({
    queryKey: ['bloqueios-sala'],
    queryFn: () => listarBloqueios(),
  })

  const invalidarSalas = () => qc.invalidateQueries({ queryKey: ['salas'] })
  const invalidarBloqueios = () => qc.invalidateQueries({ queryKey: ['bloqueios-sala'] })

  // ── mutations salas ───────────────────────────────────────────────────────

  const mutCriarSala = useMutation({ mutationFn: criarSala, onSuccess: () => { invalidarSalas(); fecharModalSala() } })
  const mutAtualizarSala = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<NovaSala> }) => atualizarSala(id, dados),
    onSuccess: () => { invalidarSalas(); fecharModalSala() },
  })
  const mutAtivarSala = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => alternarAtivoSala(id, ativo),
    onSuccess: invalidarSalas,
  })
  const mutExcluirSala = useMutation({
    mutationFn: excluirSala,
    onSuccess: () => { invalidarSalas(); setConfirmarExclusaoSala(null) },
  })

  // ── mutations bloqueios ───────────────────────────────────────────────────

  const mutCriarBloqueio = useMutation({ mutationFn: criarBloqueio, onSuccess: () => { invalidarBloqueios(); fecharModalBloqueio() } })
  const mutAtualizarBloqueio = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<NovoBloqueio> }) => atualizarBloqueio(id, dados),
    onSuccess: () => { invalidarBloqueios(); fecharModalBloqueio() },
  })
  const mutExcluirBloqueio = useMutation({
    mutationFn: excluirBloqueio,
    onSuccess: () => { invalidarBloqueios(); setConfirmarExclusaoBloqueio(null) },
  })

  // ── handlers sala ─────────────────────────────────────────────────────────

  function abrirCriarSala() {
    setFormSala(SALA_VAZIA); setErroSala(''); setModalSala({ aberto: true, sala: null })
  }
  function abrirEditarSala(sala: Sala) {
    setFormSala({ nome: sala.nome, tipo: sala.tipo, descricao: sala.descricao ?? '', cor_hex: sala.cor_hex, capacidade: sala.capacidade, horario_inicio: sala.horario_inicio, horario_fim: sala.horario_fim, buffer_minutos: sala.buffer_minutos })
    setErroSala(''); setModalSala({ aberto: true, sala })
  }
  function fecharModalSala() { setModalSala({ aberto: false, sala: null }); setErroSala('') }
  function salvarSala() {
    if (!formSala.nome.trim()) { setErroSala('Nome é obrigatório.'); return }
    if (formSala.horario_inicio >= formSala.horario_fim) { setErroSala('Horário de início deve ser antes do fim.'); return }
    if (modalSala.sala) mutAtualizarSala.mutate({ id: modalSala.sala.id, dados: formSala })
    else mutCriarSala.mutate(formSala)
  }

  // ── handlers bloqueio ─────────────────────────────────────────────────────

  function abrirCriarBloqueio() {
    setFormBloqueio(bloqueioVazio()); setErroBloqueio(''); setModalBloqueio({ aberto: true, bloqueio: null })
  }
  function abrirEditarBloqueio(b: BloqueioSala) {
    setFormBloqueio({ sala_id: b.sala_id, titulo: b.titulo, motivo: b.motivo ?? '', data: b.data, dia_inteiro: b.dia_inteiro, hora_inicio: b.hora_inicio ?? '08:00', hora_fim: b.hora_fim ?? '09:00' })
    setErroBloqueio(''); setModalBloqueio({ aberto: true, bloqueio: b })
  }
  function fecharModalBloqueio() { setModalBloqueio({ aberto: false, bloqueio: null }); setErroBloqueio('') }
  function salvarBloqueio() {
    if (!formBloqueio.titulo.trim()) { setErroBloqueio('Título é obrigatório.'); return }
    if (!formBloqueio.sala_id) { setErroBloqueio('Selecione uma sala.'); return }
    if (!formBloqueio.data) { setErroBloqueio('Data é obrigatória.'); return }
    if (!formBloqueio.dia_inteiro && formBloqueio.hora_inicio! >= formBloqueio.hora_fim!) {
      setErroBloqueio('Horário de início deve ser antes do fim.'); return
    }
    if (modalBloqueio.bloqueio) mutAtualizarBloqueio.mutate({ id: modalBloqueio.bloqueio.id, dados: formBloqueio })
    else mutCriarBloqueio.mutate(formBloqueio)
  }

  const corDaSala = (hex: string) => ({ backgroundColor: hex })
  const nomeDaSala = (id: string) => salas.find(s => s.id === id)?.nome ?? '—'
  const corDaSalaPorId = (id: string) => salas.find(s => s.id === id)?.cor_hex ?? '#6366f1'

  const bloqueiosFiltrados = filtroBloqueioSala
    ? bloqueios.filter(b => b.sala_id === filtroBloqueioSala)
    : bloqueios

  const isPendingSala = mutCriarSala.isPending || mutAtualizarSala.isPending
  const isPendingBloqueio = mutCriarBloqueio.isPending || mutAtualizarBloqueio.isPending

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-orange-500" />
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Salas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerenciamento de salas e bloqueios de disponibilidade</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 gap-1">
        {([['salas', 'Salas', Building2], ['bloqueios', 'Bloqueios', Ban]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              aba === id
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── ABA SALAS ──────────────────────────────────────────────────────── */}
      {aba === 'salas' && (
        <>
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              <input type="checkbox" checked={mostrarInativas} onChange={e => setMostrarInativas(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
              Mostrar inativas
            </label>
            <button onClick={abrirCriarSala} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Nova Sala
            </button>
          </div>

          {carregandoSalas ? (
            <div className="text-center py-16 text-gray-400">Carregando salas...</div>
          ) : salas.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma sala cadastrada.</p>
              <button onClick={abrirCriarSala} className="mt-4 text-orange-500 hover:underline text-sm">Criar primeira sala</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {salas.map(sala => (
                <div key={sala.id} className={`bg-white dark:bg-gray-800 border rounded-xl overflow-hidden shadow-sm transition-opacity ${!sala.ativo ? 'opacity-60' : ''}`} style={{ borderColor: sala.cor_hex + '66' }}>
                  <div className="h-1.5" style={corDaSala(sala.cor_hex)} />
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={corDaSala(sala.cor_hex)} />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{sala.nome}</span>
                      {!sala.ativo && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">Inativa</span>}
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">{TIPOS_SALA.find(t => t.value === sala.tipo)?.label}</p>
                    {sala.descricao && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{sala.descricao}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {sala.capacidade} {sala.capacidade === 1 ? 'pessoa' : 'pessoas'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {sala.horario_inicio.slice(0, 5)}–{sala.horario_fim.slice(0, 5)}</span>
                      {sala.buffer_minutos > 0 && <span>+{sala.buffer_minutos}min</span>}
                    </div>
                    <div className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <button onClick={() => abrirEditarSala(sala)} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"><Pencil className="w-3 h-3" /> Editar</button>
                      <button onClick={() => mutAtivarSala.mutate({ id: sala.id, ativo: !sala.ativo })} className={`flex items-center gap-1 text-xs transition-colors ${sala.ativo ? 'text-gray-600 dark:text-gray-400 hover:text-yellow-600' : 'text-green-600 dark:text-green-400'}`}>
                        <Power className="w-3 h-3" />{sala.ativo ? 'Inativar' : 'Ativar'}
                      </button>
                      <button onClick={() => setConfirmarExclusaoSala(sala.id)} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors ml-auto"><Trash2 className="w-3 h-3" /> Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ABA BLOQUEIOS ──────────────────────────────────────────────────── */}
      {aba === 'bloqueios' && (
        <>
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <select
              value={filtroBloqueioSala}
              onChange={e => setFiltroBloqueioSala(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Todas as salas</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <button onClick={abrirCriarBloqueio} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Novo Bloqueio
            </button>
          </div>

          {carregandoBloqueios ? (
            <div className="text-center py-16 text-gray-400">Carregando bloqueios...</div>
          ) : bloqueiosFiltrados.length === 0 ? (
            <div className="text-center py-16">
              <CalendarX className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhum bloqueio cadastrado.</p>
              <button onClick={abrirCriarBloqueio} className="mt-4 text-orange-500 hover:underline text-sm">Criar primeiro bloqueio</button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sala</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Título</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Período</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {bloqueiosFiltrados.map((b, i) => (
                    <tr key={b.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${i === bloqueiosFiltrados.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: corDaSalaPorId(b.sala_id) }} />
                          <span className="text-gray-900 dark:text-white font-medium">{nomeDaSala(b.sala_id)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-900 dark:text-white">{b.titulo}</span>
                        {b.motivo && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{b.motivo}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatarData(b.data)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.dia_inteiro
                          ? <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">Dia inteiro</span>
                          : <span className="text-gray-600 dark:text-gray-300 text-xs">{b.hora_inicio?.slice(0, 5)} – {b.hora_fim?.slice(0, 5)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => abrirEditarBloqueio(b)} className="text-gray-400 hover:text-orange-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmarExclusaoBloqueio(b.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MODAL SALA ─────────────────────────────────────────────────────── */}
      {modalSala.aberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">{modalSala.sala ? 'Editar Sala' : 'Nova Sala'}</h2>
              <button onClick={fecharModalSala} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input type="text" value={formSala.nome} onChange={e => setFormSala(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Sala 1, Consultório A..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select value={formSala.tipo} onChange={e => setFormSala(f => ({ ...f, tipo: e.target.value as TipoSala }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                  {TIPOS_SALA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <textarea value={formSala.descricao ?? ''} onChange={e => setFormSala(f => ({ ...f, descricao: e.target.value }))} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor de identificação</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {CORES_SALA.map(c => (
                    <button key={c.hex} title={c.label} onClick={() => setFormSala(f => ({ ...f, cor_hex: c.hex }))} className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110" style={{ backgroundColor: c.hex, borderColor: formSala.cor_hex === c.hex ? c.hex : 'transparent', outline: formSala.cor_hex === c.hex ? `3px solid ${c.hex}44` : 'none', outlineOffset: '2px' }}>
                      {formSala.cor_hex === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacidade (pessoas)</label>
                <input type="number" min={1} max={100} value={formSala.capacidade} onChange={e => setFormSala(f => ({ ...f, capacidade: Number(e.target.value) }))} className="w-32 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário de início</label>
                  <input type="time" value={formSala.horario_inicio} onChange={e => setFormSala(f => ({ ...f, horario_inicio: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário de fim</label>
                  <input type="time" value={formSala.horario_fim} onChange={e => setFormSala(f => ({ ...f, horario_fim: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buffer entre sessões (minutos)</label>
                <input type="number" min={0} max={120} step={5} value={formSala.buffer_minutos} onChange={e => setFormSala(f => ({ ...f, buffer_minutos: Number(e.target.value) }))} className="w-32 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <p className="text-xs text-gray-400 mt-1">Tempo para limpeza/preparação entre atendimentos.</p>
              </div>
              {erroSala && <p className="text-sm text-red-600 dark:text-red-400">{erroSala}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={fecharModalSala} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
              <button onClick={salvarSala} disabled={isPendingSala} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {isPendingSala ? 'Salvando...' : modalSala.sala ? 'Salvar alterações' : 'Criar sala'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL BLOQUEIO ─────────────────────────────────────────────────── */}
      {modalBloqueio.aberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">{modalBloqueio.bloqueio ? 'Editar Bloqueio' : 'Novo Bloqueio'}</h2>
              <button onClick={fecharModalBloqueio} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sala *</label>
                <select value={formBloqueio.sala_id} onChange={e => setFormBloqueio(f => ({ ...f, sala_id: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Selecione uma sala</option>
                  {salas.filter(s => s.ativo).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input type="text" value={formBloqueio.titulo} onChange={e => setFormBloqueio(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Manutenção, Limpeza profunda..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo (opcional)</label>
                <textarea value={formBloqueio.motivo ?? ''} onChange={e => setFormBloqueio(f => ({ ...f, motivo: e.target.value }))} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
                <input type="date" value={formBloqueio.data} onChange={e => setFormBloqueio(f => ({ ...f, data: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  <input type="checkbox" checked={formBloqueio.dia_inteiro} onChange={e => setFormBloqueio(f => ({ ...f, dia_inteiro: e.target.checked }))} className="rounded border-gray-300 dark:border-gray-600" />
                  Bloquear o dia inteiro
                </label>
              </div>
              {!formBloqueio.dia_inteiro && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora início</label>
                    <input type="time" value={formBloqueio.hora_inicio ?? ''} onChange={e => setFormBloqueio(f => ({ ...f, hora_inicio: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora fim</label>
                    <input type="time" value={formBloqueio.hora_fim ?? ''} onChange={e => setFormBloqueio(f => ({ ...f, hora_fim: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
              )}
              {erroBloqueio && <p className="text-sm text-red-600 dark:text-red-400">{erroBloqueio}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={fecharModalBloqueio} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
              <button onClick={salvarBloqueio} disabled={isPendingBloqueio} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {isPendingBloqueio ? 'Salvando...' : modalBloqueio.bloqueio ? 'Salvar alterações' : 'Criar bloqueio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAIS DE CONFIRMAÇÃO ───────────────────────────────────────────── */}
      {(confirmarExclusaoSala || confirmarExclusaoBloqueio) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setConfirmarExclusaoSala(null); setConfirmarExclusaoBloqueio(null) }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
              <button
                onClick={() => {
                  if (confirmarExclusaoSala) mutExcluirSala.mutate(confirmarExclusaoSala)
                  if (confirmarExclusaoBloqueio) mutExcluirBloqueio.mutate(confirmarExclusaoBloqueio)
                }}
                disabled={mutExcluirSala.isPending || mutExcluirBloqueio.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {(mutExcluirSala.isPending || mutExcluirBloqueio.isPending) ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
