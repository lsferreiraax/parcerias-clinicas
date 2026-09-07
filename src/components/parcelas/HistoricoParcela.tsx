import { X, Clock } from 'lucide-react'
import { useHistoricoParcela } from '@/hooks/useResumo'

const CAMPO_LABEL: Record<string, string> = {
  status:          'Status',
  data_vencimento: 'Data de Vencimento',
}

interface Props {
  parcelaId: string
  paciente: string
  onFechar: () => void
}

export default function HistoricoParcela({ parcelaId, paciente, onFechar }: Props) {
  const { data: historico, isLoading } = useHistoricoParcela(parcelaId)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-[#1F3864]">Histórico de Alterações</h2>
            <p className="text-sm text-gray-500">{paciente}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {isLoading && <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>}

          {!isLoading && (!historico || historico.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma alteração registrada</p>
          )}

          {(historico ?? []).length > 0 && (
            <ol className="relative border-l border-gray-200 space-y-6 ml-3">
              {(historico ?? []).map(h => (
                <li key={h.id} className="ml-5">
                  <span className="absolute -left-2.5 w-5 h-5 rounded-full bg-[#2E75B6] flex items-center justify-center">
                    <Clock size={11} className="text-white" />
                  </span>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-xs text-gray-500">
                      {new Date(h.alterado_em).toLocaleString('pt-BR')}
                      {h.user_profiles?.nome && (
                        <span className="ml-2 font-medium text-gray-600">· {h.user_profiles.nome}</span>
                      )}
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                      {CAMPO_LABEL[h.campo_alterado] ?? h.campo_alterado}
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className="line-through text-red-500 mr-2">{h.valor_anterior ?? '—'}</span>
                      <span className="text-green-600 font-medium">{h.valor_novo ?? '—'}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
