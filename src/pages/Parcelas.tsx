import { useState } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Card, Badge, KpiCard, FiltroData } from '@/components/ui'
import { useParcelas, useMarcarParcelaPaga } from '@/hooks/useResumo'
import { fmt } from '@/lib/utils'
import type { ParceriaId } from '@/types'

export default function Parcelas() {
  const [filtroStatus, setFiltroStatus] = useState('')
  const [dataInicio, setDataInicio]     = useState('')
  const [dataFim, setDataFim]           = useState('')

  const filtros = {
    ...(filtroStatus ? { status: filtroStatus } : {}),
    ...(dataInicio   ? { dataInicio }           : {}),
    ...(dataFim      ? { dataFim }              : {}),
  }
  const { data: parcelas, isLoading } = useParcelas(Object.keys(filtros).length ? filtros : undefined)
  const marcarPaga = useMarcarParcelaPaga()

  const hoje      = new Date().toISOString().split('T')[0]
  const lista     = parcelas ?? []
  const vencidas  = lista.filter(p => p.status === 'pendente' && p.data_vencimento < hoje)
  const pendentes = lista.filter(p => p.status === 'pendente')
  const pagas     = lista.filter(p => p.status === 'pago')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864]">Controle de Parcelas</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhe e baixe parcelas dos atendimentos parcelados</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Pendentes" value={pendentes.length} color="border-l-yellow-400" />
        <KpiCard label="Vencidas"  value={vencidas.length}  color="border-l-red-500" />
        <KpiCard label="Pagas"     value={pagas.length}     color="border-l-green-500" />
      </div>

      {vencidas.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span><strong>{vencidas.length}</strong> parcela(s) vencida(s) aguardando baixa.</span>
        </div>
      )}

      <Card>
        <div className="px-6 py-4 flex gap-3 flex-wrap items-center">
          {[
            { val: '',         label: 'Todas' },
            { val: 'pendente', label: 'Pendente' },
            { val: 'pago',     label: 'Pago' },
            { val: 'vencido',  label: 'Vencido' },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => setFiltroStatus(val)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filtroStatus === val
                  ? 'bg-[#1F3864] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {label}
            </button>
          ))}
          <div className="h-5 border-l border-gray-200" />
          <FiltroData
            dataInicio={dataInicio}
            dataFim={dataFim}
            onChangeInicio={setDataInicio}
            onChangeFim={setDataFim}
            onLimpar={() => { setDataInicio(''); setDataFim('') }}
          />
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
              {!isLoading && lista.length === 0 && (
                <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-400">Nenhuma parcela encontrada</td></tr>
              )}
              {lista.map(p => {
                const vencida = p.status === 'pendente' && p.data_vencimento < hoje
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${vencida ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium">{p.lancamentos?.paciente ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={(p.lancamentos?.parceria_id ?? 'A') as ParceriaId}>
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
                        <button
                          onClick={() => marcarPaga.mutate(p.id)}
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
