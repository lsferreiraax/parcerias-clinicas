import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { useProfissionais, useSalvarProfissional } from '@/hooks/useConfiguracoes'
import type { Profissional } from '@/types'

const TIPOS = ['camta', 'medico', 'psi1', 'psi2'] as const

export default function GerenciarProfissionais() {
  const { data: profissionais, isLoading } = useProfissionais()
  const salvar = useSalvarProfissional()

  const [editando, setEditando] = useState<Profissional | null>(null)

  const handleSalvar = async () => {
    if (!editando) return
    const { id, ...patch } = editando
    await salvar.mutateAsync({ id, patch })
    setEditando(null)
  }

  if (isLoading) return <p className="text-sm text-gray-400 py-6 text-center">Carregando...</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            {['Nome','Tipo','Status',''].map(h => (
              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(profissionais ?? []).map(p => (
            <tr key={p.id} className="hover:bg-gray-50">
              {editando?.id === p.id ? (
                <>
                  <td className="px-4 py-2">
                    <input value={editando.nome} onChange={e => setEditando({ ...editando, nome: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm" />
                  </td>
                  <td className="px-4 py-2">
                    <select value={editando.tipo}
                      onChange={e => setEditando({ ...editando, tipo: e.target.value as Profissional['tipo'] })}
                      className="border rounded px-2 py-1 text-sm">
                      {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
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
                      <button onClick={() => setEditando(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><X size={15} /></button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{p.tipo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditando({ ...p })}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={15} /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
