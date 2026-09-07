import { useState } from 'react'
import { X } from 'lucide-react'
import { useRenegociarParcela } from '@/hooks/useResumo'
import { fmt } from '@/lib/utils'

interface Props {
  parcela: { id: string; data_vencimento: string; valor_parcela: number }
  paciente: string
  onFechar: () => void
}

export default function RenegociarParcela({ parcela, paciente, onFechar }: Props) {
  const [novaData, setNovaData]       = useState('')
  const [observacoes, setObservacoes] = useState('')
  const renegociar = useRenegociarParcela()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaData || !observacoes.trim()) return
    await renegociar.mutateAsync({ id: parcela.id, novaData, observacoes })
    onFechar()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1F3864]">Renegociar Parcela</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-0.5">
          <p><strong>Paciente:</strong> {paciente}</p>
          <p><strong>Vencimento atual:</strong> {fmt.data(parcela.data_vencimento)}</p>
          <p><strong>Valor:</strong> {fmt.moeda(parcela.valor_parcela)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova data de vencimento *</label>
            <input
              type="date"
              required
              value={novaData}
              onChange={e => setNovaData(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da renegociação *</label>
            <textarea
              required
              rows={3}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Descreva o motivo..."
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onFechar}
              className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 border hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={renegociar.isPending || !novaData || !observacoes.trim()}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {renegociar.isPending ? 'Salvando...' : 'Confirmar Renegociação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
