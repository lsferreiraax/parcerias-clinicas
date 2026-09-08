import { useState, useMemo } from 'react'
import { AlertCircle, FileDown, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, KpiCard, Badge, FiltroData } from '@/components/ui'
import { useParcelas } from '@/hooks/useResumo'
import { usePerfil } from '@/contexts/PerfilContext'
import { gerarRelatorioInadimplencia } from '@/services/relatorio'
import { fmt } from '@/lib/utils'
import type { ParceriaId } from '@/types'

interface GrupoPaciente {
  paciente: string
  parceriaId: string
  parcelas: Array<{
    id: string
    parcela_num: number
    parcela_total: number
    data_vencimento: string
    valor_parcela: number
    dias_atraso: number
  }>
  valor_total: number
  dias_max: number
}

function gravidade(dias: number): 'baixo' | 'medio' | 'alto' | 'critico' {
  if (dias <= 15)  return 'baixo'
  if (dias <= 30)  return 'medio'
  if (dias <= 60)  return 'alto'
  return 'critico'
}

const GRAVIDADE_STYLE = {
  baixo:   { badge: 'bg-yellow-100 text-yellow-700', row: '' },
  medio:   { badge: 'bg-orange-100 text-orange-700', row: 'bg-orange-50/30' },
  alto:    { badge: 'bg-red-100 text-red-700',       row: 'bg-red-50/40' },
  critico: { badge: 'bg-red-200 text-red-800',       row: 'bg-red-100/50' },
}

export default function Inadimplencia() {
  const { perfil } = usePerfil()
  const usuarioNome = perfil?.nome ?? 'Usuário'

  const hoje = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [filtroParceria, setFiltroParceria] = useState('')
  const [expandido, setExpandido]   = useState<Set<string>>(new Set())
  const [gerando, setGerando]       = useState(false)
  const [ordenar, setOrdenar]       = useState<'dias' | 'valor'>('dias')

  const filtros = {
    status: 'pendente',
    ...(dataInicio ? { dataInicio } : {}),
    ...(dataFim    ? { dataFim }    : {}),
  }
  const { data: todasParcelas, isLoading } = useParcelas(filtros)

  // Filtra apenas as vencidas (data_vencimento < hoje)
  const vencidas = useMemo(() => {
    if (!todasParcelas) return []
    let lista = todasParcelas.filter(p => p.data_vencimento < hoje)
    if (filtroParceria) {
      lista = lista.filter(p => p.lancamentos?.parceria_id === filtroParceria)
    }
    return lista
  }, [todasParcelas, hoje, filtroParceria])

  // Agrupado por paciente
  const grupos = useMemo((): GrupoPaciente[] => {
    const map = new Map<string, GrupoPaciente>()
    for (const p of vencidas) {
      const paciente   = p.lancamentos?.paciente ?? 'Desconhecido'
      const parceriaId = p.lancamentos?.parceria_id ?? '—'
      const venc       = new Date(p.data_vencimento)
      const dias       = Math.floor((Date.now() - venc.getTime()) / 86_400_000)
      const chave      = `${paciente}|${parceriaId}`

      if (!map.has(chave)) {
        map.set(chave, { paciente, parceriaId, parcelas: [], valor_total: 0, dias_max: 0 })
      }
      const g = map.get(chave)!
      g.parcelas.push({
        id: p.id,
        parcela_num:   p.parcela_num,
        parcela_total: p.parcela_total,
        data_vencimento: p.data_vencimento,
        valor_parcela: p.valor_parcela,
        dias_atraso: dias,
      })
      g.valor_total += p.valor_parcela
      g.dias_max = Math.max(g.dias_max, dias)
    }

    const lista = Array.from(map.values())
    return ordenar === 'dias'
      ? lista.sort((a, b) => b.dias_max - a.dias_max)
      : lista.sort((a, b) => b.valor_total - a.valor_total)
  }, [vencidas, ordenar])

  const totalEmAberto = vencidas.reduce((s, p) => s + p.valor_parcela, 0)
  const mediaAtraso   = vencidas.length > 0
    ? Math.round(vencidas.reduce((s, p) => {
        const dias = Math.floor((Date.now() - new Date(p.data_vencimento).getTime()) / 86_400_000)
        return s + dias
      }, 0) / vencidas.length)
    : 0

  const toggleExpandido = (chave: string) =>
    setExpandido(prev => {
      const next = new Set(prev)
      next.has(chave) ? next.delete(chave) : next.add(chave)
      return next
    })

  const handleExportar = async () => {
    setGerando(true)
    try {
      await gerarRelatorioInadimplencia(
        vencidas.map(p => ({
          ...p,
          lancamentos: { paciente: p.lancamentos?.paciente ?? '—', parceria_id: p.lancamentos?.parceria_id ?? '—' },
        })),
        usuarioNome
      )
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Inadimplência</h1>
          <p className="text-gray-500 text-sm mt-1">Parcelas vencidas e não pagas por paciente</p>
        </div>
        <button
          onClick={handleExportar}
          disabled={gerando || vencidas.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#1F3864] text-white text-sm font-medium rounded-lg hover:bg-[#2E75B6] disabled:opacity-50"
        >
          <FileDown size={16} />
          {gerando ? 'Gerando...' : 'Exportar PDF'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Pacientes Inadimplentes" value={grupos.length}            color="border-l-red-500" />
        <KpiCard label="Parcelas Vencidas"        value={vencidas.length}         color="border-l-orange-400" />
        <KpiCard label="Total em Aberto"          value={fmt.moeda(totalEmAberto)} color="border-l-red-600" />
        <KpiCard label="Média de Atraso"          value={`${mediaAtraso}d`}        color="border-l-yellow-500" />
      </div>

      {/* Alerta */}
      {vencidas.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span><strong>{vencidas.length}</strong> parcela(s) vencida(s) de <strong>{grupos.length}</strong> paciente(s). Total em aberto: <strong>{fmt.moeda(totalEmAberto)}</strong></span>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <div className="px-6 py-4 flex gap-3 flex-wrap items-center">
          <select
            value={filtroParceria}
            onChange={e => setFiltroParceria(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
          >
            <option value="">Todas as parcerias</option>
            {['A', 'B', 'C'].map(p => (
              <option key={p} value={p}>Parceria {p}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Ordenar por:</span>
            {[
              { val: 'dias',  label: 'Dias de atraso' },
              { val: 'valor', label: 'Valor em aberto' },
            ].map(({ val, label }) => (
              <button key={val} onClick={() => setOrdenar(val as 'dias' | 'valor')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  ordenar === val ? 'bg-[#1F3864] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>

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

      {/* Tabela agrupada */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left w-8" />
                <th className="px-4 py-3 text-left font-medium">Paciente</th>
                <th className="px-4 py-3 text-left font-medium">Parceria</th>
                <th className="px-4 py-3 text-left font-medium">Parcelas</th>
                <th className="px-4 py-3 text-left font-medium">Valor em Aberto</th>
                <th className="px-4 py-3 text-left font-medium">Maior Atraso</th>
                <th className="px-4 py-3 text-left font-medium">Gravidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
              )}
              {!isLoading && grupos.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Nenhuma parcela vencida encontrada
                </td></tr>
              )}
              {grupos.map(g => {
                const chave = `${g.paciente}|${g.parceriaId}`
                const aberto = expandido.has(chave)
                const grav   = gravidade(g.dias_max)
                const style  = GRAVIDADE_STYLE[grav]
                return (
                  <>
                    <tr key={chave} className={`hover:bg-gray-50 cursor-pointer ${style.row}`}
                      onClick={() => toggleExpandido(chave)}>
                      <td className="px-4 py-3 text-gray-400">
                        {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{g.paciente}</td>
                      <td className="px-4 py-3">
                        <Badge variant={g.parceriaId as ParceriaId}>Parceria {g.parceriaId}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{g.parcelas.length} parcela(s)</td>
                      <td className="px-4 py-3 font-bold text-red-700">{fmt.moeda(g.valor_total)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{g.dias_max}d</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
                          {grav === 'baixo' ? 'Baixo' : grav === 'medio' ? 'Médio' : grav === 'alto' ? 'Alto' : 'Crítico'}
                        </span>
                      </td>
                    </tr>
                    {aberto && g.parcelas.map(p => (
                      <tr key={p.id} className="bg-gray-50/70">
                        <td className="px-4 py-2" />
                        <td colSpan={2} className="px-4 py-2 text-xs text-gray-500 pl-8">
                          Parcela {p.parcela_num}/{p.parcela_total}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          Venc. {fmt.data(p.data_vencimento)}
                        </td>
                        <td className="px-4 py-2 text-xs font-medium">{fmt.moeda(p.valor_parcela)}</td>
                        <td className="px-4 py-2 text-xs text-red-600">{p.dias_atraso}d de atraso</td>
                        <td />
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
