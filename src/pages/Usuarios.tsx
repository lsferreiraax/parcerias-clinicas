import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Pencil, ToggleLeft, ToggleRight, Mail, KeyRound } from 'lucide-react'
import { Card, CardHeader, CardBody, Badge, Button, Modal, Input, Select } from '@/components/ui'
import { useProfissionais } from '@/hooks/useConfiguracoes'
import {
  listarUsuarios, criarUsuario, atualizarPerfil, reenviarConvite, redefinirSenhaUsuario, gerarSenha, senhaValida,
} from '@/services/usuarios'
import { listarPerfis, atribuirPerfilUsuario } from '@/services/perfisAcesso'
import { useAuth } from '@/contexts/AuthContext'
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

const INIT_NOVO = {
  email: '', nome: '', role: 'gestor' as Role, tipo_profissional: '', profissional_id: '', perfil_id: '',
  modo: 'convidar' as 'convidar' | 'cadastrar', senha: '',
}

/** Nome do perfil de acesso sugerido para cada papel (mesmo mapeamento da migration 036) */
const PERFIL_DO_ROLE: Record<Role, string> = { admin: 'admin', gestor: 'financeiro', profissional: 'profissional' }
const INIT_EDIT = { nome: '', role: 'gestor' as Role, tipo_profissional: '' as TipoProfissional | '', perfil_id: '', profissional_id: '' }

export default function Usuarios() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [modalNovo, setModalNovo] = useState(false)
  const [editando, setEditando]   = useState<(UserPerfil & { email?: string; perfil_id?: string }) | null>(null)
  const [formNovo, setFormNovo]   = useState(INIT_NOVO)
  const [formEdit, setFormEdit]   = useState(INIT_EDIT)
  const [erro, setErro]           = useState('')
  const [redefinindo, setRedefinindo] = useState<{ id: string; nome: string } | null>(null)
  const [novaSenha, setNovaSenha]      = useState('')
  const [aviso, setAviso]              = useState<{ texto: string; erro?: boolean } | null>(null)
  const { data: profissionais = [] } = useProfissionais()

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: listarUsuarios,
  })

  const { data: perfisAcesso = [] } = useQuery({
    queryKey: ['perfis-acesso'],
    queryFn: listarPerfis,
  })

  const perfilPadrao = (role: Role) => perfisAcesso.find(p => p.nome === PERFIL_DO_ROLE[role])?.id ?? ''

  const criar = useMutation({
    mutationFn: criarUsuario,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setModalNovo(false)
      setFormNovo({ ...INIT_NOVO, perfil_id: perfilPadrao(INIT_NOVO.role) })
      setErro('')
      setAviso({ texto: v.acao === 'cadastrar'
        ? 'Usuário cadastrado. Informe a senha inicial a ele; a troca é obrigatória no primeiro acesso.'
        : 'Convite enviado por e-mail.' })
    },
    onError: (e: Error) => setErro(e.message),
  })

  const reenviar = useMutation({
    mutationFn: reenviarConvite,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setAviso({ texto: 'Convite reenviado.' }) },
    onError: (e: Error) => setAviso({ texto: e.message, erro: true }),
  })

  const redefinir = useMutation({
    mutationFn: ({ id, senha }: { id: string; senha: string }) => redefinirSenhaUsuario(id, senha),
    onSuccess: () => {
      setRedefinindo(null); setNovaSenha(''); setErro('')
      setAviso({ texto: 'Senha redefinida. O usuário deverá trocá-la no próximo acesso.' })
    },
    onError: (e: Error) => setErro(e.message),
  })

  const atualizar = useMutation({
    mutationFn: async ({ id, dados, perfilId, perfilAnterior }: {
      id: string
      dados: Parameters<typeof atualizarPerfil>[1]
      perfilId?: string
      perfilAnterior?: string | null
    }) => {
      await atualizarPerfil(id, dados)
      if (perfilId && perfilId !== perfilAnterior) {
        await atribuirPerfilUsuario(id, perfilId, user!.id, perfilAnterior ?? null)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['permissoes'] })
      setEditando(null)
      setErro('')
    },
    onError: (e: Error) => setErro(e.message),
  })

  const abrirEdicao = (u: UserPerfil & { perfil_id?: string }) => {
    setEditando(u)
    setFormEdit({ nome: u.nome, role: u.role, tipo_profissional: u.tipo_profissional ?? '', perfil_id: u.perfil_id ?? '', profissional_id: (u as any).profissional_id ?? '' })
    setErro('')
  }

  const fecharNovo = () => { setModalNovo(false); setFormNovo(f => ({ ...f, senha: '' })); setErro('') }
  const fecharRedefinir = () => { setRedefinindo(null); setNovaSenha(''); setErro('') }

  const handleCriar = () => {
    if (!formNovo.email || !formNovo.nome) { setErro('E-mail e nome são obrigatórios.'); return }
    if (formNovo.role === 'profissional' && !formNovo.tipo_profissional) {
      setErro('Selecione o tipo do profissional.'); return
    }
    if (formNovo.role === 'profissional' && !formNovo.profissional_id) {
      setErro('Vincule o usuário a um profissional; sem vínculo ele não vê nenhuma sessão.'); return
    }
    if (!formNovo.perfil_id) { setErro('Selecione o perfil de acesso.'); return }
    if (formNovo.modo === 'cadastrar' && !senhaValida(formNovo.senha)) {
      setErro('A senha deve ter ao menos 10 caracteres, com letras e números.'); return
    }
    setErro('')
    criar.mutate({
      acao:              formNovo.modo,
      email:             formNovo.email,
      nome:              formNovo.nome,
      role:              formNovo.role,
      tipo_profissional: (formNovo.tipo_profissional as TipoProfissional) || undefined,
      profissional_id:   formNovo.profissional_id || undefined,
      perfil_id:         formNovo.perfil_id,
      senha:             formNovo.modo === 'cadastrar' ? formNovo.senha : undefined,
    })
  }

  const handleRedefinir = () => {
    if (!redefinindo) return
    if (!senhaValida(novaSenha)) { setErro('A senha deve ter ao menos 10 caracteres, com letras e números.'); return }
    setErro('')
    redefinir.mutate({ id: redefinindo.id, senha: novaSenha })
  }

  const handleAtualizar = () => {
    if (!editando) return
    if (formEdit.role === 'profissional' && !formEdit.tipo_profissional) {
      setErro('Selecione o tipo do profissional.'); return
    }
    if (formEdit.role === 'profissional' && !formEdit.profissional_id) {
      setErro('Vincule o usuário a um profissional; sem vínculo ele não vê nenhuma sessão.'); return
    }
    setErro('')
    atualizar.mutate({
      id: editando.id,
      dados: {
        nome:              formEdit.nome,
        role:              formEdit.role,
        tipo_profissional: (formEdit.tipo_profissional as TipoProfissional) || null,
        profissional_id:   formEdit.role === 'profissional' ? (formEdit.profissional_id || null) : null,
      },
      perfilId:       formEdit.perfil_id || undefined,
      perfilAnterior: editando.perfil_id,
    })
  }

  const toggleAtivo = (u: UserPerfil) => {
    atualizar.mutate({ id: u.id, dados: { ativo: !u.ativo } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864] dark:text-blue-300">Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os acessos ao sistema</p>
        </div>
        <Button onClick={() => {
          setModalNovo(true); setErro(''); setAviso(null)
          setFormNovo(f => ({ ...f, perfil_id: f.perfil_id || perfilPadrao(f.role) }))
        }}>
          <UserPlus size={16} /> Novo Usuário
        </Button>
      </div>

      {aviso && (
        <p role="status" className={`text-sm rounded-lg px-3 py-2 ${aviso.erro
          ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300'
          : 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300'}`}>{aviso.texto}</p>
      )}

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-500">{usuarios?.length ?? 0} usuário(s) cadastrado(s)</p>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Nome', 'E-mail', 'Role', 'Perfil de Acesso', 'Tipo', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>
                )}
                {(usuarios ?? []).map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium">{u.nome}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[u.role]}`}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(u as any).perfil_nome
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">{(u as any).perfil_nome}</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.tipo_profissional ? PROF_LABEL[u.tipo_profissional] : '—'}
                      {u.role === 'profissional' && !(u as any).profissional_id && (
                        <span className="ml-2 text-xs text-red-600" title="Sem profissional vinculado, o usuário não vê sessões">sem vínculo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.ativo ? 'success' : 'danger'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {u.convite_pendente && <span className="ml-2 text-xs text-amber-600">ainda não acessou</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => abrirEdicao(u)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Editar">
                          <Pencil size={15} />
                        </button>
                        {u.convite_pendente && (
                          <button
                            onClick={() => { setAviso(null); reenviar.mutate(u.id) }}
                            disabled={reenviar.isPending}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-40" title="Reenviar e-mail de convite" aria-label="Reenviar convite">
                            <Mail size={15} />
                          </button>
                        )}
                        {u.id !== user?.id && (
                          <button
                            onClick={() => { setRedefinindo({ id: u.id, nome: u.nome }); setNovaSenha(''); setErro(''); setAviso(null) }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Redefinir senha" aria-label="Redefinir senha">
                            <KeyRound size={15} />
                          </button>
                        )}
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

      {/* Modal — Novo usuário (convite por e-mail ou cadastro manual) */}
      <Modal open={modalNovo} onClose={fecharNovo} title="Novo Usuário">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg" role="radiogroup" aria-label="Forma de cadastro">
            {([['convidar', 'Convidar por e-mail'], ['cadastrar', 'Cadastrar com senha']] as const).map(([m, rotulo]) => (
              <button key={m} type="button" role="radio" aria-checked={formNovo.modo === m}
                onClick={() => { setFormNovo(f => ({ ...f, modo: m })); setErro('') }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  formNovo.modo === m ? 'bg-white dark:bg-gray-800 shadow text-[#1F3864] dark:text-blue-300' : 'text-gray-500'}`}>
                {rotulo}
              </button>
            ))}
          </div>
          <Input label="E-mail" type="email" placeholder="usuario@email.com"
            value={formNovo.email} onChange={e => setFormNovo(f => ({ ...f, email: e.target.value }))} />
          <Input label="Nome" placeholder="Nome completo"
            value={formNovo.nome} onChange={e => setFormNovo(f => ({ ...f, nome: e.target.value }))} />
          <Select label="Perfil" value={formNovo.role}
            onChange={e => {
              const role = e.target.value as Role
              setFormNovo(f => ({ ...f, role, tipo_profissional: '', profissional_id: '', perfil_id: perfilPadrao(role) }))
            }}>
            <option value="admin">Admin</option>
            <option value="gestor">Gestor</option>
            <option value="profissional">Profissional</option>
          </Select>
          {formNovo.role === 'profissional' && (
            <Select label="Tipo do Profissional" value={formNovo.tipo_profissional}
              onChange={e => setFormNovo(f => ({ ...f, tipo_profissional: e.target.value, profissional_id: '' }))}>
              <option value="">Selecione...</option>
              <option value="camta">Camta</option>
              <option value="medico">Médico</option>
              <option value="psi1">Psi1</option>
              <option value="psi2">Psi2</option>
            </Select>
          )}
          {formNovo.role === 'profissional' && formNovo.tipo_profissional && (
            <Select label="Profissional vinculado" value={formNovo.profissional_id}
              onChange={e => setFormNovo(f => ({ ...f, profissional_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {profissionais
                .filter(p => p.ativo && p.tipo === formNovo.tipo_profissional)
                .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          )}
          <Select label="Perfil de Acesso" value={formNovo.perfil_id}
            onChange={e => setFormNovo(f => ({ ...f, perfil_id: e.target.value }))}>
            <option value="">Selecione um perfil...</option>
            {perfisAcesso.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
          {formNovo.modo === 'cadastrar' && (
            <div className="space-y-1">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input label="Senha inicial" type="text" autoComplete="off" placeholder="Mín. 10 caracteres, letras e números"
                    value={formNovo.senha} onChange={e => setFormNovo(f => ({ ...f, senha: e.target.value }))} />
                </div>
                <Button type="button" variant="secondary" onClick={() => setFormNovo(f => ({ ...f, senha: gerarSenha() }))}>Gerar</Button>
              </div>
              <p className="text-xs text-gray-400">Informe esta senha ao usuário por um canal seguro. Ele será obrigado a trocá-la no primeiro acesso.</p>
            </div>
          )}
          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          {formNovo.modo === 'convidar' && (
            <p className="text-xs text-gray-400">O usuário receberá um e-mail para definir a senha.</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={fecharNovo}>Cancelar</Button>
            <Button className="flex-1" loading={criar.isPending} onClick={handleCriar}>
              {formNovo.modo === 'convidar' ? 'Enviar Convite' : 'Cadastrar Usuário'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal — Redefinir senha (admin) */}
      <Modal open={!!redefinindo} onClose={fecharRedefinir} title="Redefinir senha">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Defina uma senha temporária para <strong>{redefinindo?.nome}</strong>. No próximo acesso ele será obrigado a trocá-la.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Senha temporária" type="text" autoComplete="off" placeholder="Mín. 10 caracteres, letras e números"
                value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
            </div>
            <Button type="button" variant="secondary" onClick={() => setNovaSenha(gerarSenha())}>Gerar</Button>
          </div>
          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={fecharRedefinir}>Cancelar</Button>
            <Button className="flex-1" loading={redefinir.isPending} onClick={handleRedefinir}>Redefinir senha</Button>
          </div>
        </div>
      </Modal>

      {/* Modal — Editar */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Usuário">
        <div className="space-y-4">
          {editando?.email && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">E-mail</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">{editando.email}</p>
            </div>
          )}
          <Input label="Nome" value={formEdit.nome}
            onChange={e => setFormEdit(f => ({ ...f, nome: e.target.value }))} />
          <Select label="Perfil" value={formEdit.role}
            onChange={e => setFormEdit(f => ({ ...f, role: e.target.value as Role, tipo_profissional: '', profissional_id: '' }))}>
            <option value="admin">Admin</option>
            <option value="gestor">Gestor</option>
            <option value="profissional">Profissional</option>
          </Select>
          {formEdit.role === 'profissional' && (
            <Select label="Tipo do Profissional" value={formEdit.tipo_profissional}
              onChange={e => setFormEdit(f => ({ ...f, tipo_profissional: e.target.value as TipoProfissional, profissional_id: '' }))}>
              <option value="">Selecione...</option>
              <option value="camta">Camta</option>
              <option value="medico">Médico</option>
              <option value="psi1">Psi1</option>
              <option value="psi2">Psi2</option>
            </Select>
          )}
          {formEdit.role === 'profissional' && formEdit.tipo_profissional && (
            <Select label="Profissional vinculado" value={formEdit.profissional_id}
              onChange={e => setFormEdit(f => ({ ...f, profissional_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {profissionais
                .filter(p => p.ativo && p.tipo === formEdit.tipo_profissional)
                .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          )}
          <Select label="Perfil de Acesso" value={formEdit.perfil_id}
            onChange={e => setFormEdit(f => ({ ...f, perfil_id: e.target.value }))}>
            <option value="">Sem perfil configurado</option>
            {perfisAcesso.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
          <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
            Alterar o perfil invalida as permissões do usuário no próximo acesso.
          </p>
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
