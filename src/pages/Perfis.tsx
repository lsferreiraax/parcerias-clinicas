import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Shield, CheckSquare, Square } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Modal, Input } from '@/components/ui'
import {
  listarPerfis, criarPerfil, atualizarPerfil, excluirPerfil,
  buscarPermissoes, salvarPermissoes,
  MODULOS, MODULO_LABEL,
  type PerfilAcesso, type PermissaoItem,
} from '@/services/perfisAcesso'
import type { Modulo } from '@/contexts/PermissoesContext'

type PermMap = Record<Modulo, { pode_ver: boolean; pode_editar: boolean }>

function permMapVazio(): PermMap {
  return Object.fromEntries(
    MODULOS.map(m => [m, { pode_ver: false, pode_editar: false }])
  ) as PermMap
}

function permItemsToMap(items: PermissaoItem[]): PermMap {
  const m = permMapVazio()
  items.forEach(p => { m[p.modulo] = { pode_ver: p.pode_ver, pode_editar: p.pode_editar } })
  return m
}

export default function Perfis() {
  const qc = useQueryClient()

  const [modalNovo, setModalNovo]         = useState(false)
  const [editando, setEditando]           = useState<PerfilAcesso | null>(null)
  const [gerenciando, setGerenciando]     = useState<PerfilAcesso | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<PerfilAcesso | null>(null)

  const [formNome, setFormNome]   = useState('')
  const [formDesc, setFormDesc]   = useState('')
  const [permMap, setPermMap]     = useState<PermMap>(permMapVazio())
  const [erro, setErro]           = useState('')

  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ['perfis-acesso'],
    queryFn: listarPerfis,
  })

  const criar = useMutation({
    mutationFn: () => criarPerfil(formNome.trim(), formDesc.trim()),
    onSuccess: async (perfil) => {
      await salvarPermissoes(perfil.id, MODULOS.map(m => ({ modulo: m, ...permMap[m] })))
      qc.invalidateQueries({ queryKey: ['perfis-acesso'] })
      setModalNovo(false)
      setFormNome(''); setFormDesc(''); setPermMap(permMapVazio()); setErro('')
    },
    onError: (e: Error) => setErro(e.message),
  })

  const editar = useMutation({
    mutationFn: () => atualizarPerfil(editando!.id, { nome: formNome.trim(), descricao: formDesc.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfis-acesso'] })
      setEditando(null); setErro('')
    },
    onError: (e: Error) => setErro(e.message),
  })

  const excluir = useMutation({
    mutationFn: () => excluirPerfil(confirmExcluir!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfis-acesso'] })
      setConfirmExcluir(null)
    },
    onError: (e: Error) => setErro(e.message),
  })

  const salvarPerms = useMutation({
    mutationFn: () => salvarPermissoes(gerenciando!.id, MODULOS.map(m => ({ modulo: m, ...permMap[m] }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissoes'] })
      setGerenciando(null); setErro('')
    },
    onError: (e: Error) => setErro(e.message),
  })

  const abrirNovo = () => {
    setFormNome(''); setFormDesc(''); setPermMap(permMapVazio()); setErro('')
    setModalNovo(true)
  }

  const abrirEdicao = (p: PerfilAcesso) => {
    setFormNome(p.nome); setFormDesc(p.descricao ?? ''); setErro('')
    setEditando(p)
  }

  const abrirGerenciar = async (p: PerfilAcesso) => {
    const items = await buscarPermissoes(p.id)
    setPermMap(permItemsToMap(items))
    setGerenciando(p); setErro('')
  }

  const toggleVer = (m: Modulo) => setPermMap(prev => {
    const next = { ...prev, [m]: { ...prev[m], pode_ver: !prev[m].pode_ver } }
    if (!next[m].pode_ver) next[m].pode_editar = false
    return next
  })

  const toggleEditar = (m: Modulo) => setPermMap(prev => {
    const next = { ...prev, [m]: { ...prev[m], pode_editar: !prev[m].pode_editar } }
    if (next[m].pode_editar) next[m].pode_ver = true
    return next
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864] dark:text-blue-300">Perfis de Acesso</h1>
          <p className="text-gray-500 text-sm mt-1">Controle quais módulos cada perfil pode visualizar e editar</p>
        </div>
        <Button onClick={abrirNovo}><Plus size={16} /> Novo Perfil</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <p className="text-gray-400 col-span-3">Carregando...</p>}
        {perfis.map(p => (
          <Card key={p.id} className="flex flex-col">
            <CardHeader className="flex items-start gap-3">
              <Shield size={20} className="text-[#1F3864] dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{p.nome}</p>
                {p.descricao && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.descricao}</p>}
              </div>
              {p.protegido && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full shrink-0">padrão</span>
              )}
            </CardHeader>
            <CardBody className="flex gap-2 pt-0">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => abrirGerenciar(p)}>
                Permissões
              </Button>
              {!p.protegido && (
                <>
                  <button
                    onClick={() => abrirEdicao(p)}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="Editar nome">
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => { setConfirmExcluir(p); setErro('') }}
                    className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Excluir">
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Modal — Novo Perfil */}
      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo Perfil de Acesso">
        <div className="space-y-4">
          <Input label="Nome do Perfil" placeholder="ex: recepcionista" value={formNome}
            onChange={e => setFormNome(e.target.value)} />
          <Input label="Descrição" placeholder="Breve descrição das responsabilidades" value={formDesc}
            onChange={e => setFormDesc(e.target.value)} />
          <div>
            <p className="text-xs font-medium text-gray-500 mb-3">Permissões por Módulo</p>
            <PermissaoMatrix permMap={permMap} onToggleVer={toggleVer} onToggleEditar={toggleEditar} />
          </div>
          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalNovo(false)}>Cancelar</Button>
            <Button className="flex-1" loading={criar.isPending} onClick={() => {
              if (!formNome.trim()) { setErro('Nome é obrigatório.'); return }
              criar.mutate()
            }}>Criar Perfil</Button>
          </div>
        </div>
      </Modal>

      {/* Modal — Editar nome/descrição */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Perfil">
        <div className="space-y-4">
          <Input label="Nome" value={formNome} onChange={e => setFormNome(e.target.value)} />
          <Input label="Descrição" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button className="flex-1" loading={editar.isPending} onClick={() => editar.mutate()}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal — Gerenciar permissões */}
      <Modal open={!!gerenciando} onClose={() => setGerenciando(null)}
        title={`Permissões — ${gerenciando?.nome}`}>
        <div className="space-y-4">
          <PermissaoMatrix permMap={permMap} onToggleVer={toggleVer} onToggleEditar={toggleEditar} />
          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setGerenciando(null)}>Cancelar</Button>
            <Button className="flex-1" loading={salvarPerms.isPending} onClick={() => salvarPerms.mutate()}>
              Salvar Permissões
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal — Confirmar exclusão */}
      <Modal open={!!confirmExcluir} onClose={() => setConfirmExcluir(null)} title="Excluir Perfil">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Tem certeza que deseja excluir o perfil <strong>{confirmExcluir?.nome}</strong>?
            Usuários com este perfil perderão suas permissões.
          </p>
          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmExcluir(null)}>Cancelar</Button>
            <Button variant="danger" className="flex-1" loading={excluir.isPending} onClick={() => excluir.mutate()}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PermissaoMatrix({
  permMap,
  onToggleVer,
  onToggleEditar,
}: {
  permMap: PermMap
  onToggleVer: (m: Modulo) => void
  onToggleEditar: (m: Modulo) => void
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Módulo</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ver</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Editar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {MODULOS.map(m => (
            <tr key={m} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">
                {MODULO_LABEL[m]}
              </td>
              <td className="px-4 py-2.5 text-center">
                <button onClick={() => onToggleVer(m)} className="inline-flex items-center justify-center">
                  {permMap[m].pode_ver
                    ? <CheckSquare size={18} className="text-blue-600" />
                    : <Square size={18} className="text-gray-300 dark:text-gray-600" />}
                </button>
              </td>
              <td className="px-4 py-2.5 text-center">
                <button onClick={() => onToggleEditar(m)} className="inline-flex items-center justify-center">
                  {permMap[m].pode_editar
                    ? <CheckSquare size={18} className="text-green-600" />
                    : <Square size={18} className="text-gray-300 dark:text-gray-600" />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
