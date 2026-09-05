import { useState } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Card, Badge, Button, KpiCard } from '@/components/ui'
import { useParcelas, useMarcarParcelaPaga } from '@/hooks/useResumo'
import { fmt } from '@/lib/utils'
import type { ParceríaId } from '@/types'

export default function Parcelas() {
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const { data: parcelas, isLoading } = useParcelas(filtroStatus ? { status: filtroStatus } : undefined)
  const marcarPaga = useMarcarParcelaPaga()

  const hoje = new Date().toISOString().split('T')[0]
  const vencidas = parcelas?.filter(p => p.status === 'pendente' && p.data_vencimento < hoje) ?? []
  const pendentes = parcelas?.filter(p => p.status === 'pendente') ?? []
  const pagas = parcelas?.filter(p => p.status === 'pago') ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864]">Controle de Parcelas</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhe e baixe parcelas dos atendimentos parcelados</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Pendentes"  value={pendentes.length}  color="border-l-yellow-400" />
        <KpiCard label="Vencidas"   value={vencidas.length}   color="border-l-red-500" />
        <KpiCard label="Pagas"      value={pagas.length}      color="border-l-green-500" />
      </div>

      {/* Alerta vencidas */}
      {vencidas.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span><strong>{vencidas.length}</strong> parcela(s) vencida(s) aguardando baixa.</span>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <div className="px-6 py-4 flex gap-4">
          {['', 'pendente', 'pago', 'vencido'].map(s => (
            <button key={s}
              onClick={() => setFiltroStatus(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filtroStatus === s ? 'bg-[#1F3864] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s === '' ? 'Todas' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Paciente','Parceria','Parcela','Vencimento','Valor','Camta','Médico','Psi1','Psi2','Status','Ação'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
              )}
              {!isLoading && (!parcelas || parcelas.length === 0) && (
                <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-400">Nenhuma parcela encontrada</td></tr>
              )}
              {parcelas?.map(p => {
                const vencida = p.status === 'pendente' && p.data_vencimento < hoje
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${vencida ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium">{p.lancamentos?.paciente}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.lancamentos?.parceria_id as ParceríaId}>
                        Parceria {p.lancamentos?.parceria_id}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{p.parcela_num}/{p.parcela_total}</td>
                    <td className={`px-4 py-3 ${vencida ? 'text-red-600 font-semibold' : ''}`}>
                      {fmt.data(p.data_vencimento)}
                    </td>
                    <td className="px-4 py-3 font-semibold">{fmt.moeda(p.valor_parcela)}</td>
                    <td className="px-4 py-3 text-blue-700">{p.camta_valor > 0 ? fmt.moeda(p.camta_valor) : '—'}</td>
                    <td className="px-4 py-3 text-green-700">{p.medico_valor > 0 ? fmt.moeda(p.medico_valor) : '—'}</td>
                    <td className="px-4 py-3 text-yellow-700">{fmt.moeda(p.psi1_valor)}</td>
                    <td className="px-4 py-3 text-orange-700">{fmt.moeda(p.psi2_valor)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'pago' ? 'success' : vencida ? 'danger' : 'warning'}>
                        {vencida && p.status === 'pendente' ? 'vencida' : p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'pendente' && (
                        <button onClick={() => marcarPaga.mutate(p.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Marcar como pago">
                          <CheckCircle size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
