import { useState, useMemo } from 'react'
import { Plus, FileText, Trash2, Edit2, Download, Search, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useProntuarios, useCriarProntuario, useAtualizarProntuario, useDeletarProntuario } from '@/hooks/useProntuario'
import { useBuscarPacientes, usePacientes } from '@/hooks/usePacientes'
import type { Prontuario, NovoProntuario, TipoProntuario } from '@/services/prontuario'
import {
  TIPO_PRONTUARIO, formatarDataProntuario, labelTipo, corTipo,
} from '@/services/prontuario'
import type { Paciente } from '@/services/pacientes'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const VAZIO: NovoProntuario = {
  paciente_id: '',
  sessao_id: null,
  data_registro: new Date().toISOString().slice(0, 10),
  tipo: 'evolucao',
  queixa_principal: '',
  historico: '',
  avaliacao: '',
  plano_terapeutico: '',
  cid10: '',
}

function exportarPDF(paciente: Paciente | undefined, registros: Prontuario[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const nome = paciente?.nome ?? 'Paciente'
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Prontuário Eletrônico', 14, 18)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Paciente: ${nome}`, 14, 26)
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32)
  doc.line(14, 35, 196, 35)

  let y = 42
  registros.forEach((r, i) => {
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${i + 1}. ${labelTipo(r.tipo)} — ${formatarDataProntuario(r.data_registro)}`, 14, y)
    if (r.cid10) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text(`CID-10: ${r.cid10}`, 155, y)
    }
    y += 6

    const campos: [string, string | null | undefined][] = [
      ['Queixa Principal', r.queixa_principal],
      ['Histórico', r.historico],
      ['Avaliação', r.avaliacao],
      ['Plano Terapêutico', r.plano_terapeutico],
    ]

    campos.forEach(([label, val]) => {
      if (!val) return
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(label + ':', 14, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(val, 180)
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(line, 14, y)
        y += 4.5
      })
      y += 1
    })

    if (i < registros.length - 1) {
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setDrawColor(200)
      doc.line(14, y, 196, y)
      y += 5
    }
  })

  doc.save(`prontuario_${nome.replace(/\s+/g, '_').toLowerCase()}.pdf`)
}

function ModalProntuario({
  inicial,
  pacienteId,
  pacientes,
  onSalvar,
  onFechar,
}: {
  inicial?: Prontuario | null
  pacienteId: string
  pacientes: Paciente[]
  onSalvar: (dados: NovoProntuario) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState<NovoProntuario>(
    inicial
      ? {
          paciente_id: inicial.paciente_id,
          sessao_id: inicial.sessao_id,
          data_registro: inicial.data_registro,
          tipo: inicial.tipo,
          queixa_principal: inicial.queixa_principal ?? '',
          historico: inicial.historico ?? '',
          avaliacao: inicial.avaliacao ?? '',
          plano_terapeutico: inicial.plano_terapeutico ?? '',
          cid10: inicial.cid10 ?? '',
        }
      : { ...VAZIO, paciente_id: pacienteId }
  )

  const set = (k: keyof NovoProntuario, v: string | null) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.paciente_id || !form.data_registro || !form.tipo) return
    onSalvar(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {inicial ? 'Editar Registro' : 'Novo Registro'}
          </h2>
          <button onClick={onFechar} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Paciente *</label>
              <select
                value={form.paciente_id}
                onChange={e => set('paciente_id', e.target.value)}
                required
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Selecione...</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select
                value={form.tipo}
                onChange={e => set('tipo', e.target.value as TipoProntuario)}
                required
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {TIPO_PRONTUARIO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
              <input
                type="date"
                value={form.data_registro}
                onChange={e => set('data_registro', e.target.value)}
                required
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CID-10</label>
              <input
                type="text"
                value={form.cid10 ?? ''}
                onChange={e => set('cid10', e.target.value || null)}
                placeholder="Ex: F32.0"
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {([
            ['queixa_principal', 'Queixa Principal'],
            ['historico', 'Histórico'],
            ['avaliacao', 'Avaliação'],
            ['plano_terapeutico', 'Plano Terapêutico'],
          ] as [keyof NovoProntuario, string][]).map(([field, label]) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <textarea
                value={(form[field] as string) ?? ''}
                onChange={e => set(field, e.target.value || null)}
                rows={3}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
              />
            </div>
          ))}
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={e => { e.preventDefault(); handleSubmit(e as any) }}
            className="px-5 py-2 text-sm font-medium bg-[#1F3864] text-white rounded-lg hover:bg-[#162a4e] transition-colors"
          >
            {inicial ? 'Salvar alterações' : 'Criar registro'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CartaoProntuario({
  registro,
  onEditar,
  onDeletar,
}: {
  registro: Prontuario
  onEditar: (r: Prontuario) => void
  onDeletar: (id: string) => void
}) {
  const [expandido, setExpandido] = useState(false)

  const campos: [string, string | null | undefined][] = [
    ['Queixa Principal', registro.queixa_principal],
    ['Histórico', registro.historico],
    ['Avaliação', registro.avaliacao],
    ['Plano Terapêutico', registro.plano_terapeutico],
  ].filter(([, v]) => v) as [string, string][]

  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${corTipo(registro.tipo)}`}>
              {labelTipo(registro.tipo)}
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {formatarDataProntuario(registro.data_registro)}
            </span>
            {registro.cid10 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">CID-10: {registro.cid10}</span>
            )}
          </div>
          {registro.queixa_principal && !expandido && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{registro.queixa_principal}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEditar(registro)}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDeletar(registro.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={15} />
          </button>
          {campos.length > 0 && (
            <button
              onClick={() => setExpandido(e => !e)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={expandido ? 'Recolher' : 'Expandir'}
            >
              {expandido ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </div>
      </div>

      {expandido && campos.length > 0 && (
        <div className="border-t dark:border-gray-700 px-4 py-3 space-y-3 bg-gray-50 dark:bg-gray-900/30">
          {campos.map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{val}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Prontuario() {
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null)
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Prontuario | null>(null)
  const [confirmarDeletar, setConfirmarDeletar] = useState<string | null>(null)

  const { data: todosPacientes = [] } = usePacientes()
  const { data: sugestoes = [] } = useBuscarPacientes(buscaPaciente)
  const { data: registros = [], isLoading } = useProntuarios(pacienteSelecionado?.id)

  const criar = useCriarProntuario()
  const atualizar = useAtualizarProntuario()
  const deletar = useDeletarProntuario()

  const sugestoesVisiveis = useMemo(() => {
    if (buscaPaciente.length < 2) return []
    return sugestoes.slice(0, 8)
  }, [buscaPaciente, sugestoes])

  const selecionarPaciente = (p: Paciente) => {
    setPacienteSelecionado(p)
    setBuscaPaciente(p.nome)
    setMostrarSugestoes(false)
  }

  const limparPaciente = () => {
    setPacienteSelecionado(null)
    setBuscaPaciente('')
  }

  const handleSalvar = (dados: NovoProntuario) => {
    if (editando) {
      atualizar.mutate({ id: editando.id, dados }, {
        onSuccess: () => { setModalAberto(false); setEditando(null) }
      })
    } else {
      criar.mutate(dados, {
        onSuccess: () => setModalAberto(false)
      })
    }
  }

  const handleDeletar = (id: string) => {
    deletar.mutate(id, { onSuccess: () => setConfirmarDeletar(null) })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText size={22} className="text-[#1F3864] dark:text-blue-400" />
            Prontuário
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Registros clínicos dos seus pacientes</p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalAberto(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1F3864] text-white text-sm font-medium rounded-lg hover:bg-[#162a4e] transition-colors"
        >
          <Plus size={16} />
          Novo registro
        </button>
      </div>

      {/* Busca de paciente */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Selecione o paciente</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={buscaPaciente}
            onChange={e => { setBuscaPaciente(e.target.value); setMostrarSugestoes(true) }}
            onFocus={() => setMostrarSugestoes(true)}
            placeholder="Buscar paciente por nome..."
            className="w-full pl-9 pr-8 py-2.5 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          {pacienteSelecionado && (
            <button
              onClick={limparPaciente}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}

          {mostrarSugestoes && sugestoesVisiveis.length > 0 && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {sugestoesVisiveis.map(p => (
                <button
                  key={p.id}
                  onMouseDown={() => selecionarPaciente(p)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  {p.nome}
                  {p.cpf && <span className="ml-2 text-xs text-gray-400">CPF: {p.cpf}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {pacienteSelecionado && (
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{pacienteSelecionado.nome}</p>
              <p className="text-xs text-gray-400">{registros.length} registro{registros.length !== 1 ? 's' : ''} encontrado{registros.length !== 1 ? 's' : ''}</p>
            </div>
            {registros.length > 0 && (
              <button
                onClick={() => exportarPDF(pacienteSelecionado, registros)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F3864] dark:text-blue-400 border border-[#1F3864] dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Download size={13} />
                Exportar PDF
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de registros */}
      {!pacienteSelecionado && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione um paciente para ver os registros</p>
        </div>
      )}

      {pacienteSelecionado && isLoading && (
        <div className="text-center py-10 text-gray-400 text-sm">Carregando registros...</div>
      )}

      {pacienteSelecionado && !isLoading && registros.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum registro para este paciente</p>
          <button
            onClick={() => { setEditando(null); setModalAberto(true) }}
            className="mt-3 text-sm text-[#1F3864] dark:text-blue-400 hover:underline"
          >
            Criar primeiro registro
          </button>
        </div>
      )}

      {registros.length > 0 && (
        <div className="space-y-3">
          {registros.map(r => (
            <CartaoProntuario
              key={r.id}
              registro={r}
              onEditar={r => { setEditando(r); setModalAberto(true) }}
              onDeletar={id => setConfirmarDeletar(id)}
            />
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modalAberto && (
        <ModalProntuario
          inicial={editando}
          pacienteId={pacienteSelecionado?.id ?? ''}
          pacientes={todosPacientes}
          onSalvar={handleSalvar}
          onFechar={() => { setModalAberto(false); setEditando(null) }}
        />
      )}

      {/* Modal confirmar exclusão */}
      {confirmarDeletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir registro?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmarDeletar(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletar(confirmarDeletar)}
                disabled={deletar.isPending}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deletar.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
