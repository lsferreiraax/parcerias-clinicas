import { useState } from 'react'
import { FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card, CardHeader, CardBody, Badge, Button, FiltroData, KpiCard } from '@/components/ui'
import { useExtrato } from '@/hooks/useExtrato'
import { fmt } from '@/lib/utils'
import type { TipoProfissional } from '@/services/extrato'
import type { ParceriaId } from '@/types'

const PROFISSIONAIS: { value: TipoProfissional; label: string; color: string }[] = [
  { value: 'camta',  label: 'Camta',  color: 'bg-blue-600' },
  { value: 'medico', label: 'Médico', color: 'bg-green-600' },
  { value: 'psi1',   label: 'Psi1',   color: 'bg-yellow-500' },
  { value: 'psi2',   label: 'Psi2',   color: 'bg-orange-500' },
]

export default function Extrato() {
  const [profissional, setProfissional] = useState<TipoProfissional>('camta')
  const [dataInicio, setDataInicio]     = useState('')
  const [dataFim, setDataFim]           = useState('')

  const filtro = {
    ...(dataInicio ? { dataInicio } : {}),
    ...(dataFim    ? { dataFim }    : {}),
  }
  const filtroAtivo = Object.keys(filtro).length > 0 ? filtro : undefined

  const { data: linhas, isLoading } = useExtrato(profissional, filtroAtivo)

  const total = (linhas ?? []).reduce((s, l) => s + l.valor_profissional, 0)
  const pagas = (linhas ?? []).filter(l => l.status === 'pago').reduce((s, l) => s + l.valor_profissional, 0)

  const profLabel = PROFISSIONAIS.find(p => p.value === profissional)?.label ?? profissional

  const exportar = () => {
    const rows = (linhas ?? []).map(l => ({
      Data:         fmt.data(l.data_atendimento),
      Paciente:     l.paciente,
      Parceria:     `Parceria ${l.parceria_id}`,
      Pagamento:    l.forma_pagamento === 'avista' ? 'À Vista' : 'Parcelado',
      'Valor Total': fmt.moeda(l.valor_total),
      [profLabel]:  fmt.moeda(l.valor_profissional),
      Status:       l.status,
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [12, 24, 12, 12, 16, 16, 12].map(wch => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, `Extrato ${profLabel}`)
    const data = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `extrato-${profissional}-${data}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Extrato por Profissional</h1>
          <p className="text-gray-500 text-sm mt-1">Valores recebidos por atendimento</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <FiltroData
            dataInicio={dataInicio}
            dataFim={dataFim}
            onChangeInicio={setDataInicio}
            onChangeFim={setDataFim}
            onLimpar={() => { setDataInicio(''); setDataFim('') }}
          />
          <Button variant="secondary" onClick={exportar} disabled={!linhas || linhas.length === 0}>
            <FileDown size={16} />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Seletor de profissional */}
      <div className="flex gap-2 flex-wrap">
        {PROFISSIONAIS.map(p => (
          <button
            key={p.value}
            onClick={() => setProfissional(p.value)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              profissional === p.value
                ? `${p.color} text-white shadow`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Atendimentos"  value={linhas?.length ?? '—'}       color="border-l-[#2E75B6]" />
        <KpiCard label="Total a Receber" value={fmt.moeda(total)}          color="border-l-yellow-400" />
        <KpiCard label="Total Pago"    value={fmt.moeda(pagas)}            color="border-l-green-500" />
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[#1F3864]">
            Lançamentos — {profLabel}
            {filtroAtivo && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {dataInicio && fmt.data(dataInicio)} {dataInicio && dataFim && '→'} {dataFim && fmt.data(dataFim)}
              </span>
            )}
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Data', 'Paciente', 'Parceria', 'Pagamento', 'Valor Total', profLabel, 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
                )}
                {!isLoading && (!linhas || linhas.length === 0) && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Nenhum lançamento encontrado</td></tr>
                )}
                {(linhas ?? []).map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{fmt.data(l.data_atendimento)}</td>
                    <td className="px-4 py-3 font-medium">{l.paciente}</td>
                    <td className="px-4 py-3">
                      <Badge variant={l.parceria_id as ParceriaId}>Parceria {l.parceria_id}</Badge>
                    </td>
                    <td className="px-4 py-3">{l.forma_pagamento === 'avista' ? 'À Vista' : 'Parcelado'}</td>
                    <td className="px-4 py-3">{fmt.moeda(l.valor_total)}</td>
                    <td className="px-4 py-3 font-bold text-[#1F3864]">{fmt.moeda(l.valor_profissional)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={l.status === 'pago' ? 'success' : l.status === 'cancelado' ? 'danger' : 'warning'}>
                        {l.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(linhas ?? []).length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={5} className="px-4 py-3 text-right text-gray-500">Total</td>
                    <td className="px-4 py-3 text-[#1F3864]">{fmt.moeda(total)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
