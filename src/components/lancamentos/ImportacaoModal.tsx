import { useState, useRef } from 'react'
import { Upload, Download, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react'
import { Modal, Button } from '@/components/ui'
import { importarEmLote } from '@/services/lancamentos'
import type { ParceriaCompleta } from '@/types'

interface LinhaImportacao {
  idx: number
  data_atendimento: string
  paciente: string
  nome_responsavel?: string
  valor_total: number
  parceria_id: string
  forma_pagamento: 'avista' | 'parcelado'
  num_parcelas: number
  erros: string[]
}

const COLUNAS_ESPERADAS = [
  'data_atendimento',
  'paciente',
  'nome_responsavel',
  'valor_total',
  'parceria',
  'forma_pagamento',
  'num_parcelas',
]

function parseData(raw: string): string | null {
  if (!raw) return null
  // Aceita DD/MM/YYYY ou YYYY-MM-DD
  const ddmm = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddmm) return `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}$/)
  if (iso) return raw
  return null
}

function validarLinha(
  row: Record<string, string>,
  idx: number,
  parcerias: ParceriaCompleta[],
): LinhaImportacao {
  const erros: string[] = []

  const dataRaw = (row['data_atendimento'] ?? '').trim()
  const data = parseData(dataRaw)
  if (!data) erros.push('data_atendimento inválida (use DD/MM/AAAA ou AAAA-MM-DD)')

  const paciente = (row['paciente'] ?? '').trim()
  if (!paciente) erros.push('paciente obrigatório')

  const valorRaw = (row['valor_total'] ?? '').replace(',', '.')
  const valor = parseFloat(valorRaw)
  if (isNaN(valor) || valor <= 0) erros.push('valor_total inválido')

  const parceriaNome = (row['parceria'] ?? '').trim().toLowerCase()
  const parceria = parcerias.find(
    p => p.descricao.toLowerCase() === parceriaNome || p.id === row['parceria']?.trim()
  )
  if (!parceria) erros.push(`parceria "${row['parceria']}" não encontrada`)

  const formaRaw = (row['forma_pagamento'] ?? 'vista').trim().toLowerCase()
  const forma: 'avista' | 'parcelado' = formaRaw === 'parcelado' ? 'parcelado' : 'avista'

  const numParc = parseInt(row['num_parcelas'] ?? '1', 10)
  const num_parcelas = isNaN(numParc) || numParc < 1 ? 1 : numParc

  return {
    idx,
    data_atendimento: data ?? dataRaw,
    paciente,
    nome_responsavel: (row['nome_responsavel'] ?? '').trim() || undefined,
    valor_total: isNaN(valor) ? 0 : valor,
    parceria_id: parceria?.id ?? '',
    forma_pagamento: forma,
    num_parcelas,
    erros,
  }
}

export function ImportacaoModal({
  open,
  onClose,
  parcerias,
}: {
  open: boolean
  onClose: () => void
  parcerias: ParceriaCompleta[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [linhas, setLinhas] = useState<LinhaImportacao[]>([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: number; erros: number } | null>(null)
  const [fase, setFase] = useState<'upload' | 'preview' | 'concluido'>('upload')

  const validas   = linhas.filter(l => l.erros.length === 0)
  const invalidas = linhas.filter(l => l.erros.length > 0)

  async function handleArquivo(file: File) {
    // Importação dinâmica da lib xlsx (já no package.json)
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    if (rows.length === 0) {
      alert('Arquivo vazio ou sem dados na primeira aba.')
      return
    }

    const parsed = rows.map((row, i) => validarLinha(row, i + 2, parcerias))
    setLinhas(parsed)
    setFase('preview')
    setResultado(null)
  }

  async function handleImportar() {
    if (validas.length === 0) return
    setImportando(true)
    try {
      await importarEmLote(validas.map(l => ({
        data_atendimento: l.data_atendimento,
        paciente:         l.paciente,
        nome_responsavel: l.nome_responsavel,
        valor_total:      l.valor_total,
        parceria_id:      l.parceria_id as import('@/types').ParceriaId,
        forma_pagamento:  l.forma_pagamento,
        num_parcelas:     l.num_parcelas,
      })))
      setResultado({ ok: validas.length, erros: invalidas.length })
      setFase('concluido')
    } catch (e) {
      alert(`Erro ao importar: ${(e as Error).message}`)
    } finally {
      setImportando(false)
    }
  }

  function handleReset() {
    setLinhas([])
    setFase('upload')
    setResultado(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function baixarTemplate() {
    const XLSX = import('xlsx')
    XLSX.then(X => {
      const ws = X.utils.aoa_to_sheet([
        COLUNAS_ESPERADAS,
        ['15/09/2026', 'João da Silva', '', '250,00', 'Parceria A', 'vista', '1'],
        ['20/09/2026', 'Maria Souza',   'José Souza', '600,00', 'Parceria B', 'parcelado', '3'],
      ])
      const wb = X.utils.book_new()
      X.utils.book_append_sheet(wb, ws, 'Importacao')
      X.writeFile(wb, 'template_importacao.xlsx')
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar Lançamentos via Excel">
      <div className="space-y-4">

        {/* FASE: UPLOAD */}
        {fase === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Faça upload de um arquivo <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.xlsx</code> com os lançamentos.
              A primeira linha deve conter os cabeçalhos exatos.
            </p>

            <div className="flex gap-2">
              <button
                onClick={baixarTemplate}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                <Download size={14} /> Baixar template
              </button>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) handleArquivo(file)
              }}
            >
              <Upload size={32} className="mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-500">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-xs text-gray-400 mt-1">Somente .xlsx</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleArquivo(file)
                }}
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">Colunas esperadas:</p>
              {COLUNAS_ESPERADAS.map(c => (
                <p key={c}><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{c}</code>{c === 'nome_responsavel' || c === 'num_parcelas' ? ' (opcional)' : ''}</p>
              ))}
            </div>
          </div>
        )}

        {/* FASE: PREVIEW */}
        {fase === 'preview' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                  <CheckCircle size={15} /> {validas.length} válidas
                </span>
                {invalidas.length > 0 && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                    <XCircle size={15} /> {invalidas.length} com erro
                  </span>
                )}
              </div>
              <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 underline">
                Trocar arquivo
              </button>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-xs border-collapse min-w-[640px]">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Linha</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Paciente</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Data</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Valor</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Parceria</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(l => {
                    const ok = l.erros.length === 0
                    const parceria = parcerias.find(p => p.id === l.parceria_id)
                    return (
                      <tr key={l.idx} className={ok ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}>
                        <td className="px-3 py-1.5 text-gray-400">{l.idx}</td>
                        <td className="px-3 py-1.5 font-medium">{l.paciente || '—'}</td>
                        <td className="px-3 py-1.5">{l.data_atendimento || '—'}</td>
                        <td className="px-3 py-1.5">
                          {l.valor_total > 0
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.valor_total)
                            : '—'}
                        </td>
                        <td className="px-3 py-1.5">{parceria?.descricao ?? (l.parceria_id || '—')}</td>
                        <td className="px-3 py-1.5">
                          {ok
                            ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={12} /> OK</span>
                            : <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {l.erros.join('; ')}</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {invalidas.length > 0 && validas.length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
                Apenas as {validas.length} linhas válidas serão importadas. Corrija o arquivo para incluir as demais.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button onClick={handleReset} className="bg-gray-100 hover:bg-gray-200 text-gray-700">
                Cancelar
              </Button>
              <Button
                onClick={handleImportar}
                disabled={validas.length === 0 || importando}
              >
                {importando
                  ? <><Loader size={14} className="animate-spin" /> Importando...</>
                  : <>Importar {validas.length} lançamento{validas.length !== 1 ? 's' : ''}</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* FASE: CONCLUIDO */}
        {fase === 'concluido' && resultado && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle size={48} className="mx-auto text-green-500" />
            <div>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {resultado.ok} lançamento{resultado.ok !== 1 ? 's' : ''} importado{resultado.ok !== 1 ? 's' : ''}!
              </p>
              {resultado.erros > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {resultado.erros} linha{resultado.erros !== 1 ? 's' : ''} ignorada{resultado.erros !== 1 ? 's' : ''} por erro de validação.
                </p>
              )}
            </div>
            <Button onClick={onClose}>Fechar</Button>
          </div>
        )}

      </div>
    </Modal>
  )
}
