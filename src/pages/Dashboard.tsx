import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { KpiCard, Card, CardHeader, CardBody, Badge } from '@/components/ui'
import { useKPIs, useResumoParceria, useResumoProfissional } from '@/hooks/useResumo'
import { useLancamentos } from '@/hooks/useLancamentos'
import { fmt } from '@/lib/utils'

const CORES_PIE = ['#1F3864', '#2E75B6', '#E67E22', '#27AE60']

export default function Dashboard() {
  const { data: kpis }        = useKPIs()
  const { data: resumoParc }  = useResumoParceria()
  const { data: resumoProf }  = useResumoProfissional()
  const { data: lancamentos } = useLancamentos()

  const dadosBarras = (resumoParc ?? []).map(r => ({
    name: `Parceria ${r.parceria}`,
    Psi1:   Number(r.psi1_total   ?? 0),
    Psi2:   Number(r.psi2_total   ?? 0),
    Camta:  Number(r.camta_total  ?? 0),
    Médico: Number(r.medico_total ?? 0),
  }))

  const dadosPizza = (resumoProf ?? [])
    .filter(r => Number(r.total) > 0)
    .map((r, i) => ({
      name:  r.profissional.charAt(0).toUpperCase() + r.profissional.slice(1),
      value: Number(r.total),
      color: CORES_PIE[i % CORES_PIE.length],
    }))

  const ultimosLancamentos = (lancamentos ?? []).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864]">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral das parcerias clínicas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Atendimentos" value={kpis?.totalAtendimentos ?? 0}          color="border-l-[#1F3864]" />
        <KpiCard label="Receita Total"      value={fmt.moeda(kpis?.receitaTotal ?? 0)}    color="border-l-[#2E75B6]" />
        <KpiCard label="Receita Recebida"   value={fmt.moeda(kpis?.receitaPaga ?? 0)}     color="border-l-green-500" />
        <KpiCard label="Parcelas Vencidas"  value={kpis?.parcelasVencidas ?? 0} sub="pendentes" color="border-l-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="font-semibold text-[#1F3864]">Rateio por Parceria</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dadosBarras} margin={{ top: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
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

        <Card>
          <CardHeader><h2 className="font-semibold text-[#1F3864]">Distribuição por Profissional</h2></CardHeader>
          <CardBody>
            {dadosPizza.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                Nenhum dado ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={dadosPizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`}>
                    {dadosPizza.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt.moeda(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold text-[#1F3864]">Últimos Lançamentos</h2></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Data','Paciente','Parceria','Valor','Status'].map(h => (
                  <th key={h} className="px-6 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ultimosLancamentos.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Nenhum lançamento ainda</td></tr>
              ) : ultimosLancamentos.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">{fmt.data(l.data_atendimento)}</td>
                  <td className="px-6 py-3 font-medium">{l.paciente}</td>
                  <td className="px-6 py-3">
                    <Badge variant={l.parceria_id as 'A' | 'B' | 'C'}>Parceria {l.parceria_id}</Badge>
                  </td>
                  <td className="px-6 py-3 font-semibold">{fmt.moeda(l.valor_total)}</td>
                  <td className="px-6 py-3">
                    <Badge variant={l.status === 'pago' ? 'success' : l.status === 'cancelado' ? 'danger' : 'warning'}>
                      {l.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
