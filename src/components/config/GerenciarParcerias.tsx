import { useState } from 'react'
import { Pencil, Plus, Check, X, AlertTriangle, History } from 'lucide-react'
import { useParcerias, useSalvarParceria, useCriarParceria, useLogParceria } from '@/hooks/useConfiguracoes'
import { validarRateio } from '@/services/rateio'
import type { ParceriaCompleta } from '@/types'

type Editando = Partial<ParceriaCompleta> & { id: string }

const CAMPO_LABEL: Record<string, string> = {
  descricao:    'Descrição',
  camta_pct:    'Camta %',
  medico_pct:   'Médico %',
  psi1_pct:     'Psi1 %',
  psi2_pct:     'Psi2 %',
  ativo:        'Status',
  meta_mensal:  'Meta Mensal',
}

function somaPct(p: Partial<ParceriaCompleta>) {
  return (p.camta_pct ?? 0) + (p.medico_pct ?? 0) + (p.psi1_pct ?? 0) + (p.psi2_pct ?? 0)
}

function validar(p: Partial<ParceriaCompleta>) {
  const soma = somaPct(p)
  if (soma > 100) return 'A soma dos percentuais não pode ultrapassar 100%'
  if ([p.camta_pct, p.medico_pct, p.psi1_pct, p.psi2_pct].some(v => (v ?? 0) < 0))
    return 'Percentuais não podem ser negativos'
  return null
}

function BadgeSoma({ p }: { p: ParceriaCompleta }) {
  const { ok, soma } = validarRateio({ camta_pct: p.camta_pct, medico_pct: p.medico_pct, psi1_pct: p.psi1_pct, psi2_pct: p.psi2_pct })
  const somaDisplay = soma.toFixed(2)
  if (ok) return <span className="text-xs text-green-600 font-medium">✓ {somaDisplay}%</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium" title="Os percentuais não somam 100%. Novos lançamentos terão rateio incorreto.">
      <AlertTriangle size={12} /> {somaDisplay}%
    </span>
  )
}

function ModalHistorico({ parceriaId, onClose }: { parceriaId: string; onClose: () => void }) {
  const { data: logs, isLoading } = useLogParceria(parceriaId)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1F3864] dark:text-blue-300">
            Histórico — Parceria {parceriaId}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500">
            <X size={18} />
          </button>
        </div>

        {isLoading && <p className="text-sm text-gray-400 py-4 text-center">Carregando...</p>}
        {!isLoading && (!logs || logs.length === 0) && (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhuma alteração registrada.</p>
        )}

        <div className="space-y-2">
          {(logs ?? []).map(log => (
            <div key={log.id} className="border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {CAMPO_LABEL[log.campo_alterado] ?? log.campo_alterado}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(log.alterado_em).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                <span className="line-through text-red-400">{log.valor_anterior ?? '—'}</span>
                {' → '}
                <span className="text-green-600 font-medium">{log.valor_novo ?? '—'}</span>
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

export default function GerenciarParcerias() {
  const { data: parcerias, isLoading } = useParcerias()
  const salvar  = useSalvarParceria()
  const criar   = useCriarParceria()

  const [editando, setEditando]     = useState<Editando | null>(null)
  const [original, setOriginal]     = useState<ParceriaCompleta | null>(null)
  const [novaModal, setNovaModal]   = useState(false)
  const [historico, setHistorico]   = useState<string | null>(null)
  const [nova, setNova]             = useState<Omit<ParceriaCompleta, 'ativo'>>({
    id: '', descricao: '', camta_pct: 0, medico_pct: 0, psi1_pct: 0, psi2_pct: 0
  })
  const [erro, setErro] = useState<string | null>(null)

  const handleSalvar = async () => {
    if (!editando) return
    const e = validar(editando)
    if (e) { setErro(e); return }
    setErro(null)
    const { id, ...patch } = editando
    await salvar.mutateAsync({ id, patch, original: original ?? undefined })
    setEditando(null)
    setOriginal(null)
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validar(nova)
    if (err) { setErro(err); return }
    setErro(null)
    await criar.mutateAsync(nova)
    setNovaModal(false)
    setNova({ id: '', descricao: '', camta_pct: 0, medico_pct: 0, psi1_pct: 0, psi2_pct: 0 })
  }

  const pctInput = (label: string, val: number, onChange: (v: number) => void) => (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">{label} (%)</label>
      <input
        type="number" min={0} max={100} step={0.01}
        value={val}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864] dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
      />
    </div>
  )

  if (isLoading) return <p className="text-sm text-gray-400 py-6 text-center">Carregando...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setNovaModal(true); setErro(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1F3864] text-white text-sm font-medium rounded-lg hover:bg-[#2E75B6]"
        >
          <Plus size={15} /> Nova Parceria
        </button>
      </div>

      {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{erro}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              {['ID','Descrição','Camta%','Médico%','Psi1%','Psi2%','Soma','Meta/mês','Status',''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {(parcerias ?? []).map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:text-gray-200">
                {editando?.id === p.id ? (
                  <>
                    <td className="px-4 py-2 font-bold">{p.id}</td>
                    <td className="px-4 py-2">
                      <input value={editando.descricao ?? ''} onChange={e => setEditando({ ...editando, descricao: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                    </td>
                    {(['camta_pct','medico_pct','psi1_pct','psi2_pct'] as const).map(k => (
                      <td key={k} className="px-4 py-2">
                        <input type="number" min={0} max={100} step={0.01}
                          value={editando[k] ?? 0}
                          onChange={e => setEditando({ ...editando, [k]: Number(e.target.value) })}
                          className="w-20 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {(() => {
                        const s = somaPct(editando)
                        const ok = Math.abs(s - 100) <= 0.1
                        return (
                          <span className={ok ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {s.toFixed(2)}%{!ok && ' ⚠'}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} step={100}
                        value={editando.meta_mensal ?? 0}
                        onChange={e => setEditando({ ...editando, meta_mensal: Number(e.target.value) })}
                        className="w-28 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select value={editando.ativo ? 'true' : 'false'}
                        onChange={e => setEditando({ ...editando, ativo: e.target.value === 'true' })}
                        className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={handleSalvar} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={15} /></button>
                        <button onClick={() => { setEditando(null); setOriginal(null); setErro(null) }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><X size={15} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-bold">{p.id}</td>
                    <td className="px-4 py-3">{p.descricao}</td>
                    <td className="px-4 py-3">{p.camta_pct}%</td>
                    <td className="px-4 py-3">{p.medico_pct}%</td>
                    <td className="px-4 py-3">{p.psi1_pct}%</td>
                    <td className="px-4 py-3">{p.psi2_pct}%</td>
                    <td className="px-4 py-3"><BadgeSoma p={p} /></td>
                    <td className="px-4 py-3 text-sm font-medium text-[#1F3864] dark:text-blue-300">
                      {p.meta_mensal ? `R$ ${Number(p.meta_mensal).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditando({ ...p }); setOriginal({ ...p }); setErro(null) }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setHistorico(p.id)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                          title="Histórico de alterações"
                        >
                          <History size={15} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nova parceria */}
      {novaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#1F3864] dark:text-blue-300">Nova Parceria</h2>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <form onSubmit={handleCriar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">ID (ex: D)</label>
                  <input required value={nova.id} onChange={e => setNova({ ...nova, id: e.target.value.toUpperCase() })}
                    maxLength={1} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Descrição</label>
                  <input required value={nova.descricao} onChange={e => setNova({ ...nova, descricao: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {pctInput('Camta', nova.camta_pct, v => setNova({ ...nova, camta_pct: v }))}
                {pctInput('Médico', nova.medico_pct, v => setNova({ ...nova, medico_pct: v }))}
                {pctInput('Psi1', nova.psi1_pct, v => setNova({ ...nova, psi1_pct: v }))}
                {pctInput('Psi2', nova.psi2_pct, v => setNova({ ...nova, psi2_pct: v }))}
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setNovaModal(false); setErro(null) }}
                  className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancelar</button>
                <button type="submit" disabled={criar.isPending}
                  className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2E75B6] disabled:opacity-50">
                  {criar.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal histórico de alterações */}
      {historico && <ModalHistorico parceriaId={historico} onClose={() => setHistorico(null)} />}
    </div>
  )
}
