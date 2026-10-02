import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Button, Select } from '@/components/ui'
import { useProfissionais } from '@/hooks/useConfiguracoes'
import { contarCotasSemPessoa, atribuirPessoaEmLote, TIPOS_COTA } from '@/services/lancamentos'
import type { TipoCota } from '@/services/lancamentos'
import { ROTULO_COTA } from './ProfissionaisPorCota'

/** Atribuição em lote (DT17): define a pessoa de todas as cotas de um tipo que ainda não têm pessoa. */
export function AtribuirProfissionaisModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: profissionais = [] } = useProfissionais()
  const [escolha, setEscolha] = useState<Partial<Record<TipoCota, string>>>({})
  const [aviso, setAviso] = useState<{ texto: string; erro?: boolean } | null>(null)

  const { data: pendentes, isLoading } = useQuery({
    queryKey: ['cotas-sem-pessoa'], queryFn: contarCotasSemPessoa, enabled: open,
  })

  const atribuir = useMutation({
    mutationFn: ({ tipo, id }: { tipo: TipoCota; id: string }) => atribuirPessoaEmLote(tipo, id),
    onSuccess: (n, v) => {
      qc.invalidateQueries({ queryKey: ['cotas-sem-pessoa'] })
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
      qc.invalidateQueries({ queryKey: ['extrato'] })
      qc.invalidateQueries({ queryKey: ['extrato-mensal'] })
      setAviso({ texto: `${n} cota(s) de ${ROTULO_COTA[v.tipo]} atribuída(s).` })
    },
    onError: (e: Error) => setAviso({ texto: e.message, erro: true }),
  })

  const total = pendentes ? TIPOS_COTA.reduce((s, t) => s + pendentes[t], 0) : 0

  return (
    <Modal open={open} onClose={onClose} title="Atribuir profissionais aos lançamentos">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Lançamentos antigos têm as cotas sem pessoa e só aparecem para administradores e financeiro. Escolha abaixo
          quem recebe cada tipo de cota e atribua de uma vez. Para casos individuais, use a edição do lançamento.
        </p>
        {isLoading && <p className="text-sm text-gray-400">Carregando...</p>}
        {pendentes && total === 0 && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">Todas as cotas já têm profissional atribuído.</p>
        )}
        {pendentes && TIPOS_COTA.filter(t => pendentes[t] > 0).map(t => {
          const opcoes = profissionais.filter(p => p.tipo === t && p.ativo)
          return (
            <div key={t} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <p className="text-sm font-medium">{ROTULO_COTA[t]}: <span className="text-amber-600">{pendentes[t]} cota(s) sem pessoa</span></p>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-40">
                  <Select label="Profissional" value={escolha[t] ?? ''}
                    onChange={e => setEscolha(c => ({ ...c, [t]: e.target.value || undefined }))}>
                    <option value="">{opcoes.length === 0 ? 'Nenhum profissional ativo' : 'Selecione...'}</option>
                    {opcoes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </Select>
                </div>
                <Button variant="secondary" disabled={!escolha[t]} loading={atribuir.isPending && atribuir.variables?.tipo === t}
                  onClick={() => { setAviso(null); atribuir.mutate({ tipo: t, id: escolha[t]! }) }}>
                  Atribuir a todas
                </Button>
              </div>
            </div>
          )
        })}
        {aviso && (
          <p role="status" className={`text-sm rounded-lg px-3 py-2 ${aviso.erro ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>{aviso.texto}</p>
        )}
        <div className="flex justify-end pt-1"><Button variant="secondary" onClick={onClose}>Fechar</Button></div>
      </div>
    </Modal>
  )
}
