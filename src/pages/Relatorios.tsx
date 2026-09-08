import { useState } from 'react'
import { FileDown, FileText, AlertTriangle, TrendingUp, ArrowLeftRight } from 'lucide-react'
import { Card, Button, FiltroData } from '@/components/ui'
import { useLancamentos } from '@/hooks/useLancamentos'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/contexts/PerfilContext'
import {
  gerarRelatorioLancamentos,
  gerarRelatorioInadimplencia,
  gerarRelatorioRateio,
  gerarRelatorioMensalRepasses,
  exportarRepassesMensalExcel,
} from '@/services/relatorio'
import type { ParceriaId } from '@/types'

function useParcelas(status?: string) {
  return useQuery({
    queryKey: ['parcelas-relatorio', status],
    queryFn: async () => {
      let q = supabase
        .from('parcelas')
        .select('*, lancamentos(paciente, parceria_id)')
        .order('data_vencimento', { ascending: true })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export default function Relatorios() {
  const { perfil } = usePerfil()
  const usuarioNome = perfil?.nome ?? 'Usuário'

  // Filtros — Lançamentos
  const [filtrosLanc, setFiltrosLanc] = useState<{
    dataInicio?: string
    dataFim?: string
    parceria?: string
  }>({})

  // Filtros — Rateio Mensal
  const mesAtual = new Date().toISOString().slice(0, 7)
  const [mesRateio, setMesRateio] = useState(mesAtual)

  // Filtros — Repasses Mensais
  const mesAtualRepasses = new Date().toISOString().slice(0, 7)
  const [mesRepasses, setMesRepasses] = useState(mesAtualRepasses)

  const [gerandoLanc, setGerandoLanc]       = useState(false)
  const [gerandoInad, setGerandoInad]       = useState(false)
  const [gerandoRateio, setGerandoRateio]   = useState(false)
  const [gerandoRep, setGerandoRep]         = useState(false)
  const [exportandoRep, setExportandoRep]   = useState(false)

  const { data: lancamentos    } = useLancamentos(filtrosLanc)
  const { data: parcelasVencidas } = useParcelas('vencido')

  const { data: repassesMes } = useQuery({
    queryKey: ['repasses-mes-relatorio', mesRepasses],
    queryFn: async () => {
      const inicio = `${mesRepasses}-01`
      const fim    = new Date(Number(mesRepasses.slice(0,4)), Number(mesRepasses.slice(5,7)), 0)
        .toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('repasses')
        .select('*, lancamentos(data_atendimento, paciente, parceria_id, data_pagamento)')
        .gte('created_at', inicio)
        .lte('created_at', fim + 'T23:59:59')
        .order('tipo')
      if (error) throw error
      return data ?? []
    },
  })

  const mesRepassesLabel = mesRepasses
    ? new Date(mesRepasses + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : ''

  const handleRepassesPDF = async () => {
    if (!repassesMes?.length) return
    setGerandoRep(true)
    try { await gerarRelatorioMensalRepasses(repassesMes, mesRepassesLabel, usuarioNome) }
    finally { setGerandoRep(false) }
  }

  const handleRepassesExcel = async () => {
    if (!repassesMes?.length) return
    setExportandoRep(true)
    try { exportarRepassesMensalExcel(repassesMes, mesRepassesLabel) }
    finally { setExportandoRep(false) }
  }

  const mesLabel = mesRateio
    ? new Date(mesRateio + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : ''

  const lancamentosMes = (lancamentos ?? []).filter(l =>
    l.data_atendimento.startsWith(mesRateio)
  )

  const handleLancamentos = async () => {
    if (!lancamentos?.length) return
    setGerandoLanc(true)
    try {
      await gerarRelatorioLancamentos(lancamentos, filtrosLanc, usuarioNome)
    } finally {
      setGerandoLanc(false)
    }
  }

  const handleInadimplencia = async () => {
    if (!parcelasVencidas?.length) return
    setGerandoInad(true)
    try {
      await gerarRelatorioInadimplencia(parcelasVencidas, usuarioNome)
    } finally {
      setGerandoInad(false)
    }
  }

  const handleRateio = async () => {
    if (!lancamentosMes.length) return
    setGerandoRateio(true)
    try {
      await gerarRelatorioRateio(lancamentosMes, mesLabel, usuarioNome)
    } finally {
      setGerandoRateio(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864]">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">Gere relatórios em PDF com logo e rodapé de acesso restrito</p>
      </div>

      {/* Relatório de Lançamentos */}
      <Card>
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Relatório de Lançamentos</h2>
              <p className="text-sm text-gray-500">Todos os atendimentos com rateio detalhado</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parceria</label>
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                onChange={e => setFiltrosLanc(f => ({ ...f, parceria: e.target.value || undefined }))}>
                <option value="">Todas</option>
                {(['A','B','C'] as ParceriaId[]).map(p => <option key={p} value={p}>Parceria {p}</option>)}
              </select>
            </div>
            <FiltroData
              dataInicio={filtrosLanc.dataInicio ?? ''}
              dataFim={filtrosLanc.dataFim ?? ''}
              onChangeInicio={v => setFiltrosLanc(f => ({ ...f, dataInicio: v || undefined }))}
              onChangeFim={v => setFiltrosLanc(f => ({ ...f, dataFim: v || undefined }))}
              onLimpar={() => setFiltrosLanc(f => ({ ...f, dataInicio: undefined, dataFim: undefined }))}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleLancamentos} loading={gerandoLanc} disabled={!lancamentos?.length}>
              <FileDown size={16} />
              {gerandoLanc ? 'Gerando...' : 'Gerar PDF'}
            </Button>
            <p className="text-sm text-gray-500">
              {lancamentos?.length ?? 0} lançamento(s) encontrado(s)
            </p>
          </div>
        </div>
      </Card>

      {/* Relatório de Inadimplência */}
      <Card>
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Relatório de Inadimplência</h2>
              <p className="text-sm text-gray-500">Parcelas vencidas e não pagas, com dias em atraso</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleInadimplencia}
              loading={gerandoInad}
              disabled={!parcelasVencidas?.length}
              className="bg-red-600 hover:bg-red-700"
            >
              <FileDown size={16} />
              {gerandoInad ? 'Gerando...' : 'Gerar PDF'}
            </Button>
            <p className="text-sm text-gray-500">
              {parcelasVencidas?.length ?? 0} parcela(s) vencida(s)
            </p>
          </div>
        </div>
      </Card>

      {/* Relatório de Rateio Mensal */}
      <Card>
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-700">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Relatório de Rateio Mensal</h2>
              <p className="text-sm text-gray-500">Consolidado por parceria e detalhamento de lançamentos do mês</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Competência</label>
              <input
                type="month"
                value={mesRateio}
                onChange={e => setMesRateio(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleRateio} loading={gerandoRateio} disabled={!lancamentosMes.length}
              className="bg-green-700 hover:bg-green-800">
              <FileDown size={16} />
              {gerandoRateio ? 'Gerando...' : 'Gerar PDF'}
            </Button>
            <p className="text-sm text-gray-500">
              {lancamentosMes.length} lançamento(s) em {mesLabel}
            </p>
          </div>
        </div>
      </Card>
      {/* Relatório Mensal de Repasses */}
      <Card>
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Relatório Mensal de Repasses</h2>
              <p className="text-sm text-gray-500">Consolidado por profissional com detalhamento de repasses do mês</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Competência</label>
              <input
                type="month"
                value={mesRepasses}
                onChange={e => setMesRepasses(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleRepassesPDF} loading={gerandoRep} disabled={!repassesMes?.length}
              className="bg-indigo-700 hover:bg-indigo-800">
              <FileDown size={16} />
              {gerandoRep ? 'Gerando...' : 'Gerar PDF'}
            </Button>
            <Button onClick={handleRepassesExcel} loading={exportandoRep} disabled={!repassesMes?.length}
              className="bg-emerald-700 hover:bg-emerald-800">
              <FileDown size={16} />
              {exportandoRep ? 'Exportando...' : 'Exportar Excel'}
            </Button>
            <p className="text-sm text-gray-500">
              {repassesMes?.length ?? 0} repasse(s) em {mesRepassesLabel}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
