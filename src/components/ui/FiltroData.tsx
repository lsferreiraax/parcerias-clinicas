import { X } from 'lucide-react'

interface FiltroDataProps {
  dataInicio: string
  dataFim: string
  onChangeInicio: (v: string) => void
  onChangeFim: (v: string) => void
  onLimpar: () => void
}

export function FiltroData({ dataInicio, dataFim, onChangeInicio, onChangeFim, onLimpar }: FiltroDataProps) {
  const ativo = dataInicio || dataFim

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500 whitespace-nowrap">De</label>
        <input
          type="date"
          value={dataInicio}
          onChange={e => onChangeInicio(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500 whitespace-nowrap">até</label>
        <input
          type="date"
          value={dataFim}
          onChange={e => onChangeFim(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {ativo && (
        <button
          onClick={onLimpar}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
          title="Limpar filtro de data"
        >
          <X size={13} />
          Limpar
        </button>
      )}
    </div>
  )
}
