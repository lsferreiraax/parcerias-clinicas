import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { BarChart3, TrendingUp, Users, CalendarCheck, Clock, Wifi, MapPin } from 'lucide-react'
import { useDashboardPsicologia } from '@/hooks/useDashboardPsicologia'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PCT = (v: number | null) => v == null ? '—' : `${Math.round(v * 100)}%`

function KpiCard({ label, value, sub, icon: Icon, cor }: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  cor: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${cor}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-variant-numeric tabular-nums">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const COR_STATUS: Record<string, string> = {
  realizada: '#16a34a',
  agendada:  '#2563eb',
  cancelada: '#9ca3af',
  faltou:    '#dc2626',
}

export default function DashboardPsicologia() {
  const { data, isLoading, error } = useDashboardPsicologia()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Carregando dashboard...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-red-400 text-sm">
        Erro ao carregar dados. Tente novamente.
      </div>
    )
  }

  const { kpis, sessoesPorMes, sessoesPorStatus, sessoesPorModalidade, proximasSessoes } = data

  const modalidadeTotal = sessoesPorModalidade.reduce((s, m) => s + m.count, 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BarChart3 size={22} className="text-[#1F3864] dark:text-blue-400" />
          Dashboard Psicologia
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Mês atual · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Sessões realizadas"
          value={String(kpis.sessoesRealizadasMes)}
          sub="no mês"
          icon={CalendarCheck}
          cor="bg-green-600"
        />
        <KpiCard
          label="Receita do mês"
          value={BRL(kpis.receitaMes)}
          sub="sessões realizadas"
          icon={TrendingUp}
          cor="bg-blue-600"
        />
        <KpiCard
          label="Comparecimento"
          value={PCT(kpis.taxaComparecimento)}
          sub={kpis.taxaComparecimento == null ? 'sem dados' : 'realizadas vs faltou'}
          icon={BarChart3}
          cor={kpis.taxaComparecimento == null ? 'bg-gray-400' : kpis.taxaComparecimento >= 0.8 ? 'bg-green-600' : kpis.taxaComparecimento >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}
        />
        <KpiCard
          label="Pacientes atendidos"
          value={String(kpis.pacientesAtendidosMes)}
          sub="no mês"
          icon={Users}
          cor="bg-purple-600"
        />
      </div>

      {/* Gráfico de sessões por mês */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Sessões nos últimos 6 meses
        </h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessoesPorMes} barSize={28} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--color-muted, #9ca3af)' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--color-muted, #9ca3af)' }}
                axisLine={false} tickLine={false} width={28}
              />
              <Tooltip
                contentStyle={{ background: 'var(--tooltip-bg,#1f2937)', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e5e7eb', fontWeight: 600 }}
                itemStyle={{ color: '#d1d5db' }}
              />
              <Bar dataKey="realizada" name="Realizadas"  fill={COR_STATUS.realizada}  stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="agendada"  name="Agendadas"   fill={COR_STATUS.agendada}   stackId="a" />
              <Bar dataKey="faltou"    name="Faltou"      fill={COR_STATUS.faltou}     stackId="a" />
              <Bar dataKey="cancelada" name="Canceladas"  fill={COR_STATUS.cancelada}  stackId="a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {(['realizada','agendada','faltou','cancelada'] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_STATUS[s] }} />
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{s === 'realizada' ? 'Realizadas' : s === 'agendada' ? 'Agendadas' : s === 'faltou' ? 'Faltou' : 'Canceladas'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Linha inferior: status + modalidade + próximas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Distribuição por status (mês) */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Status — mês atual</h2>
          {sessoesPorStatus.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem sessões no mês</p>
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sessoesPorStatus}
                      dataKey="count"
                      nameKey="label"
                      cx="50%" cy="50%"
                      innerRadius={38} outerRadius={62}
                      paddingAngle={2}
                    >
                      {sessoesPorStatus.map(s => (
                        <Cell key={s.status} fill={s.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#d1d5db' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {sessoesPorStatus.map(s => (
                  <div key={s.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.cor }} />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{s.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modalidade (últimos 6m) */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Modalidade — 6 meses</h2>
          {modalidadeTotal === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
          ) : (
            <div className="space-y-4 mt-2">
              {sessoesPorModalidade.map(m => {
                const pct = modalidadeTotal > 0 ? m.count / modalidadeTotal : 0
                const isPresencial = m.modalidade === 'presencial'
                return (
                  <div key={m.modalidade}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                        {isPresencial ? <MapPin size={14} className="text-blue-500" /> : <Wifi size={14} className="text-purple-500" />}
                        {m.label}
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
                        {m.count} <span className="text-xs font-normal text-gray-400">({Math.round(pct * 100)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round(pct * 100)}%`,
                          background: isPresencial ? '#2563eb' : '#7c3aed',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">{modalidadeTotal} sessão{modalidadeTotal !== 1 ? 'ões' : ''} no período</p>
            </div>
          )}
        </div>

        {/* Próximas sessões */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-gray-400" />
            Próximas sessões
          </h2>
          {proximasSessoes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma nos próximos 7 dias</p>
          ) : (
            <div className="space-y-2.5">
              {proximasSessoes.map(s => (
                <div key={s.id} className="flex items-start gap-3">
                  <div className="text-center min-w-[36px]">
                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                      {new Date(s.data_sessao + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                    </p>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.hora_inicio.slice(0, 5)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{s.paciente_nome}</p>
                    <p className="text-xs text-gray-400 capitalize">{s.modalidade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
