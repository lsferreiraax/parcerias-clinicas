import { useState, useEffect } from 'react'
import { FileDown, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
} from 'recharts'
import { Card, CardHeader, CardBody, Badge, Button, FiltroData, KpiCard } from '@/components/ui'
import { useExtrato, useExtratoMensal } from '@/hooks/useExtrato'
import { usePerfil } from '@/contexts/PerfilContext'
import { fmt } from '@/lib/utils'
import { gerarComprovante } from '@/services/relatorio'
import type { TipoProfissional } from '@/services/extrato'
import type { ParceriaId } from '@/types'

const PROFISSIONAIS: { value: TipoProfissional; label: string; color: string }[] = [
  { value: 'camta',  label: 'Camta',  color: 'bg-blue-600' },
  { value: 'medico', label: 'Médico', color: 'bg-green-600' },
  { value: 'psi1',   label: 'Psi1',   color: 'bg-yellow-500' },
  { value: 'psi2',   label: 'Psi2',   color: 'bg-orange-500' },
]

export default function Extrato() {
  const { isProfissional, perfil }      = usePerfil()
  const [profissional, setProfissional] = useState<TipoProfissional>('camta')
  const [dataInicio, setDataInicio]     = useState('')
  const [dataFim, setDataFim]           = useState('')

  // Se for perfil Profissional, trava no seu próprio tipo
  useEffect(() => {
    if (isProfissional && perfil?.tipo_profissional) {
      setProfissional(perfil.tipo_profissional)
    }
  }, [isProfissional, perfil])

  const filtro = {
    ...(dataInicio ? { dataInicio } : {}),
    ...(dataFim    ? { dataFim }    : {}),
  }
  const filtroAtivo = Object.keys(filtro).length > 0 ? filtro : undefined

  const { data: linhas, isLoading } = useExtrato(profissional, filtroAtivo)

  const total = (linhas ?? []).reduce((s, l) => s + l.valor_profissional, 0)
  const pagas = (linhas ?? []).filter(l => l.status === 'pago').reduce((s, l) => s + l.valor_profissional, 0)

  const profLabel   = PROFISSIONAIS.find(p => p.value === profissional)?.label ?? profissional
  const usuarioNome = perfil?.nome ?? 'Usuário'
  const profColor   = PROFISSIONAIS.find(p => p.value === profissional)?.color ?? 'bg-blue-600'
  const lineColor   = profColor.replace('bg-', '').replace('-600', '').replace('-500', '')
  const CORES: Record<string, string> = {
    blue: '#2563eb', green: '#16a34a', yellow: '#ca8a04', orange: '#ea580c',
  }
  const cor = CORES[lineColor] ?? '#1F3864'

  const { data: mensal } = useExtratoMensal(profissional)

  const mediaMensal = mensal && mensal.some(p => p.valor > 0)
    ? mensal.filter(p => p.valor > 0).reduce((s, p) => s + p.valor, 0) /
      mensal.filter(p => p.valor > 0).length
    : 0
  const melhorMes = mensal ? mensal.reduce((m, p) => p.valor > m.valor ? p : m, mensal[0]) : null

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

      {/* Seletor de profissional — oculto para perfil Profissional */}
      {!isProfissional && (
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
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Atendimentos"  value={linhas?.length ?? '—'}       color="border-l-[#2E75B6]" />
        <KpiCard label="Total a Receber" value={fmt.moeda(total)}          color="border-l-yellow-400" />
        <KpiCard label="Total Pago"    value={fmt.moeda(pagas)}            color="border-l-green-500" />
      </div>

      {/* Gráfico de evolução mensal */}
      {mensal && mensal.some(p => p.valor > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-[#1F3864]">Evolução Mensal — {profLabel}</h2>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>Média: <strong className="text-gray-700">{fmt.moeda(mediaMensal)}</strong></span>
                {melhorMes && melhorMes.valor > 0 && (
                  <span>Melhor mês: <strong className="text-gray-700">{melhorMes.mes} ({fmt.moeda(melhorMes.valor)})</strong></span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mensal} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v === 0 ? '' : `R$${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip
                  formatter={(v: number) => [fmt.moeda(v), profLabel]}
                  labelStyle={{ fontWeight: 600, color: '#1f2937' }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <ReferenceLine y={mediaMensal} stroke="#9ca3af" strokeDasharray="4 2" />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke={cor}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: cor, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

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
                  {['Data', 'Paciente', 'Parceria', 'Pagamento', 'Valor Total', profLabel, 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
                )}
                {!isLoading && (!linhas || linhas.length === 0) && (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Nenhum lançamento encontrado</td></tr>
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => gerarComprovante(l, profissional, usuarioNome)}
                        title="Gerar comprovante PDF"
                        className="flex items-center gap-1 text-xs text-[#2E75B6] hover:text-[#1F3864] font-medium transition-colors"
                      >
                        <FileText size={14} />
                        Comprovante
                      </button>
                    </td>
                  </tr>
                ))}
                {(linhas ?? []).length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={5} className="px-4 py-3 text-right text-gray-500">Total</td>
                    <td className="px-4 py-3 text-[#1F3864]">{fmt.moeda(total)}</td>
                    <td /><td />
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
