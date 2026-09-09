import { useState } from 'react'
import { CheckCircle, AlertCircle, CheckSquare, History, RefreshCw } from 'lucide-react'
import { Card, Badge, KpiCard, FiltroData } from '@/components/ui'
import { useParcelas, useMarcarParcelaPaga, useBaixarEmLote } from '@/hooks/useResumo'
import { usePerfil } from '@/contexts/PerfilContext'
import BaixaEmLote from '@/components/parcelas/BaixaEmLote'
import HistoricoParcela from '@/components/parcelas/HistoricoParcela'
import RenegociarParcela from '@/components/parcelas/RenegociarParcela'
import { fmt } from '@/lib/utils'
import type { ParceriaId } from '@/types'

export default function Parcelas() {
  const { isAdmin, isGestor } = usePerfil()
  const podeGerenciar = isAdmin || isGestor

  const [filtroStatus, setFiltroStatus]   = useState('')
  const [filtroPaciente, setFiltroPaciente] = useState('')
  const [dataInicio, setDataInicio]       = useState('')
  const [dataFim, setDataFim]             = useState('')

  // Seleção em lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [modalLote, setModalLote]       = useState(false)

  // Modais de linha
  const [parcelaHistorico, setParcelaHistorico]     = useState<{ id: string; paciente: string } | null>(null)
  const [parcelaRenegociar, setParcelaRenegociar]   = useState<{
    id: string; data_vencimento: string; valor_parcela: number; paciente: string
  } | null>(null)

  const filtros = {
    ...(filtroStatus   ? { status: filtroStatus }     : {}),
    ...(filtroPaciente ? { paciente: filtroPaciente } : {}),
    ...(dataInicio     ? { dataInicio }               : {}),
    ...(dataFim        ? { dataFim }                  : {}),
  }
  const { data: parcelas, isLoading } = useParcelas(Object.keys(filtros).length ? filtros : undefined)
  const marcarPaga  = useMarcarParcelaPaga()
  const baixarLote  = useBaixarEmLote()

  const hoje      = new Date().toISOString().split('T')[0]
  const lista     = parcelas ?? []
  const vencidas  = lista.filter(p => p.status === 'pendente' && p.data_vencimento < hoje)
  const pendentes = lista.filter(p => p.status === 'pendente')
  const pagas     = lista.filter(p => p.status === 'pago')

  // Lógica de seleção
  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    const pendentesIds = lista.filter(p => p.status === 'pendente').map(p => p.id)
    if (selecionados.size === pendentesIds.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(pendentesIds))
    }
  }

  const valorSelecionado = lista
    .filter(p => selecionados.has(p.id))
    .reduce((s, p) => s + Number(p.valor_parcela), 0)

  const handleBaixaLote = async () => {
    await baixarLote.mutateAsync(Array.from(selecionados))
    setSelecionados(new Set())
    setModalLote(false)
  }

  const badgeStatus = (p: typeof lista[0]) => {
    const vencida = p.status === 'pendente' && p.data_vencimento < hoje
    if (p.status === 'pago')         return <Badge variant="success">pago</Badge>
    if (p.status === 'renegociada')  return <Badge variant="warning">renegociada</Badge>
    if (vencida)                     return <Badge variant="danger">vencida</Badge>
    return <Badge variant="warning">pendente</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Controle de Parcelas</h1>
          <p className="text-gray-500 text-sm mt-1">Acompanhe e baixe parcelas dos atendimentos parcelados</p>
        </div>
        {podeGerenciar && selecionados.size > 0 && (
          <button
            onClick={() => setModalLote(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
          >
            <CheckSquare size={16} />
            Baixar {selecionados.size} selecionada(s)
          </button>
        )}
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
        <div className="px-4 md:px-6 py-4 flex gap-3 flex-wrap items-center">
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={filtroPaciente}
            onChange={e => setFiltroPaciente(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-48"
          />
          <div className="h-5 border-l border-gray-200" />
          {[
            { val: '',            label: 'Todas' },
            { val: 'pendente',    label: 'Pendente' },
            { val: 'pago',        label: 'Pago' },
            { val: 'vencido',     label: 'Vencido' },
            { val: 'renegociada', label: 'Renegociada' },
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
        {/* Versão desktop — tabela */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {podeGerenciar && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={toggleTodos}
                      checked={selecionados.size > 0 && selecionados.size === lista.filter(p => p.status === 'pendente').length}
                      className="rounded"
                    />
                  </th>
                )}
                {['Paciente','Parceria','Parcela','Vencimento','Valor','Camta','Médico','Psi1','Psi2','Status','Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={podeGerenciar ? 12 : 11} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
              )}
              {!isLoading && lista.length === 0 && (
                <tr><td colSpan={podeGerenciar ? 12 : 11} className="px-6 py-8 text-center text-gray-400">Nenhuma parcela encontrada</td></tr>
              )}
              {lista.map(p => {
                const vencida = p.status === 'pendente' && p.data_vencimento < hoje
                const paciente = p.lancamentos?.paciente ?? '—'
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${vencida ? 'bg-red-50/40' : ''}`}>
                    {podeGerenciar && (
                      <td className="px-4 py-3">
                        {p.status === 'pendente' && (
                          <input type="checkbox" checked={selecionados.has(p.id)} onChange={() => toggleSelecionado(p.id)} className="rounded" />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">{paciente}</td>
                    <td className="px-4 py-3"><Badge variant={(p.lancamentos?.parceria_id ?? 'A') as ParceriaId}>Parceria {p.lancamentos?.parceria_id}</Badge></td>
                    <td className="px-4 py-3">{p.parcela_num}/{p.parcela_total}</td>
                    <td className={`px-4 py-3 ${vencida ? 'text-red-600 font-semibold' : ''}`}>{fmt.data(p.data_vencimento)}</td>
                    <td className="px-4 py-3 font-semibold">{fmt.moeda(p.valor_parcela)}</td>
                    <td className="px-4 py-3 text-blue-700">{p.camta_valor > 0 ? fmt.moeda(p.camta_valor) : '—'}</td>
                    <td className="px-4 py-3 text-green-700">{p.medico_valor > 0 ? fmt.moeda(p.medico_valor) : '—'}</td>
                    <td className="px-4 py-3 text-yellow-700">{fmt.moeda(p.psi1_valor)}</td>
                    <td className="px-4 py-3 text-orange-700">{fmt.moeda(p.psi2_valor)}</td>
                    <td className="px-4 py-3">{badgeStatus(p)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.status === 'pendente' && podeGerenciar && (
                          <button onClick={() => marcarPaga.mutate(p.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Marcar como pago"><CheckCircle size={15} /></button>
                        )}
                        {(vencida || p.status === 'renegociada') && isAdmin && (
                          <button onClick={() => setParcelaRenegociar({ id: p.id, data_vencimento: p.data_vencimento, valor_parcela: p.valor_parcela, paciente })} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Renegociar"><RefreshCw size={15} /></button>
                        )}
                        <button onClick={() => setParcelaHistorico({ id: p.id, paciente })} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Ver histórico"><History size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Versão mobile — cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading && <p className="px-4 py-8 text-center text-gray-400 text-sm">Carregando...</p>}
          {!isLoading && lista.length === 0 && <p className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma parcela encontrada</p>}
          {lista.map(p => {
            const vencida = p.status === 'pendente' && p.data_vencimento < hoje
            const paciente = p.lancamentos?.paciente ?? '—'
            return (
              <div key={p.id} className={`p-4 space-y-3 ${vencida ? 'bg-red-50/40' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {podeGerenciar && p.status === 'pendente' && (
                      <input type="checkbox" checked={selecionados.has(p.id)} onChange={() => toggleSelecionado(p.id)} className="rounded mt-0.5" />
                    )}
                    <span className="font-semibold text-gray-900">{paciente}</span>
                    <Badge variant={(p.lancamentos?.parceria_id ?? 'A') as ParceriaId}>Parceria {p.lancamentos?.parceria_id}</Badge>
                  </div>
                  {badgeStatus(p)}
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Parcela</p>
                    <p className="font-medium">{p.parcela_num}/{p.parcela_total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Vencimento</p>
                    <p className={`font-medium ${vencida ? 'text-red-600' : ''}`}>{fmt.data(p.data_vencimento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Valor</p>
                    <p className="font-bold">{fmt.moeda(p.valor_parcela)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                  {p.camta_valor  > 0 && <div><span className="text-gray-400">Camta</span><p className="font-medium text-blue-700">{fmt.moeda(p.camta_valor)}</p></div>}
                  {p.medico_valor > 0 && <div><span className="text-gray-400">Médico</span><p className="font-medium text-green-700">{fmt.moeda(p.medico_valor)}</p></div>}
                  {p.psi1_valor   > 0 && <div><span className="text-gray-400">Psi1</span><p className="font-medium text-yellow-700">{fmt.moeda(p.psi1_valor)}</p></div>}
                  {p.psi2_valor   > 0 && <div><span className="text-gray-400">Psi2</span><p className="font-medium text-orange-700">{fmt.moeda(p.psi2_valor)}</p></div>}
                </div>

                <div className="flex gap-2 pt-1">
                  {p.status === 'pendente' && podeGerenciar && (
                    <button onClick={() => marcarPaga.mutate(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle size={13} /> Baixar
                    </button>
                  )}
                  {(vencida || p.status === 'renegociada') && isAdmin && (
                    <button onClick={() => setParcelaRenegociar({ id: p.id, data_vencimento: p.data_vencimento, valor_parcela: p.valor_parcela, paciente })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                      <RefreshCw size={13} /> Renegociar
                    </button>
                  )}
                  <button onClick={() => setParcelaHistorico({ id: p.id, paciente })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                    <History size={13} /> Histórico
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Modais */}
      {modalLote && (
        <BaixaEmLote
          ids={Array.from(selecionados)}
          valorTotal={valorSelecionado}
          onConfirmar={handleBaixaLote}
          onCancelar={() => setModalLote(false)}
          loading={baixarLote.isPending}
        />
      )}

      {parcelaHistorico && (
        <HistoricoParcela
          parcelaId={parcelaHistorico.id}
          paciente={parcelaHistorico.paciente}
          onFechar={() => setParcelaHistorico(null)}
        />
      )}

      {parcelaRenegociar && (
        <RenegociarParcela
          parcela={parcelaRenegociar}
          paciente={parcelaRenegociar.paciente}
          onFechar={() => setParcelaRenegociar(null)}
        />
      )}
    </div>
  )
}
