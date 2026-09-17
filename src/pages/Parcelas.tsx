import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, CheckSquare, History, RefreshCw, FileDown, RefreshCcw, XCircle } from 'lucide-react'
import { Card, Badge, KpiCard, FiltroData, Paginacao } from '@/components/ui'
import { useParcelas, useMarcarParcelaPaga, useBaixarEmLote, useRenegociadas, useCancelarParcela } from '@/hooks/useResumo'
import { usePerfil } from '@/contexts/PerfilContext'
import BaixaEmLote from '@/components/parcelas/BaixaEmLote'
import HistoricoParcela from '@/components/parcelas/HistoricoParcela'
import RenegociarParcela from '@/components/parcelas/RenegociarParcela'
import { gerarRelatorioRenegociacoes } from '@/services/relatorio'
import { fmt } from '@/lib/utils'
import type { ParceriaId } from '@/types'

export default function Parcelas() {
  const { isAdmin, isGestor, perfil } = usePerfil()
  const podeGerenciar = isAdmin || isGestor
  const usuarioNome   = perfil?.nome ?? 'Usuário'

  const [aba, setAba]                     = useState<'parcelas' | 'renegociadas'>('parcelas')
  const [filtroStatus, setFiltroStatus]   = useState('')
  const [filtroPaciente, setFiltroPaciente] = useState('')
  const [dataInicio, setDataInicio]       = useState('')
  const [dataFim, setDataFim]             = useState('')
  const [gerandoPdf, setGerandoPdf]       = useState(false)

  // Seleção em lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [modalLote, setModalLote]       = useState(false)

  // Modais de linha
  const [parcelaHistorico, setParcelaHistorico]     = useState<{ id: string; paciente: string } | null>(null)
  const [parcelaRenegociar, setParcelaRenegociar]   = useState<{
    id: string; data_vencimento: string; valor_parcela: number; paciente: string
  } | null>(null)
  const [parcelaCancelar, setParcelaCancelar]       = useState<{ id: string; paciente: string } | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [pagina, setPagina]                         = useState(1)
  const POR_PAGINA = 50

  useEffect(() => { setPagina(1) }, [filtroStatus, filtroPaciente, dataInicio, dataFim])

  const filtros = {
    ...(filtroStatus   ? { status: filtroStatus }     : {}),
    ...(filtroPaciente ? { paciente: filtroPaciente } : {}),
    ...(dataInicio     ? { dataInicio }               : {}),
    ...(dataFim        ? { dataFim }                  : {}),
  }
  const { data: parcelas, isLoading } = useParcelas(Object.keys(filtros).length ? filtros : undefined)
  const { data: renegociadas, isLoading: loadingReneg } = useRenegociadas()
  const marcarPaga  = useMarcarParcelaPaga()
  const baixarLote  = useBaixarEmLote()
  const cancelar    = useCancelarParcela()

  const hoje      = new Date().toISOString().split('T')[0]
  const lista     = parcelas ?? []
  const listaPagina = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
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

  const canceladas = lista.filter(p => p.status === 'cancelado')

  const badgeStatus = (p: typeof lista[0]) => {
    const vencida = p.status === 'pendente' && p.data_vencimento < hoje
    if (p.status === 'pago')        return <Badge variant="success">pago</Badge>
    if (p.status === 'renegociada') return <Badge variant="warning">renegociada</Badge>
    if (p.status === 'cancelado')   return <Badge variant="danger">cancelado</Badge>
    if (vencida)                    return <Badge variant="danger">vencida</Badge>
    return <Badge variant="warning">pendente</Badge>
  }

  const handleConfirmarCancelamento = async () => {
    if (!parcelaCancelar || !motivoCancelamento.trim()) return
    await cancelar.mutateAsync({ id: parcelaCancelar.id, motivo: motivoCancelamento.trim() })
    setParcelaCancelar(null)
    setMotivoCancelamento('')
  }

  const handleExportarReneg = async () => {
    if (!renegociadas?.length) return
    setGerandoPdf(true)
    try { await gerarRelatorioRenegociacoes(renegociadas, usuarioNome) }
    finally { setGerandoPdf(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Controle de Parcelas</h1>
          <p className="text-gray-500 text-sm mt-1">Acompanhe e baixe parcelas dos atendimentos parcelados</p>
        </div>
        <div className="flex items-center gap-2">
          {aba === 'renegociadas' && podeGerenciar && (
            <button
              onClick={handleExportarReneg}
              disabled={gerandoPdf || !renegociadas?.length}
              className="flex items-center gap-2 px-4 py-2 bg-[#1F3864] text-white text-sm font-medium rounded-lg hover:bg-[#2E75B6] disabled:opacity-50"
            >
              <FileDown size={16} />
              {gerandoPdf ? 'Gerando...' : 'Exportar PDF'}
            </button>
          )}
          {aba === 'parcelas' && podeGerenciar && selecionados.size > 0 && (
            <button
              onClick={() => setModalLote(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
            >
              <CheckSquare size={16} />
              Baixar {selecionados.size} selecionada(s)
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Pendentes"    value={pendentes.length}            color="border-l-yellow-400" />
        <KpiCard label="Vencidas"     value={vencidas.length}             color="border-l-red-500" />
        <KpiCard label="Pagas"        value={pagas.length}                color="border-l-green-500" />
        <KpiCard label="Renegociadas" value={renegociadas?.length ?? '—'} color="border-l-amber-500" />
        <KpiCard label="Canceladas"   value={canceladas.length}           color="border-l-gray-400" />
      </div>

      {/* Abas */}
      <div className="flex gap-2">
        <button
          onClick={() => setAba('parcelas')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            aba === 'parcelas' ? 'bg-[#1F3864] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Parcelas
        </button>
        <button
          onClick={() => setAba('renegociadas')}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            aba === 'renegociadas' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <RefreshCcw size={14} />
          Renegociadas {renegociadas?.length ? `(${renegociadas.length})` : ''}
        </button>
      </div>

      {vencidas.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span><strong>{vencidas.length}</strong> parcela(s) vencida(s) aguardando baixa.</span>
        </div>
      )}

      {/* Painel de renegociações */}
      {aba === 'renegociadas' && (
        <Card>
          {/* Versão desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-amber-700 text-xs uppercase">
                <tr>
                  {['Paciente', 'Parceria', 'Parcela', 'Novo Vencimento', 'Valor', 'Data Renegociação', 'Motivo'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {loadingReneg && <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>}
                {!loadingReneg && !renegociadas?.length && <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Nenhuma parcela renegociada</td></tr>}
                {(renegociadas ?? []).map(p => (
                  <tr key={p.id} className="hover:bg-amber-50/40">
                    <td className="px-4 py-3 font-medium">{p.paciente}</td>
                    <td className="px-4 py-3"><Badge variant={p.parceria_id as ParceriaId}>Parceria {p.parceria_id}</Badge></td>
                    <td className="px-4 py-3">{p.parcela_num}/{p.parcela_total}</td>
                    <td className="px-4 py-3">{fmt.data(p.data_vencimento)}</td>
                    <td className="px-4 py-3 font-semibold">{fmt.moeda(p.valor_parcela)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.data_renegociacao ? new Date(p.data_renegociacao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={p.observacoes ?? ''}>
                      {p.observacoes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Versão mobile — cards */}
          <div className="md:hidden divide-y divide-amber-50">
            {loadingReneg && <p className="px-4 py-8 text-center text-gray-400 text-sm">Carregando...</p>}
            {!loadingReneg && !renegociadas?.length && <p className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma parcela renegociada</p>}
            {(renegociadas ?? []).map(p => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">{p.paciente}</span>
                  <Badge variant={p.parceria_id as ParceriaId}>Parceria {p.parceria_id}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Parcela</p>
                    <p className="font-medium">{p.parcela_num}/{p.parcela_total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Novo vencimento</p>
                    <p className="font-medium">{fmt.data(p.data_vencimento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Valor</p>
                    <p className="font-bold">{fmt.moeda(p.valor_parcela)}</p>
                  </div>
                </div>
                {p.data_renegociacao && (
                  <p className="text-xs text-gray-400">
                    Renegociada em {new Date(p.data_renegociacao).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {p.observacoes && (
                  <p className="text-xs text-gray-600 italic bg-amber-50 rounded px-2 py-1">"{p.observacoes}"</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {aba === 'parcelas' && <>
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
              {listaPagina.map(p => {
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
                        {p.status === 'pendente' && isAdmin && (
                          <button onClick={() => { setParcelaCancelar({ id: p.id, paciente }); setMotivoCancelamento('') }} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Cancelar parcela"><XCircle size={15} /></button>
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
                  {p.status === 'pendente' && isAdmin && (
                    <button onClick={() => { setParcelaCancelar({ id: p.id, paciente }); setMotivoCancelamento('') }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle size={13} /> Cancelar
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
        <Paginacao total={lista.length} pagina={pagina} porPagina={POR_PAGINA} onChange={setPagina} />
      </Card>

      </>}

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

      {parcelaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full shrink-0">
                <XCircle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cancelar parcela</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Paciente: <span className="font-medium text-gray-700 dark:text-gray-300">{parcelaCancelar.paciente}</span>
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Motivo do cancelamento <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={motivoCancelamento}
                onChange={e => setMotivoCancelamento(e.target.value)}
                placeholder="Descreva o motivo do cancelamento..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              {!motivoCancelamento.trim() && (
                <p className="text-xs text-red-500">O motivo é obrigatório</p>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setParcelaCancelar(null); setMotivoCancelamento('') }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmarCancelamento}
                disabled={!motivoCancelamento.trim() || cancelar.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {cancelar.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
