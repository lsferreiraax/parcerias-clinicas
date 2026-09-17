import { useState } from 'react'
import { UserPlus, Search, Edit2, UserX, ChevronDown, ChevronUp } from 'lucide-react'
import { usePacientes, useCriarPaciente, useAtualizarPaciente, useDesativarPaciente } from '@/hooks/usePacientes'
import { Paciente, NovoPaciente, formatarCPF, formatarTelefone } from '@/services/pacientes'

const VAZIO: NovoPaciente = { nome: '', cpf: '', telefone: '', email: '', data_nasc: '', observacao: '' }

export default function Pacientes() {
  const [busca, setBusca] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Paciente | null>(null)
  const [form, setForm] = useState<NovoPaciente>(VAZIO)
  const [confirmarId, setConfirmarId] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  const { data: pacientes = [], isLoading } = usePacientes(!mostrarInativos)
  const criar = useCriarPaciente()
  const atualizar = useAtualizarPaciente()
  const desativar = useDesativarPaciente()

  const lista = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.cpf ?? '').includes(busca) ||
    (p.telefone ?? '').includes(busca)
  )

  function abrirNovo() {
    setEditando(null)
    setForm(VAZIO)
    setModalAberto(true)
  }

  function abrirEdicao(p: Paciente) {
    setEditando(p)
    setForm({
      nome: p.nome,
      cpf: p.cpf ?? '',
      telefone: p.telefone ?? '',
      email: p.email ?? '',
      data_nasc: p.data_nasc ?? '',
      observacao: p.observacao ?? '',
    })
    setModalAberto(true)
  }

  async function salvar() {
    const dados: NovoPaciente = {
      ...form,
      cpf: form.cpf?.replace(/\D/g, '') || undefined,
      telefone: form.telefone?.replace(/\D/g, '') || undefined,
      data_nasc: form.data_nasc || undefined,
      observacao: form.observacao || undefined,
    }
    if (editando) {
      await atualizar.mutateAsync({ id: editando.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    setModalAberto(false)
  }

  async function confirmarDesativar() {
    if (!confirmarId) return
    await desativar.mutateAsync(confirmarId)
    setConfirmarId(null)
  }

  const salvando = criar.isPending || atualizar.isPending

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Pacientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lista.length} {lista.length === 1 ? 'paciente' : 'pacientes'} encontrados
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <UserPlus size={16} />
          Novo Paciente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={e => setMostrarInativos(e.target.checked)}
            className="rounded"
          />
          Mostrar inativos
        </label>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {busca ? 'Nenhum paciente encontrado para a busca.' : 'Nenhum paciente cadastrado.'}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {lista.map(p => (
            <div key={p.id}>
              <div className="flex items-center gap-4 px-4 py-3">
                {/* Avatar inicial */}
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-sm flex-shrink-0">
                  {p.nome.charAt(0).toUpperCase()}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{p.nome}</span>
                    {!p.ativo && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">Inativo</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    {p.cpf && <span>{formatarCPF(p.cpf)}</span>}
                    {p.telefone && <span>{formatarTelefone(p.telefone)}</span>}
                    {p.email && <span className="truncate">{p.email}</span>}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                    title="Ver detalhes"
                  >
                    {expandido === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    onClick={() => abrirEdicao(p)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  {p.ativo && (
                    <button
                      onClick={() => setConfirmarId(p.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                      title="Desativar"
                    >
                      <UserX size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Expansão */}
              {expandido === p.id && (
                <div className="px-4 pb-3 ml-13 pl-14 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-50 dark:border-gray-700/50 pt-2">
                  {p.data_nasc && (
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">Nascimento: </span>
                      {new Date(p.data_nasc + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                  )}
                  {p.observacao && (
                    <div className="col-span-2"><span className="font-medium text-gray-700 dark:text-gray-300">Observação: </span>{p.observacao}</div>
                  )}
                  <div className="col-span-2 text-xs text-gray-400 mt-1">
                    Cadastrado em {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal cadastro / edição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editando ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nome do paciente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF</label>
                <input
                  value={form.cpf}
                  onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de nascimento</label>
                <input
                  type="date"
                  value={form.data_nasc}
                  onChange={e => setForm(f => ({ ...f, data_nasc: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Informações adicionais sobre o paciente..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!form.nome.trim() || salvando}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar desativação */}
      {confirmarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Desativar paciente?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              O paciente será desativado e não aparecerá mais nas listagens. O histórico de sessões é preservado.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmarId(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancelar</button>
              <button
                onClick={confirmarDesativar}
                disabled={desativar.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {desativar.isPending ? 'Desativando...' : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
