import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardHeader, CardBody, Badge } from '@/components/ui'
import { useResumoParceria, useResumoProfissional } from '@/hooks/useResumo'
import { fmt } from '@/lib/utils'
import type { ParceriaId } from '@/types'

const PROF_LABELS: Record<string, string> = {
  camta: 'Camta', medico: 'Médico', psi1: 'Psi1', psi2: 'Psi2'
}
const PROF_COLORS: Record<string, string> = {
  camta: 'text-blue-700', medico: 'text-green-700', psi1: 'text-yellow-700', psi2: 'text-orange-700'
}

export default function Resumo() {
  const { data: parceria }     = useResumoParceria()
  const { data: profissional } = useResumoProfissional()

  const totalGeral = profissional?.reduce((s, p) => s + Number(p.total), 0) ?? 0

  const dadosBarras = parceria?.map(r => ({
    name: `Parceria ${r.parceria}`,
    Camta: r.camta_total,
    Médico: r.medico_total,
    Psi1: r.psi1_total,
    Psi2: r.psi2_total,
  })) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864]">Resumo Financeiro</h1>
        <p className="text-gray-500 text-sm mt-1">Consolidado de rateio por parceria e profissional</p>
      </div>

      {/* Por Parceria */}
      <div className="grid gap-4">
        {parceria?.map(r => (
          <Card key={r.parceria}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={r.parceria as ParceriaId}>Parceria {r.parceria}</Badge>
                  <span className="text-sm text-gray-500">{r.descricao}</span>
                </div>
                <span className="text-sm text-gray-500">{r.total_atendimentos} atendimento(s)</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Valor Total', value: r.valor_total, color: 'text-gray-800' },
                  { label: 'Camta',       value: r.camta_total,  color: 'text-blue-700' },
                  { label: 'Médico',      value: r.medico_total, color: 'text-green-700' },
                  { label: 'Psi1',        value: r.psi1_total,   color: 'text-yellow-700' },
                  { label: 'Psi2',        value: r.psi2_total,   color: 'text-orange-700' },
                ].filter(item => item.value > 0 || item.label === 'Valor Total').map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color}`}>{fmt.moeda(Number(item.value))}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Consolidado por profissional */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="font-semibold text-[#1F3864]">Consolidado por Profissional</h2></CardHeader>
          <CardBody className="space-y-3">
            {profissional?.map(p => (
              <div key={p.profissional} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${PROF_COLORS[p.profissional] ?? ''}`}>
                    {PROF_LABELS[p.profissional] ?? p.profissional}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#2E75B6] h-2 rounded-full"
                      style={{ width: totalGeral > 0 ? `${(Number(p.total) / totalGeral) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="font-bold text-gray-800 w-28 text-right">{fmt.moeda(Number(p.total))}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {totalGeral > 0 ? ((Number(p.total) / totalGeral) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
              </div>
            ))}
            <div className="border-t pt-3 flex justify-between font-bold">
              <span>Total Geral</span>
              <span className="text-[#1F3864]">{fmt.moeda(totalGeral)}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-[#1F3864]">Comparativo por Parceria</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dadosBarras} margin={{ top: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt.moeda(v)} />
                <Legend />
                <Bar dataKey="Camta"  fill="#1F3864" radius={[3,3,0,0]} />
                <Bar dataKey="Médico" fill="#2E75B6" radius={[3,3,0,0]} />
                <Bar dataKey="Psi1"   fill="#27AE60" radius={[3,3,0,0]} />
                <Bar dataKey="Psi2"   fill="#E67E22" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
