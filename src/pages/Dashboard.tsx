import { useState } from 'react'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import { KpiCard, Card, CardHeader, CardBody, FiltroData } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { useKPIs } from '@/hooks/useResumo'
import { useReceitaMensal, useInadimplenciaMensal, useKpiComparativo, useRankingProfissionais, useMetasMensais } from '@/hooks/useDashboard'
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
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const navigate = useNavigate()

  const filtroKpi = dataInicio || dataFim
    ? { ...(dataInicio ? { dataInicio } : {}), ...(dataFim ? { dataFim } : {}) }
    : undefined

  const { data: kpis }           = useKPIs(filtroKpi)
  const { data: receitaMensal }  = useReceitaMensal()
  const { data: inadimplencia }  = useInadimplenciaMensal()
  const { data: kpiComp }        = useKpiComparativo()
  const { data: ranking }        = useRankingProfissionais(mesSelecionado)
  const { data: metas }          = useMetasMensais()

  const varReceita = variacao(kpiComp?.receitaMes ?? 0, kpiComp?.receitaMesAnterior ?? 0)
  const varTicket  = variacao(kpiComp?.ticketMedio ?? 0, kpiComp?.ticketMedioAnterior ?? 0)

  const mesLabel = format(mesSelecionado, 'MMMM/yyyy', { locale: ptBR })
  const iniMes   = format(startOfMonth(mesSelecionado), 'dd/MM')
  const fimMes   = format(endOfMonth(mesSelecionado), 'dd/MM/yyyy')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864] dark:text-blue-300">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral das parcerias clínicas</p>
        </div>
        <FiltroData
          dataInicio={dataInicio}
          dataFim={dataFim}
          onChangeInicio={setDataInicio}
          onChangeFim={setDataFim}
          onLimpar={() => { setDataInicio(''); setDataFim('') }}
        />
      </div>
      {filtroKpi && (
        <div className="text-xs text-[#2E75B6] bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
          KPIs filtrados por período: {dataInicio ? new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} até {dataFim ? new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} &nbsp;·&nbsp; Os gráficos continuam exibindo os últimos 12 meses.
        </div>
      )}

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Atendimentos" value={kpis?.totalAtendimentos ?? 0}          color="border-l-[#1F3864]" />
        <KpiCard label="Receita Total"      value={fmt.moeda(kpis?.receitaTotal ?? 0)}    color="border-l-[#2E75B6]" />
        <KpiCard label="Receita Recebida"   value={fmt.moeda(kpis?.receitaPaga ?? 0)}     color="border-l-green-500" />
        <KpiCard label="Parcelas Vencidas"  value={kpis?.parcelasVencidas ?? 0} sub="pendentes" color="border-l-red-400" />
        <button
          onClick={() => navigate('/repasses')}
          className="text-left group"
        >
          <Card className="border-l-4 border-l-orange-400 h-full transition-shadow group-hover:shadow-md">
            <div className="p-4 space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Repasses Pendentes</p>
              <p className="text-xl font-bold text-orange-600">{fmt.moeda(kpis?.repassesPendentesValor ?? 0)}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{kpis?.repassesPendentesCount ?? 0} não conciliado(s)</p>
                <ArrowRight size={13} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
              </div>
            </div>
          </Card>
        </button>
      </div>

      {/* KPIs comparativos do mês atual */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Receita do Mês</p>
            <p className="text-xl font-bold text-[#1F3864] dark:text-blue-300">{fmt.moeda(kpiComp?.receitaMes ?? 0)}</p>
            <div className="flex items-center gap-2">
              <BadgeVariacao pct={varReceita} />
              <span className="text-xs text-gray-400">vs mês anterior</span>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Ticket Médio</p>
            <p className="text-xl font-bold text-[#1F3864] dark:text-blue-300">{fmt.moeda(kpiComp?.ticketMedio ?? 0)}</p>
            <div className="flex items-center gap-2">
              <BadgeVariacao pct={varTicket} />
              <span className="text-xs text-gray-400">vs mês anterior</span>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Atendimentos/Mês</p>
            <p className="text-xl font-bold text-[#1F3864] dark:text-blue-300">{kpiComp?.atendimentosMes ?? 0}</p>
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
          <CardHeader><h2 className="font-semibold text-[#1F3864] dark:text-blue-300">Receita Mensal (12 meses)</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={receitaMensal ?? []} margin={{ top: 8 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmt.moeda(v)} />
                <Legend />
                <Bar dataKey="parcelaA" name="Parceria A" stackId="a" fill="#60A5FA" radius={[0,0,0,0]} />
                <Bar dataKey="parcelaB" name="Parceria B" stackId="a" fill="#2E75B6" radius={[0,0,0,0]} />
                <Bar dataKey="parcelaC" name="Parceria C" stackId="a" fill="#27AE60" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Inadimplência */}
        <Card>
          <CardHeader><h2 className="font-semibold text-[#1F3864] dark:text-blue-300">Inadimplência (12 meses)</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={inadimplencia ?? []} margin={{ top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.25)" />
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

      {/* Metas mensais por parceria */}
      {metas && metas.some(m => m.meta_mensal > 0) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[#1F3864] dark:text-blue-300">Metas Mensais por Parceria</h2>
            <p className="text-xs text-gray-400 mt-0.5">Realizado vs meta em {format(new Date(), 'MMMM/yyyy', { locale: ptBR })}</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {metas.filter(m => m.meta_mensal > 0).map(m => {
                const pct = m.meta_mensal > 0 ? Math.min((m.realizado / m.meta_mensal) * 100, 100) : 0
                const atingida = m.realizado >= m.meta_mensal
                return (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Parceria {m.id} — {m.descricao}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs">{fmt.moeda(m.realizado)} / {fmt.moeda(m.meta_mensal)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          atingida
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        }`}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          atingida ? 'bg-green-500' : 'bg-[#2E75B6]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Ranking de Profissionais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1F3864] dark:text-blue-300">Ranking de Profissionais</h2>
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
