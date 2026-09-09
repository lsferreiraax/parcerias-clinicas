import { useState } from 'react'
import { FileDown, Pencil, CheckCircle, XCircle, Clock, History, FileText } from 'lucide-react'
import { Card, Button, Badge, Modal, FiltroData } from '@/components/ui'
import {
  useRepasses, useEditarValorRepasse, useConciliarRepasse,
  useDesconciliarRepasse, useConciliarEmLote, useLogRepasse,
} from '@/hooks/useRepasses'
import { fmt } from '@/lib/utils'
import { gerarRelatorioRepasse, exportarRepasseExcel } from '@/services/relatorio'
import { usePerfil } from '@/contexts/PerfilContext'
import type { TipoRepasse, StatusRepasse, Repasse } from '@/types'

const TIPOS: { tipo: TipoRepasse; label: string; cor: string }[] = [
  { tipo: 'medico', label: 'Médico',  cor: 'text-green-700'  },
  { tipo: 'camta',  label: 'Camta',   cor: 'text-blue-700'   },
  { tipo: 'psi1',   label: 'Psi 1',   cor: 'text-yellow-700' },
  { tipo: 'psi2',   label: 'Psi 2',   cor: 'text-orange-700' },
]

function StatusBadge({ status }: { status: StatusRepasse }) {
  return status === 'conciliado'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium"><CheckCircle size={11} />Conciliado</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium"><Clock size={11} />Não Conciliado</span>
}

function ModalLog({ repasseId, onClose }: { repasseId: string; onClose: () => void }) {
  const { data: logs, isLoading } = useLogRepasse(repasseId)

  const CAMPO_LABEL: Record<string, string> = {
    valor_repasse: 'Valor do repasse',
    status: 'Situação',
    data_repasse: 'Data do repasse',
  }

  return (
    <Modal open onClose={onClose} title="Histórico de Alterações">
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {isLoading && <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>}
        {!isLoading && (!logs || logs.length === 0) && (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma alteração registrada.</p>
        )}
        {(logs ?? []).map(log => (
          <div key={log.id} className="border border-gray-100 rounded-lg px-4 py-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-700">{CAMPO_LABEL[log.campo] ?? log.campo}</span>
              <span className="text-xs text-gray-400">{new Date(log.alterado_em).toLocaleString('pt-BR')}</span>
            </div>
            <p className="text-gray-500 text-xs">
              <span className="line-through text-red-400">{log.valor_anterior ?? '—'}</span>
              {' → '}
              <span className="text-green-600 font-medium">{log.valor_novo ?? '—'}</span>
            </p>
            {log.motivo && <p className="text-xs text-gray-400 mt-1 italic">Motivo: {log.motivo}</p>}
          </div>
        ))}
      </div>
      <div className="pt-4">
        <Button variant="secondary" className="w-full" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  )
}

export default function Repasses() {
  const { perfil } = usePerfil()
  const usuarioNome = perfil?.nome ?? 'Usuário'

  const [abaAtiva, setAbaAtiva]   = useState<TipoRepasse>('medico')
  const [filtroStatus, setFiltroStatus] = useState<StatusRepasse | ''>('')
  const [filtroPaciente, setFiltroPaciente] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim]       = useState('')
  const [filtroRepasseInicio, setFiltroRepasseInicio] = useState('')
  const [filtroRepasseFim, setFiltroRepasseFim]       = useState('')

  // Modais
  const [modalEditar, setModalEditar]     = useState<Repasse | null>(null)
  const [modalLog, setModalLog]           = useState<string | null>(null)
  const [modalConciliar, setModalConciliar] = useState<Repasse | null>(null)
  const [modalDesconciliar, setModalDesconciliar] = useState<Repasse | null>(null)
  const [modalLote, setModalLote]         = useState(false)

  // Formulários dos modais
  const [novoValor, setNovoValor]         = useState('')
  const [motivoEdicao, setMotivoEdicao]   = useState('')
  const [motivoDesc, setMotivoDesc]       = useState('')
  const [dataRepasse, setDataRepasse]     = useState(new Date().toISOString().split('T')[0])
  const [selecionados, setSelecionados]   = useState<Set<string>>(new Set())

  const [gerandoPDF, setGerandoPDF]       = useState(false)

  const filtro = {
    tipo: abaAtiva,
    ...(filtroStatus ? { status: filtroStatus as StatusRepasse } : {}),
    ...(filtroPaciente ? { paciente: filtroPaciente } : {}),
    ...(filtroDataInicio ? { dataInicio: filtroDataInicio } : {}),
    ...(filtroDataFim    ? { dataFim: filtroDataFim }       : {}),
    ...(filtroRepasseInicio ? { dataRepasseInicio: filtroRepasseInicio } : {}),
    ...(filtroRepasseFim    ? { dataRepasseFim: filtroRepasseFim }       : {}),
  }

  const { data: repasses, isLoading } = useRepasses(filtro)
  const editarValor      = useEditarValorRepasse()
  const conciliar        = useConciliarRepasse()
  const desconciliar     = useDesconciliarRepasse()
  const conciliarLote    = useConciliarEmLote()

  const totalRepasse    = (repasses ?? []).reduce((s, r) => s + Number(r.valor_repasse), 0)
  const totalConciliado = (repasses ?? []).filter(r => r.status === 'conciliado').reduce((s, r) => s + Number(r.valor_repasse), 0)
  const totalPendente   = (repasses ?? []).filter(r => r.status === 'nao_conciliado').reduce((s, r) => s + Number(r.valor_repasse), 0)

  const naoConcilidosSelecionaveis = (repasses ?? []).filter(r => r.status === 'nao_conciliado')
  const todosSelecionados = naoConcilidosSelecionaveis.length > 0 && naoConcilidosSelecionaveis.every(r => selecionados.has(r.id))

  const toggleSelecionado = (id: string) =>
    setSelecionados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleTodos = () =>
    setSelecionados(todosSelecionados ? new Set() : new Set(naoConcilidosSelecionaveis.map(r => r.id)))

  const handleAbrirEditar = (r: Repasse) => {
    setNovoValor(String(r.valor_repasse))
    setMotivoEdicao('')
    setModalEditar(r)
  }

  const handleSalvarEdicao = async () => {
    if (!modalEditar || !motivoEdicao.trim() || !novoValor) return
    await editarValor.mutateAsync({ id: modalEditar.id, novoValor: Number(novoValor), motivo: motivoEdicao.trim() })
    setModalEditar(null)
  }

  const handleConciliar = async () => {
    if (!modalConciliar || !dataRepasse) return
    await conciliar.mutateAsync({ id: modalConciliar.id, dataRepasse })
    setModalConciliar(null)
  }

  const handleDesconciliar = async () => {
    if (!modalDesconciliar || !motivoDesc.trim()) return
    await desconciliar.mutateAsync({ id: modalDesconciliar.id, motivo: motivoDesc.trim() })
    setModalDesconciliar(null)
    setMotivoDesc('')
  }

  const handleConciliarLote = async () => {
    if (selecionados.size === 0 || !dataRepasse) return
    await conciliarLote.mutateAsync({ ids: Array.from(selecionados), dataRepasse })
    setSelecionados(new Set())
    setModalLote(false)
  }

  const handleGerarPDF = async () => {
    if (!repasses?.length) return
    setGerandoPDF(true)
    try {
      await gerarRelatorioRepasse(repasses, abaAtiva, usuarioNome, {
        inicio: filtroDataInicio || undefined,
        fim:    filtroDataFim    || undefined,
      })
    } finally {
      setGerandoPDF(false)
    }
  }

  const handleExportarExcel = () => {
    if (!repasses?.length) return
    exportarRepasseExcel(repasses, abaAtiva)
  }

  const tipoLabel = TIPOS.find(t => t.tipo === abaAtiva)?.label ?? ''

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Repasses</h1>
          <p className="text-gray-500 text-sm mt-1">Controle de repasse financeiro por profissional</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selecionados.size > 0 && (
            <Button onClick={() => setModalLote(true)} className="bg-green-700 hover:bg-green-800">
              <CheckCircle size={15} />
              Conciliar selecionados ({selecionados.size})
            </Button>
          )}
          <Button variant="secondary" onClick={handleExportarExcel} disabled={!repasses?.length}>
            <FileDown size={15} />
            Excel
          </Button>
          <Button variant="secondary" onClick={handleGerarPDF} loading={gerandoPDF} disabled={!repasses?.length}>
            <FileText size={15} />
            PDF
          </Button>
        </div>
      </div>

      {/* Abas por profissional */}
      <div className="flex border-b border-gray-200">
        {TIPOS.map(({ tipo, label, cor }) => (
          <button
            key={tipo}
            onClick={() => { setAbaAtiva(tipo); setSelecionados(new Set()) }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === tipo
                ? `border-[#1F3864] ${cor}`
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <div className="px-4 md:px-6 py-4 flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Paciente</label>
            <input
              type="text"
              placeholder="Nome do paciente..."
              value={filtroPaciente}
              onChange={e => setFiltroPaciente(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-48"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Situação</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as StatusRepasse | '')}>
              <option value="">Todas</option>
              <option value="conciliado">Conciliados</option>
              <option value="nao_conciliado">Não Conciliados</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Período de atendimento</label>
            <FiltroData
              dataInicio={filtroDataInicio}
              dataFim={filtroDataFim}
              onChangeInicio={setFiltroDataInicio}
              onChangeFim={setFiltroDataFim}
              onLimpar={() => { setFiltroDataInicio(''); setFiltroDataFim('') }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data do repasse</label>
            <FiltroData
              dataInicio={filtroRepasseInicio}
              dataFim={filtroRepasseFim}
              onChangeInicio={setFiltroRepasseInicio}
              onChangeFim={setFiltroRepasseFim}
              onLimpar={() => { setFiltroRepasseInicio(''); setFiltroRepasseFim('') }}
            />
          </div>
        </div>
      </Card>

      {/* KPIs da aba */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total',        value: totalRepasse,    color: 'text-[#1F3864]' },
          { label: 'Conciliado',   value: totalConciliado, color: 'text-green-700' },
          { label: 'Não Conciliado', value: totalPendente, color: 'text-yellow-700' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div className="px-5 py-4">
              <p className="text-xs text-gray-500">{label} — {tipoLabel}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{fmt.moeda(value)}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        {/* Versão desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} className="rounded border-gray-300 text-[#1F3864] focus:ring-[#1F3864]" title="Selecionar todos não conciliados" />
                </th>
                {['Dt. Atendimento','Paciente','Parceria','Dt. Pagamento','Vl. Original','Vl. Repasse','Dt. Repasse','Situação','Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>}
              {!isLoading && (!repasses || repasses.length === 0) && <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-400">Nenhum repasse encontrado</td></tr>}
              {(repasses ?? []).map(r => {
                const isSel = selecionados.has(r.id)
                const valAlterado = Number(r.valor_repasse) !== Number(r.valor_original)
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${isSel ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={isSel} disabled={r.status === 'conciliado'} onChange={() => toggleSelecionado(r.id)} className="rounded border-gray-300 text-[#1F3864] focus:ring-[#1F3864] disabled:opacity-30 disabled:cursor-not-allowed" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.lancamentos?.data_atendimento ? fmt.data(r.lancamentos.data_atendimento) : '—'}</td>
                    <td className="px-4 py-3 font-medium">{r.lancamentos?.paciente ?? '—'}</td>
                    <td className="px-4 py-3">{r.lancamentos?.parceria_id ? <Badge variant={r.lancamentos.parceria_id as 'A'|'B'|'C'}>Parceria {r.lancamentos.parceria_id}</Badge> : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.lancamentos?.data_pagamento ? fmt.data(r.lancamentos.data_pagamento) : '—'}</td>
                    <td className="px-4 py-3">{fmt.moeda(Number(r.valor_original))}</td>
                    <td className="px-4 py-3 font-semibold">
                      <span className={valAlterado ? 'text-orange-600' : ''}>{fmt.moeda(Number(r.valor_repasse))}</span>
                      {valAlterado && <span className="ml-1 text-xs text-orange-400" title="Valor editado">✎</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.data_repasse ? fmt.data(r.data_repasse) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.status === 'nao_conciliado' && <button onClick={() => { setDataRepasse(new Date().toISOString().split('T')[0]); setModalConciliar(r) }} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Conciliar"><CheckCircle size={15} /></button>}
                        {r.status === 'conciliado' && <button onClick={() => { setMotivoDesc(''); setModalDesconciliar(r) }} className="p-1.5 text-yellow-500 hover:bg-yellow-50 rounded" title="Desfazer conciliação"><XCircle size={15} /></button>}
                        <button onClick={() => handleAbrirEditar(r)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Editar valor"><Pencil size={15} /></button>
                        <button onClick={() => setModalLog(r.id)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded" title="Histórico"><History size={15} /></button>
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
          {!isLoading && (!repasses || repasses.length === 0) && <p className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum repasse encontrado</p>}
          {(repasses ?? []).map(r => {
            const isSel = selecionados.has(r.id)
            const valAlterado = Number(r.valor_repasse) !== Number(r.valor_original)
            return (
              <div key={r.id} className={`p-4 space-y-3 ${isSel ? 'bg-blue-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input type="checkbox" checked={isSel} disabled={r.status === 'conciliado'} onChange={() => toggleSelecionado(r.id)} className="rounded border-gray-300 text-[#1F3864] disabled:opacity-30 shrink-0" />
                    <span className="font-semibold text-gray-900 truncate">{r.lancamentos?.paciente ?? '—'}</span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                  {r.lancamentos?.parceria_id && <Badge variant={r.lancamentos.parceria_id as 'A'|'B'|'C'}>Parceria {r.lancamentos.parceria_id}</Badge>}
                  {r.lancamentos?.data_atendimento && <span>Atend. {fmt.data(r.lancamentos.data_atendimento)}</span>}
                  {r.lancamentos?.data_pagamento && <span>Pago {fmt.data(r.lancamentos.data_pagamento)}</span>}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Valor original</p>
                    <p className="font-medium">{fmt.moeda(Number(r.valor_original))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Valor repasse</p>
                    <p className={`font-bold ${valAlterado ? 'text-orange-600' : ''}`}>
                      {fmt.moeda(Number(r.valor_repasse))}{valAlterado && ' ✎'}
                    </p>
                  </div>
                  {r.data_repasse && (
                    <div>
                      <p className="text-xs text-gray-400">Data repasse</p>
                      <p className="font-medium">{fmt.data(r.data_repasse)}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap pt-1">
                  {r.status === 'nao_conciliado' && (
                    <button onClick={() => { setDataRepasse(new Date().toISOString().split('T')[0]); setModalConciliar(r) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle size={13} /> Conciliar
                    </button>
                  )}
                  {r.status === 'conciliado' && (
                    <button onClick={() => { setMotivoDesc(''); setModalDesconciliar(r) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <XCircle size={13} /> Desfazer
                    </button>
                  )}
                  <button onClick={() => handleAbrirEditar(r)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
                    <Pencil size={13} /> Editar valor
                  </button>
                  <button onClick={() => setModalLog(r.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                    <History size={13} /> Histórico
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Modal: Editar Valor */}
      {modalEditar && (
        <Modal open onClose={() => setModalEditar(null)} title="Editar Valor de Repasse">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500">Paciente: <span className="font-medium text-gray-800">{modalEditar.lancamentos?.paciente}</span></p>
              <p className="text-gray-500 mt-1">Valor original: <span className="font-medium">{fmt.moeda(Number(modalEditar.valor_original))}</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Novo Valor (R$)</label>
              <input
                type="number" min={0} step={0.01}
                value={novoValor}
                onChange={e => setNovoValor(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo da alteração <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Descreva o motivo da alteração..."
                value={motivoEdicao}
                onChange={e => setMotivoEdicao(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setModalEditar(null)}>Cancelar</Button>
              <Button className="flex-1" loading={editarValor.isPending} disabled={!motivoEdicao.trim() || !novoValor} onClick={handleSalvarEdicao}>
                Salvar Alteração
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Conciliar */}
      {modalConciliar && (
        <Modal open onClose={() => setModalConciliar(null)} title="Conciliar Repasse">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500">Paciente: <span className="font-medium text-gray-800">{modalConciliar.lancamentos?.paciente}</span></p>
              <p className="text-gray-500 mt-1">Valor: <span className="font-semibold text-green-700">{fmt.moeda(Number(modalConciliar.valor_repasse))}</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Repasse</label>
              <input
                type="date" value={dataRepasse}
                onChange={e => setDataRepasse(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setModalConciliar(null)}>Cancelar</Button>
              <Button className="flex-1 bg-green-700 hover:bg-green-800" loading={conciliar.isPending} disabled={!dataRepasse} onClick={handleConciliar}>
                <CheckCircle size={15} /> Confirmar Conciliação
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Desfazer conciliação */}
      {modalDesconciliar && (
        <Modal open onClose={() => setModalDesconciliar(null)} title="Desfazer Conciliação">
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
              O repasse voltará para situação <strong>Não Conciliado</strong> e a data do repasse será removida.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3} placeholder="Descreva o motivo..."
                value={motivoDesc}
                onChange={e => setMotivoDesc(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setModalDesconciliar(null)}>Cancelar</Button>
              <Button className="flex-1" loading={desconciliar.isPending} disabled={!motivoDesc.trim()} onClick={handleDesconciliar}>
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Conciliar em lote */}
      <Modal open={modalLote} onClose={() => setModalLote(false)} title="Conciliar em Lote">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Você está conciliando <strong>{selecionados.size} repasse(s)</strong> de {tipoLabel}.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do Repasse</label>
            <input
              type="date" value={dataRepasse}
              onChange={e => setDataRepasse(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setModalLote(false)}>Cancelar</Button>
            <Button className="flex-1 bg-green-700 hover:bg-green-800" loading={conciliarLote.isPending} disabled={!dataRepasse} onClick={handleConciliarLote}>
              <CheckCircle size={15} /> Confirmar Conciliação
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Histórico */}
      {modalLog && <ModalLog repasseId={modalLog} onClose={() => setModalLog(null)} />}
    </div>
  )
}
