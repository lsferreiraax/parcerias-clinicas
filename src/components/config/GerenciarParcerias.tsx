import { useState } from 'react'
import { Pencil, Plus, Check, X } from 'lucide-react'
import { useParcerias, useSalvarParceria, useCriarParceria } from '@/hooks/useConfiguracoes'
import type { ParceriaCompleta } from '@/types'

type Editando = Partial<ParceriaCompleta> & { id: string }

function validar(p: Partial<ParceriaCompleta>) {
  const soma = (p.camta_pct ?? 0) + (p.medico_pct ?? 0) + (p.psi1_pct ?? 0) + (p.psi2_pct ?? 0)
  if (soma > 100) return 'A soma dos percentuais não pode ultrapassar 100%'
  if ([p.camta_pct, p.medico_pct, p.psi1_pct, p.psi2_pct].some(v => (v ?? 0) < 0))
    return 'Percentuais não podem ser negativos'
  return null
}

export default function GerenciarParcerias() {
  const { data: parcerias, isLoading } = useParcerias()
  const salvar  = useSalvarParceria()
  const criar   = useCriarParceria()

  const [editando, setEditando]   = useState<Editando | null>(null)
  const [novaModal, setNovaModal] = useState(false)
  const [nova, setNova]           = useState<Omit<ParceriaCompleta, 'ativo'>>({
    id: '', descricao: '', camta_pct: 0, medico_pct: 0, psi1_pct: 0, psi2_pct: 0
  })
  const [erro, setErro] = useState<string | null>(null)

  const handleSalvar = async () => {
    if (!editando) return
    const e = validar(editando)
    if (e) { setErro(e); return }
    setErro(null)
    const { id, ...patch } = editando
    await salvar.mutateAsync({ id, patch })
    setEditando(null)
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
        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
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

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {['ID','Descrição','Camta%','Médico%','Psi1%','Psi2%','Status',''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(parcerias ?? []).map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                {editando?.id === p.id ? (
                  <>
                    <td className="px-4 py-2 font-bold">{p.id}</td>
                    <td className="px-4 py-2">
                      <input value={editando.descricao ?? ''} onChange={e => setEditando({ ...editando, descricao: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm" />
                    </td>
                    {(['camta_pct','medico_pct','psi1_pct','psi2_pct'] as const).map(k => (
                      <td key={k} className="px-4 py-2">
                        <input type="number" min={0} max={100} step={0.01}
                          value={editando[k] ?? 0}
                          onChange={e => setEditando({ ...editando, [k]: Number(e.target.value) })}
                          className="w-20 border rounded px-2 py-1 text-sm" />
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <select value={editando.ativo ? 'true' : 'false'}
                        onChange={e => setEditando({ ...editando, ativo: e.target.value === 'true' })}
                        className="border rounded px-2 py-1 text-sm">
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={handleSalvar} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={15} /></button>
                        <button onClick={() => { setEditando(null); setErro(null) }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><X size={15} /></button>
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
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditando({ ...p }); setErro(null) }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={15} /></button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#1F3864]">Nova Parceria</h2>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <form onSubmit={handleCriar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">ID (ex: D)</label>
                  <input required value={nova.id} onChange={e => setNova({ ...nova, id: e.target.value.toUpperCase() })}
                    maxLength={1} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Descrição</label>
                  <input required value={nova.descricao} onChange={e => setNova({ ...nova, descricao: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
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
                  className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={criar.isPending}
                  className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2E75B6] disabled:opacity-50">
                  {criar.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
