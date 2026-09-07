import { fmt } from '@/lib/utils'

interface Props {
  ids: string[]
  valorTotal: number
  onConfirmar: () => void
  onCancelar: () => void
  loading: boolean
}

export default function BaixaEmLote({ ids, valorTotal, onConfirmar, onCancelar, loading }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        <h2 className="text-lg font-bold text-[#1F3864]">Confirmar Baixa em Lote</h2>

        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 space-y-1">
          <p className="text-sm text-green-800">
            <span className="font-bold">{ids.length}</span> parcela(s) serão marcadas como pagas com a data de hoje.
          </p>
          <p className="text-sm text-green-700 font-semibold">
            Valor total: {fmt.moeda(valorTotal)}
          </p>
        </div>

        <p className="text-sm text-gray-500">Esta ação não pode ser desfeita diretamente. Verifique antes de confirmar.</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancelar}
            disabled={loading}
            className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 border hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={loading}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar Baixa'}
          </button>
        </div>
      </div>
    </div>
  )
}
