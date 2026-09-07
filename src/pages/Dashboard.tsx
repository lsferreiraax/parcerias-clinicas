import { useState } from 'react'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { KpiCard, Card, CardHeader, CardBody } from '@/components/ui'
import { useKPIs } from '@/hooks/useResumo'
import { useReceitaMensal, useInadimplenciaMensal, useKpiComparativo, useRankingProfissionais } from '@/hooks/useDashboard'
import { fmt } from '@/lib/utils'

const PROF_CORES: Record<string, string> = {
  camta: '#1F3864', medico: '#2E75B6', psi1: '#27AE60', psi2: '#E67E22'
}

function variacao(atual: number, anterior: number) {
  if (anterior === 0) return null
  return ((atual - anterior) / anterior) * 100
}

function BadgeVariacao({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const positivo = pct >= 0
  const Icon = pct === 0 ? Minus : positivo ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      positivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      <Icon size={11} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// Seletor de mês/ano para o ranking
function SeletorMes({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const meses = Array.from({ length: 12 }, (_, i) => subMonths(new Date(), i))
  return (
    <select
      value={format(value, 'yyyy-MM')}
      onChange={e => {
        const [y, m] = e.target.value.split('-').map(Number)
        onChange(new Date(y, m - 1, 1))
      }}
      className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
    >
      {meses.map(d => (
        <option key={format(d, 'yyyy-MM')} value={format(d, 'yyyy-MM')}>
          {format(d, 'MMMM/yyyy', { locale: ptBR })}
        </option>
      ))}
    </select>
  )
}

export default function Dashboard() {
  const [mesSelecionado, setMesSelecionado] = useState(new Date())

  const { data: kpis }           = useKPIs()
  const { data: receitaMensal }  = useReceitaMensal()
  const { data: inadimplencia }  = useInadimplenciaMensal()
  const { data: kpiComp }        = useKpiComparativo()
  const { data: ranking }        = useRankingProfissionais(mesSelecionado)

  const varReceita = variacao(kpiComp?.receitaMes ?? 0, kpiComp?.receitaMesAnterior ?? 0)
  const varTicket  = variacao(kpiComp?.ticketMedio ?? 0, kpiComp?.ticketMedioAnterior ?? 0)

  const mesLabel = format(mesSelecionado, 'MMMM/yyyy', { locale: ptBR })
  const iniMes   = format(startOfMonth(mesSelecionado), 'dd/MM')
  const fimMes   = format(endOfMonth(mesSelecionado), 'dd/MM/yyyy')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864]">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral das parcerias clínicas</p>
      </div>

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Atendimentos" value={kpis?.totalAtendimentos ?? 0}          color="border-l-[#1F3864]" />
        <KpiCard label="Receita Total"      value={fmt.moeda(kpis?.receitaTotal ?? 0)}    color="border-l-[#2E75B6]" />
        <KpiCard label="Receita Recebida"   value={fmt.moeda(kpis?.receitaPaga ?? 0)}     color="border-l-green-500" />
        <KpiCard label="Parcelas Vencidas"  value={kpis?.parcelasVencidas ?? 0} sub="pendentes" color="border-l-red-400" />
      </div>

      {/* KPIs comparativos do mês atual */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Receita do Mês</p>
            <p className="text-xl font-bold text-[#1F3864]">{fmt.moeda(kpiComp?.receitaMes ?? 0)}</p>
            <div className="flex items-center gap-2">
              <BadgeVariacao pct={varReceita} />
              <span className="text-xs text-gray-400">vs mês anterior</span>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Ticket Médio</p>
            <p className="text-xl font-bold text-[#1F3864]">{fmt.moeda(kpiComp?.ticketMedio ?? 0)}</p>
            <div className="flex items-center gap-2">
              <BadgeVariacao pct={varTicket} />
              <span className="text-xs text-gray-400">vs mês anterior</span>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Atendimentos/Mês</p>
            <p className="text-xl font-bold text-[#1F3864]">{kpiComp?.atendimentosMes ?? 0}</p>
            <p className="text-xs text-gray-400">mês atual</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Em Aberto (vencidas)</p>
            <p className="text-xl font-bold text-red-600">{fmt.moeda(kpiComp?.valorEmAberto ?? 0)}</p>
            <p className="text-xs text-gray-400">{kpiComp?.parcelasEmAberto ?? 0} parcela(s)</p>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita mensal 12 meses */}
        <Card>
          <CardHeader><h2 className="font-semibold text-[#1F3864]">Receita Mensal (12 meses)</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={receitaMensal ?? []} margin={{ top: 8 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmt.moeda(v)} />
                <Legend />
                <Bar dataKey="parcelaA" name="Parceria A" stackId="a" fill="#1F3864" radius={[0,0,0,0]} />
                <Bar dataKey="parcelaB" name="Parceria B" stackId="a" fill="#2E75B6" radius={[0,0,0,0]} />
                <Bar dataKey="parcelaC" name="Parceria C" stackId="a" fill="#27AE60" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Inadimplência */}
        <Card>
          <CardHeader><h2 className="font-semibold text-[#1F3864]">Inadimplência (12 meses)</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={inadimplencia ?? []} margin={{ top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="qtd" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="pct" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="qtd" type="monotone" dataKey="vencidas" name="Vencidas" stroke="#EF4444" strokeWidth={2} dot={false} />
                <Line yAxisId="qtd" type="monotone" dataKey="pagas"    name="Pagas"    stroke="#22C55E" strokeWidth={2} dot={false} />
                <Line yAxisId="pct" type="monotone" dataKey="taxa"     name="Taxa (%)" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Ranking de Profissionais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1F3864]">Ranking de Profissionais</h2>
            <SeletorMes value={mesSelecionado} onChange={setMesSelecionado} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{iniMes} — {fimMes}</p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(ranking ?? []).map((r, i) => {
              const cor  = PROF_CORES[r.tipo] ?? '#6B7280'
              const total = (ranking ?? []).reduce((s, x) => s + x.total, 0)
              const pct   = total > 0 ? (r.total / total) * 100 : 0
              return (
                <div key={r.tipo} className="rounded-xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: cor }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{r.nome}</p>
                      <p className="text-xs text-gray-400">{r.tipo}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold" style={{ color: cor }}>{fmt.moeda(r.total)}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: cor }} />
                  </div>
                  <p className="text-xs text-gray-400">{pct.toFixed(1)}% do total</p>
                </div>
              )
            })}
            {(!ranking || ranking.every(r => r.total === 0)) && (
              <div className="col-span-4 py-8 text-center text-sm text-gray-400">
                Nenhum atendimento em {mesLabel}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
