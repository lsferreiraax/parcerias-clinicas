import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card, CardHeader, CardBody, Badge, Button, Modal, Input, Select } from '@/components/ui'
import { listarUsuarios, convidarUsuario, atualizarPerfil } from '@/services/usuarios'
import type { UserPerfil, Role, TipoProfissional } from '@/contexts/PerfilContext'

const ROLE_LABEL: Record<Role, string>   = { admin: 'Admin', gestor: 'Gestor', profissional: 'Profissional' }
const ROLE_COLOR: Record<Role, string>   = {
  admin:        'bg-purple-100 text-purple-800',
  gestor:       'bg-blue-100 text-blue-800',
  profissional: 'bg-green-100 text-green-800',
}
const PROF_LABEL: Record<TipoProfissional, string> = {
  camta: 'Camta', medico: 'Médico', psi1: 'Psi1', psi2: 'Psi2',
}

const INIT_NOVO = { email: '', nome: '', role: 'gestor' as Role, tipo_profissional: '' }
const INIT_EDIT = { nome: '', role: 'gestor' as Role, tipo_profissional: '' as TipoProfissional | '' }

export default function Usuarios() {
  const qc = useQueryClient()
  const [modalNovo, setModalNovo] = useState(false)
  const [editando, setEditando]   = useState<UserPerfil | null>(null)
  const [formNovo, setFormNovo]   = useState(INIT_NOVO)
  const [formEdit, setFormEdit]   = useState(INIT_EDIT)
  const [erro, setErro]           = useState('')

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: listarUsuarios,
  })

  const convidar = useMutation({
    mutationFn: convidarUsuario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setModalNovo(false)
      setFormNovo(INIT_NOVO)
      setErro('')
    },
    onError: (e: Error) => setErro(e.message),
  })

  const atualizar = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Parameters<typeof atualizarPerfil>[1] }) =>
      atualizarPerfil(id, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setEditando(null)
      setErro('')
    },
    onError: (e: Error) => setErro(e.message),
  })

  const abrirEdicao = (u: UserPerfil) => {
    setEditando(u)
    setFormEdit({ nome: u.nome, role: u.role, tipo_profissional: u.tipo_profissional ?? '' })
    setErro('')
  }

  const handleConvidar = () => {
    if (!formNovo.email || !formNovo.nome) { setErro('E-mail e nome são obrigatórios.'); return }
    if (formNovo.role === 'profissional' && !formNovo.tipo_profissional) {
      setErro('Selecione o tipo do profissional.'); return
    }
    setErro('')
    convidar.mutate({
      email:             formNovo.email,
      nome:              formNovo.nome,
      role:              formNovo.role,
      tipo_profissional: (formNovo.tipo_profissional as TipoProfissional) || undefined,
    })
  }

  const handleAtualizar = () => {
    if (!editando) return
    if (formEdit.role === 'profissional' && !formEdit.tipo_profissional) {
      setErro('Selecione o tipo do profissional.'); return
    }
    setErro('')
    atualizar.mutate({
      id: editando.id,
      dados: {
        nome:              formEdit.nome,
        role:              formEdit.role,
        tipo_profissional: (formEdit.tipo_profissional as TipoProfissional) || null,
      },
    })
  }

  const toggleAtivo = (u: UserPerfil) => {
    atualizar.mutate({ id: u.id, dados: { ativo: !u.ativo } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os acessos ao sistema</p>
        </div>
        <Button onClick={() => { setModalNovo(true); setErro('') }}>
          <UserPlus size={16} /> Convidar Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-500">{usuarios?.length ?? 0} usuário(s) cadastrado(s)</p>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Nome', 'Perfil', 'Tipo', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
                )}
                {(usuarios ?? []).map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium">{u.nome}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[u.role]}`}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.tipo_profissional ? PROF_LABEL[u.tipo_profissional] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.ativo ? 'success' : 'danger'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => abrirEdicao(u)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Editar">
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => toggleAtivo(u)}
                          className={`p-1.5 rounded ${u.ativo ? 'text-red-400 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={u.ativo ? 'Desativar' : 'Ativar'}>
                          {u.ativo ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Modal — Convidar */}
      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Convidar Usuário">
        <div className="space-y-4">
          <Input label="E-mail" type="email" placeholder="usuario@email.com"
            value={formNovo.email} onChange={e => setFormNovo(f => ({ ...f, email: e.target.value }))} />
          <Input label="Nome" placeholder="Nome completo"
            value={formNovo.nome} onChange={e => setFormNovo(f => ({ ...f, nome: e.target.value }))} />
          <Select label="Perfil" value={formNovo.role}
            onChange={e => setFormNovo(f => ({ ...f, role: e.target.value as Role, tipo_profissional: '' }))}>
            <option value="admin">Admin</option>
            <option value="gestor">Gestor</option>
            <option value="profissional">Profissional</option>
          </Select>
          {formNovo.role === 'profissional' && (
            <Select label="Tipo do Profissional" value={formNovo.tipo_profissional}
              onChange={e => setFormNovo(f => ({ ...f, tipo_profissional: e.target.value }))}>
              <option value="">Selecione...</option>
              <option value="camta">Camta</option>
              <option value="medico">Médico</option>
              <option value="psi1">Psi1</option>
              <option value="psi2">Psi2</option>
            </Select>
          )}
          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <p className="text-xs text-gray-400">O usuário receberá um e-mail para definir a senha.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalNovo(false)}>Cancelar</Button>
            <Button className="flex-1" loading={convidar.isPending} onClick={handleConvidar}>Enviar Convite</Button>
          </div>
        </div>
      </Modal>

      {/* Modal — Editar */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Usuário">
        <div className="space-y-4">
          <Input label="Nome" value={formEdit.nome}
            onChange={e => setFormEdit(f => ({ ...f, nome: e.target.value }))} />
          <Select label="Perfil" value={formEdit.role}
            onChange={e => setFormEdit(f => ({ ...f, role: e.target.value as Role, tipo_profissional: '' }))}>
            <option value="admin">Admin</option>
            <option value="gestor">Gestor</option>
            <option value="profissional">Profissional</option>
          </Select>
          {formEdit.role === 'profissional' && (
            <Select label="Tipo do Profissional" value={formEdit.tipo_profissional}
              onChange={e => setFormEdit(f => ({ ...f, tipo_profissional: e.target.value as TipoProfissional }))}>
              <option value="">Selecione...</option>
              <option value="camta">Camta</option>
              <option value="medico">Médico</option>
              <option value="psi1">Psi1</option>
              <option value="psi2">Psi2</option>
            </Select>
          )}
          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button className="flex-1" loading={atualizar.isPending} onClick={handleAtualizar}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
