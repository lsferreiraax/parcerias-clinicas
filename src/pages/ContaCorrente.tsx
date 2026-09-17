import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, CheckCircle, XCircle, Wallet, History } from 'lucide-react'
import { Card, Button, Modal, Input, Select, Badge } from '@/components/ui'
import { fmt } from '@/lib/utils'
import {
  useMovimentacoes,
  useSaldos,
  useCriarMovimentacao,
  useLiquidarMovimentacao,
  useCancelarMovimentacao,
  useLiquidarCompetencia,
} from '@/hooks/useContaCorrente'
import { CATEGORIAS, parceiraLabel, listarLog, type CategoriaMovimentacao, type TipoMovimentacao, type LogMovimentacao } from '@/services/contaCorrente'

const PARCEIROS = ['camta', 'medico', 'psi1', 'psi2']

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  liquidado: 'success',
  pendente:  'warning',
  cancelado: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  liquidado: 'Liquidado',
  pendente:  'Pendente',
  cancelado: 'Cancelado',
}

export default function ContaCorrente() {
  const mesAtual = new Date().toISOString().slice(0, 7)
  const [competencia, setCompetencia] = useState(mesAtual)
  const [filtroParceria, setFiltroParceria] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmLiquidar, setConfirmLiquidar] = useState<string | null>(null)
  const [logMovId, setLogMovId] = useState<string | null>(null)
  const [logEntradas, setLogEntradas] = useState<LogMovimentacao[]>([])
  const [loadingLog, setLoadingLog] = useState(false)

  const { data: movimentacoes = [], isLoading } = useMovimentacoes(competencia, filtroParceria || undefined)
  const { data: saldos = [] } = useSaldos(competencia)

  const criarMov  = useCriarMovimentacao()
  const liquidar  = useLiquidarMovimentacao()
  const cancelar  = useCancelarMovimentacao()
  const liquidarTodos = useLiquidarCompetencia()

  // Form state
  const [form, setForm] = useState({
    parceria_id: 'psi1',
    tipo: 'debito' as TipoMovimentacao,
    categoria: 'aluguel_sala' as CategoriaMovimentacao,
    valor: '',
    descricao: '',
  })

  const mesLabel = new Date(competencia + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const abrirLog = async (id: string) => {
    setLogMovId(id)
    setLoadingLog(true)
    try {
      const entries = await listarLog(id)
      setLogEntradas(entries)
    } finally {
      setLoadingLog(false)
    }
  }

  const ACAO_LABEL: Record<string, string> = {
    criado:    'Criado',
    liquidado: 'Liquidado',
    cancelado: 'Cancelado',
    alterado:  'Alterado',
  }

  const handleSalvar = async () => {
    if (!form.valor || isNaN(Number(form.valor))) return
    await criarMov.mutateAsync({
      parceria_id: form.parceria_id,
      tipo: form.tipo,
      categoria: form.categoria,
      valor: Number(form.valor),
      descricao: form.descricao || undefined,
      competencia,
    })
    setForm({ parceria_id: 'psi1', tipo: 'debito', categoria: 'aluguel_sala', valor: '', descricao: '' })
    setModalOpen(false)
  }

  const totalSaldoPositivo = saldos.filter(s => s.saldo >= 0).reduce((acc, s) => acc + Number(s.saldo), 0)
  const totalSaldoNegativo = saldos.filter(s => s.saldo < 0).reduce((acc, s) => acc + Number(s.saldo), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Conta Corrente</h1>
          <p className="text-gray-500 text-sm mt-1">Débitos e créditos entre parcerias — compensação mensal</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Nova Movimentação
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Competência</label>
          <input
            type="month"
            value={competencia}
            onChange={e => setCompetencia(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parceria</label>
          <select
            value={filtroParceria}
            onChange={e => setFiltroParceria(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {PARCEIROS.map(p => <option key={p} value={p}>{parceiraLabel(p)}</option>)}
          </select>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            if (window.confirm(`Liquidar todas as movimentações pendentes de ${mesLabel}?`)) {
              liquidarTodos.mutate({ competencia, parceria_id: filtroParceria || undefined })
            }
          }}
          loading={liquidarTodos.isPending}
          disabled={!movimentacoes.some(m => m.status === 'pendente')}
        >
          <CheckCircle size={16} />
          Liquidar Competência
        </Button>
      </div>

      {/* Cards de saldo */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {PARCEIROS.map(p => {
          const s = saldos.find(x => x.parceria_id === p)
          const saldo = s ? Number(s.saldo) : 0
          const credito = s ? Number(s.total_credito) : 0
          const debito  = s ? Number(s.total_debito)  : 0
          const positivo = saldo >= 0
          return (
            <div
              key={p}
              className={`rounded-xl border p-4 ${positivo
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                {parceiraLabel(p)}
              </p>
              <p className={`text-xl font-bold ${positivo ? 'text-green-700' : 'text-red-700'}`}>
                {fmt.moeda(saldo)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                +{fmt.moeda(credito)} / -{fmt.moeda(debito)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Resumo consolidado */}
      {saldos.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <TrendingUp size={16} className="text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              A receber: {fmt.moeda(totalSaldoPositivo)}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <TrendingDown size={16} className="text-red-600" />
            <span className="text-sm text-red-700 font-medium">
              A pagar: {fmt.moeda(Math.abs(totalSaldoNegativo))}
            </span>
          </div>
        </div>
      )}

      {/* Tabela de movimentações */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Wallet size={18} className="text-[#1F3864]" />
          <h2 className="font-semibold text-gray-800">Extrato — {mesLabel}</h2>
          <span className="ml-auto text-sm text-gray-400">{movimentacoes.length} movimentação(ões)</span>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Carregando...</p>
          ) : movimentacoes.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Nenhuma movimentação neste período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Parceria</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-left">Descrição</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimentacoes.map(m => (
                  <tr key={m.id} className={`hover:bg-gray-50 ${m.status === 'cancelado' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium">{parceiraLabel(m.parceria_id)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 font-medium ${
                        m.tipo === 'credito' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {m.tipo === 'credito'
                          ? <TrendingUp size={14} />
                          : <TrendingDown size={14} />}
                        {m.tipo === 'credito' ? 'Crédito' : 'Débito'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {CATEGORIAS.find(c => c.value === m.categoria)?.label ?? m.categoria}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.descricao ?? '—'}</td>
                    <td className={`px-4 py-3 text-right font-semibold font-numeric ${
                      m.tipo === 'credito' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {m.tipo === 'credito' ? '+' : '-'}{fmt.moeda(m.valor)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_BADGE[m.status] ?? 'default'}>
                        {STATUS_LABEL[m.status] ?? m.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {m.status === 'pendente' && (
                          <>
                            <button
                              title="Liquidar"
                              onClick={() => setConfirmLiquidar(m.id)}
                              className="p-1 rounded hover:bg-green-100 text-green-600"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              title="Cancelar"
                              onClick={() => cancelar.mutate(m.id)}
                              className="p-1 rounded hover:bg-red-100 text-red-500"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button
                          title="Ver histórico"
                          onClick={() => abrirLog(m.id)}
                          className="p-1 rounded hover:bg-blue-100 text-blue-500"
                        >
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal nova movimentação */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Movimentação">
        <div className="space-y-4">
          <Select
            label="Parceria"
            value={form.parceria_id}
            onChange={e => setForm(f => ({ ...f, parceria_id: e.target.value }))}
          >
            {PARCEIROS.map(p => <option key={p} value={p}>{parceiraLabel(p)}</option>)}
          </Select>

          <Select
            label="Tipo"
            value={form.tipo}
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoMovimentacao }))}
          >
            <option value="debito">Débito (saída)</option>
            <option value="credito">Crédito (entrada)</option>
          </Select>

          <Select
            label="Categoria"
            value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaMovimentacao }))}
          >
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>

          <Input
            label="Valor (R$)"
            type="number"
            min="0.01"
            step="0.01"
            value={form.valor}
            onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
            placeholder="0,00"
          />

          <Input
            label="Descrição"
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Ex: Aluguel sala — setembro/2026"
          />

          <p className="text-xs text-gray-400">
            Competência: <strong>{mesLabel}</strong>
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSalvar}
              loading={criarMov.isPending}
              disabled={!form.valor}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal log */}
      <Modal open={!!logMovId} onClose={() => setLogMovId(null)} title="Histórico da Movimentação">
        {loadingLog ? (
          <p className="text-sm text-gray-400 py-4 text-center">Carregando...</p>
        ) : logEntradas.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhum registro de auditoria.</p>
        ) : (
          <div className="space-y-2">
            {logEntradas.map(e => (
              <div key={e.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-[#1F3864] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {ACAO_LABEL[e.acao] ?? e.acao}
                    {e.campo && <span className="text-gray-500 font-normal"> — {e.campo}</span>}
                  </p>
                  {e.valor_anterior && e.valor_novo && (
                    <p className="text-xs text-gray-500">
                      {e.valor_anterior} → <span className="font-medium">{e.valor_novo}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {e.usuario_nome ?? 'Sistema'} · {new Date(e.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={() => setLogMovId(null)}>Fechar</Button>
        </div>
      </Modal>

      {/* Confirm liquidar individual */}
      {confirmLiquidar && (
        <Modal open={!!confirmLiquidar} onClose={() => setConfirmLiquidar(null)} title="Confirmar Liquidação">
          <p className="text-sm text-gray-600 mb-4">Deseja marcar esta movimentação como liquidada?</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmLiquidar(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                liquidar.mutate(confirmLiquidar)
                setConfirmLiquidar(null)
              }}
              loading={liquidar.isPending}
            >
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
