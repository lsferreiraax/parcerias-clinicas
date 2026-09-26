import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Building2, CalendarDays } from 'lucide-react'
import { listarSalas } from '@/services/salas'
import { listarBloqueios } from '@/services/bloqueiosSala'
import { supabase } from '@/lib/supabase'
import type { Sessao } from '@/services/sessoes'

// ─── constantes ─────────────────────────────────────────────────────────────

const HORA_INICIO = 7   // 07:00
const HORA_FIM    = 22  // 22:00
const SLOT_MIN    = 30  // minutos por slot
const TOTAL_SLOTS = ((HORA_FIM - HORA_INICIO) * 60) / SLOT_MIN // 30

const COR_STATUS: Record<string, string> = {
  agendada:  'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-200',
  realizada: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200',
  cancelada: 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-400 line-through',
  faltou:    'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/50 dark:border-red-700 dark:text-red-300',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatarDataBR(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function diaSemana(iso: string) {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const d = new Date(iso + 'T12:00:00')
  return dias[d.getDay()]
}

function avancarDia(iso: string, delta: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

// Converte "HH:MM" em minutos desde meia-noite
function toMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Slot index a partir de HH:MM (relativo a HORA_INICIO)
function slotIdx(hhmm: string) {
  return Math.floor((toMin(hhmm) - HORA_INICIO * 60) / SLOT_MIN)
}

function slotLabel(idx: number) {
  const totalMin = HORA_INICIO * 60 + idx * SLOT_MIN
  const h = Math.floor(totalMin / 60).toString().padStart(2, '0')
  const m = (totalMin % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

// ─── componente ──────────────────────────────────────────────────────────────

export default function GradeSalas() {
  const [data, setData] = useState(hojeISO())

  const { data: salas = [] } = useQuery({
    queryKey: ['salas', false],
    queryFn: () => listarSalas(true),
  })

  const { data: bloqueios = [] } = useQuery({
    queryKey: ['bloqueios-sala', data],
    queryFn: () => listarBloqueios(),
  })

  const { data: sessoes = [], isLoading } = useQuery({
    queryKey: ['sessoes-grade', data],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .schema('psicologia')
        .from('sessoes')
        .select('*, pacientes(nome)')
        .eq('data_sessao', data)
        .not('sala_id', 'is', null)
        .neq('status', 'cancelada')
        .order('hora_inicio')
      if (error) throw error
      return (rows ?? []) as Sessao[]
    },
  })

  // Bloqueios do dia
  const bloqueiosDoDia = useMemo(
    () => bloqueios.filter(b => b.data === data),
    [bloqueios, data],
  )

  // Sessões por sala
  const sessoesPorSala = useMemo(() => {
    const m: Record<string, Sessao[]> = {}
    for (const s of sessoes) {
      if (!s.sala_id) continue
      if (!m[s.sala_id]) m[s.sala_id] = []
      m[s.sala_id].push(s)
    }
    return m
  }, [sessoes])

  // Bloqueios por sala
  const bloqueiosPorSala = useMemo(() => {
    const m: Record<string, typeof bloqueiosDoDia> = {}
    for (const b of bloqueiosDoDia) {
      if (!m[b.sala_id]) m[b.sala_id] = []
      m[b.sala_id].push(b)
    }
    return m
  }, [bloqueiosDoDia])

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i)
  const ALTURA_SLOT = 40 // px por slot de 30 min

  return (
    <div className="p-6 max-w-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Grade de Salas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ocupação diária por sala</p>
          </div>
        </div>

        {/* Navegação de data */}
        <div className="flex items-center gap-2">
          <button onClick={() => setData(d => avancarDia(d, -1))} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{diaSemana(data)}</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatarDataBR(data)}</span>
          </div>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="sr-only"
            id="data-picker"
          />
          <button onClick={() => setData(hojeISO())} className="px-3 py-2 text-xs text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors font-medium">
            Hoje
          </button>
          <button onClick={() => setData(d => avancarDia(d, 1))} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {salas.length === 0 ? (
        <div className="text-center py-24">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Nenhuma sala ativa cadastrada.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <div className="flex min-w-max">

              {/* Coluna de horários */}
              <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
                {/* Header vazio */}
                <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                {/* Slots */}
                <div className="relative">
                  {slots.map(idx => (
                    <div
                      key={idx}
                      className="flex items-start justify-end pr-2 border-b border-gray-100 dark:border-gray-700/50 text-xs text-gray-400 dark:text-gray-500 font-variant-numeric"
                      style={{ height: ALTURA_SLOT }}
                    >
                      <span className="-mt-2">{slotLabel(idx)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colunas por sala */}
              {salas.map(sala => {
                const sessoesDaSala = sessoesPorSala[sala.id] ?? []
                const bloqueiosDaSala = bloqueiosPorSala[sala.id] ?? []

                return (
                  <div key={sala.id} className="flex-1 min-w-40 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                    {/* Header da sala */}
                    <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center gap-1.5 px-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sala.cor_hex }} />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{sala.nome}</span>
                    </div>

                    {/* Grade de slots */}
                    <div className="relative" style={{ height: TOTAL_SLOTS * ALTURA_SLOT }}>
                      {/* Linhas de slot */}
                      {slots.map(idx => (
                        <div
                          key={idx}
                          className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-700/40"
                          style={{ top: idx * ALTURA_SLOT, height: ALTURA_SLOT }}
                        />
                      ))}

                      {/* Bloqueios */}
                      {bloqueiosDaSala.map(b => {
                        const inicioSlot = b.dia_inteiro ? 0 : Math.max(0, slotIdx(b.hora_inicio!))
                        const fimSlot   = b.dia_inteiro ? TOTAL_SLOTS : Math.min(TOTAL_SLOTS, slotIdx(b.hora_fim!))
                        const altura    = Math.max(1, fimSlot - inicioSlot) * ALTURA_SLOT
                        return (
                          <div
                            key={b.id}
                            className="absolute left-0.5 right-0.5 rounded bg-gray-200 dark:bg-gray-600/60 border border-gray-300 dark:border-gray-500 overflow-hidden"
                            style={{ top: inicioSlot * ALTURA_SLOT + 1, height: altura - 2 }}
                            title={b.titulo}
                          >
                            <div className="px-1.5 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{b.titulo}</div>
                          </div>
                        )
                      })}

                      {/* Sessões */}
                      {sessoesDaSala.map(s => {
                        const hInicio = s.hora_inicio.slice(0, 5)
                        const hFim    = s.hora_fim?.slice(0, 5) ?? slotLabel(slotIdx(hInicio) + 1)
                        const inicioSlot = Math.max(0, slotIdx(hInicio))
                        const fimSlot   = Math.min(TOTAL_SLOTS, slotIdx(hFim))
                        const altura    = Math.max(1, fimSlot - inicioSlot) * ALTURA_SLOT

                        return (
                          <div
                            key={s.id}
                            className={`absolute left-0.5 right-0.5 rounded border overflow-hidden shadow-sm ${COR_STATUS[s.status] ?? ''}`}
                            style={{ top: inicioSlot * ALTURA_SLOT + 1, height: altura - 2 }}
                          >
                            <div className="px-1.5 py-1">
                              <div className="text-xs font-semibold truncate">{s.pacientes?.nome ?? '—'}</div>
                              <div className="text-xs opacity-70">{hInicio}–{hFim}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-6 flex-wrap bg-gray-50 dark:bg-gray-900">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Legenda:</span>
            {[
              { label: 'Agendada',  cls: 'bg-blue-100 border-blue-300 dark:bg-blue-900/50 dark:border-blue-700' },
              { label: 'Realizada', cls: 'bg-green-100 border-green-300 dark:bg-green-900/50 dark:border-green-700' },
              { label: 'Faltou',    cls: 'bg-red-100 border-red-300 dark:bg-red-900/50 dark:border-red-700' },
              { label: 'Bloqueio',  cls: 'bg-gray-200 border-gray-300 dark:bg-gray-600/60 dark:border-gray-500' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded border ${l.cls}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{l.label}</span>
              </div>
            ))}
            {isLoading && <span className="text-xs text-gray-400 ml-auto">Carregando...</span>}
          </div>
        </div>
      )}
    </div>
  )
}
