import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Search, Download, Trash2, CheckCircle, XCircle, Plus } from 'lucide-react'
import { buscarDadosTitular, exportarDadosTitularJSON, anonimizarPaciente } from '@/services/titularDados'
import { registrarConsentimento, revogarConsentimento } from '@/services/consentimentos'
import { useBuscarPacientes } from '@/hooks/usePacientes'
import type { TipoConsentimento } from '@/services/consentimentos'
import type { Paciente } from '@/services/pacientes'

const TIPOS_CONSENTIMENTO: { value: TipoConsentimento; label: string; desc: string }[] = [
  { value: 'prontuario',   label: 'Prontuário',   desc: 'Armazenamento e acesso ao prontuário clínico' },
  { value: 'pesquisa',     label: 'Pesquisa',     desc: 'Uso de dados anonimizados em pesquisas científicas' },
  { value: 'comunicacao',  label: 'Comunicação',  desc: 'Contato via e-mail ou WhatsApp' },
  { value: 'geral',        label: 'Geral',        desc: 'Política de privacidade geral' },
]

function BadgeStatus({ ativo }: { ativo: boolean }) {
  return ativo
    ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"><CheckCircle size={11} />Ativo</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"><XCircle size={11} />Revogado</span>
}

export default function TitularDados() {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [confirmarAnon, setConfirmarAnon] = useState(false)
  const [novoTipo, setNovoTipo] = useState<TipoConsentimento>('prontuario')

  const { data: sugestoes = [] } = useBuscarPacientes(busca)

  const { data: titular, isLoading } = useQuery({
    queryKey: ['titular-dados', paciente?.id],
    queryFn: () => buscarDadosTitular(paciente!.id),
    enabled: !!paciente?.id,
  })

  const addConsentimento = useMutation({
    mutationFn: () => registrarConsentimento({ paciente_id: paciente!.id, tipo: novoTipo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['titular-dados', paciente?.id] }),
  })

  const revogar = useMutation({
    mutationFn: revogarConsentimento,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['titular-dados', paciente?.id] }),
  })

  const anonimizar = useMutation({
    mutationFn: () => anonimizarPaciente(paciente!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['titular-dados', paciente?.id] })
      setConfirmarAnon(false)
      setPaciente(null)
      setBusca('')
    },
  })

  const sugestoesVisiveis = busca.length >= 2 ? sugestoes.slice(0, 8) : []

  const selecionarPaciente = (p: Paciente) => {
    setPaciente(p)
    setBusca(p.nome)
    setMostrarSugestoes(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Shield size={22} className="text-teal-600 dark:text-teal-400" />
          Titular de Dados (LGPD)
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Gerencie consentimentos e consulte o log de acesso conforme Art. 8 e 37 da LGPD
        </p>
      </div>

      {/* Busca de paciente */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Titular</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={e => { setBusca(e.target.value); setMostrarSugestoes(true) }}
            onFocus={() => setMostrarSugestoes(true)}
            placeholder="Buscar paciente por nome..."
            className="w-full pl-9 pr-4 py-2.5 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          {mostrarSugestoes && sugestoesVisiveis.length > 0 && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {sugestoesVisiveis.map(p => (
                <button
                  key={p.id}
                  onMouseDown={() => selecionarPaciente(p)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  {p.nome}
                  {p.cpf && <span className="ml-2 text-xs text-gray-400">CPF: {p.cpf}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-10 text-gray-400 text-sm">Carregando dados do titular...</div>
      )}

      {titular && (
        <>
          {/* Dados pessoais */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">Dados Pessoais</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => exportarDadosTitularJSON(titular)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-600 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                >
                  <Download size={13} />
                  Exportar JSON
                </button>
                {!titular.paciente.anonimizado && (
                  <button
                    onClick={() => setConfirmarAnon(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={13} />
                    Anonimizar
                  </button>
                )}
              </div>
            </div>
            {titular.paciente.anonimizado && (
              <div className="mb-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                Titular anonimizado em {titular.paciente.anonimizado_em ? new Date(titular.paciente.anonimizado_em).toLocaleDateString('pt-BR') : '—'}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Nome', titular.paciente.nome],
                ['CPF', titular.paciente.cpf ?? '—'],
                ['E-mail', titular.paciente.email ?? '—'],
                ['Telefone', titular.paciente.telefone ?? '—'],
                ['Nascimento', titular.paciente.data_nasc ? new Date(titular.paciente.data_nasc + 'T12:00:00').toLocaleDateString('pt-BR') : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-100">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Consentimentos */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">Consentimentos</h2>
              <div className="flex items-center gap-2">
                <select
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value as TipoConsentimento)}
                  className="text-xs border dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                >
                  {TIPOS_CONSENTIMENTO.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => addConsentimento.mutate()}
                  disabled={addConsentimento.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  <Plus size={13} />
                  Registrar
                </button>
              </div>
            </div>

            {titular.consentimentos.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhum consentimento registrado</p>
            ) : (
              <div className="space-y-2">
                {titular.consentimentos.map(c => {
                  const tipoInfo = TIPOS_CONSENTIMENTO.find(t => t.value === c.tipo)
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 border dark:border-gray-700">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{tipoInfo?.label ?? c.tipo} <span className="text-xs text-gray-400">{c.versao}</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{tipoInfo?.desc}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Registrado em {new Date(c.aceito_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {c.revogado_em && ` · Revogado em ${new Date(c.revogado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <BadgeStatus ativo={!c.revogado} />
                        {!c.revogado && (
                          <button
                            onClick={() => revogar.mutate(c.id)}
                            disabled={revogar.isPending}
                            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50"
                          >
                            Revogar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Log de acessos */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Log de Acessos ao Prontuário</h2>
            {titular.acessos.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhum acesso registrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                      <th className="pb-2 pr-4 font-medium">Data/Hora</th>
                      <th className="pb-2 pr-4 font-medium">Usuário</th>
                      <th className="pb-2 font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {titular.acessos.map(a => (
                      <tr key={a.id} className="text-gray-700 dark:text-gray-300">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {new Date(a.acessado_em).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 pr-4 font-mono text-gray-400 text-[11px]">{a.usuario_id.slice(0, 8)}…</td>
                        <td className="py-2 capitalize">{a.acao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal confirmar anonimização */}
      {confirmarAnon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Anonimizar titular?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Os dados pessoais ({paciente?.nome}) serão substituídos por <strong>[Titular Anonimizado]</strong> e não poderão ser recuperados.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded px-3 py-2 mb-5">
              O histórico clínico (prontuários) é mantido de forma dissociada conforme Art. 16 LGPD.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmarAnon(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => anonimizar.mutate()}
                disabled={anonimizar.isPending}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {anonimizar.isPending ? 'Anonimizando...' : 'Confirmar anonimização'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
