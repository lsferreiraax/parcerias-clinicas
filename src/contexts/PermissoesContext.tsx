import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

export type Modulo =
  | 'parcerias'
  | 'psicologia'
  | 'salas'
  | 'condominio'
  | 'conta_corrente'
  | 'relatorios'
  | 'usuarios'
  | 'configuracoes'

export interface PermissaoModulo {
  modulo: Modulo
  pode_ver: boolean
  pode_editar: boolean
}

interface PermissoesContextValue {
  permissoes: PermissaoModulo[]
  loading: boolean
  podeVer: (modulo: Modulo) => boolean
  podeEditar: (modulo: Modulo) => boolean
  recarregar: () => Promise<void>
}

const PermissoesContext = createContext<PermissoesContextValue | null>(null)

export function PermissoesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [permissoes, setPermissoes] = useState<PermissaoModulo[]>([])
  const [loading, setLoading] = useState(true)

  const carregar = async () => {
    if (!user) { setPermissoes([]); setLoading(false); return }

    // Busca o perfil_id do usuário
    const { data: up } = await supabase
      .from('user_profiles')
      .select('perfil_id, role')
      .eq('id', user.id)
      .single()

    if (!up) { setPermissoes([]); setLoading(false); return }

    // Admin sempre tem acesso total independente do perfil configurado
    if (up.role === 'admin') {
      const todos: Modulo[] = ['parcerias','psicologia','salas','condominio','conta_corrente','relatorios','usuarios','configuracoes']
      setPermissoes(todos.map(m => ({ modulo: m, pode_ver: true, pode_editar: true })))
      setLoading(false)
      return
    }

    if (!up.perfil_id) { setPermissoes([]); setLoading(false); return }

    const { data: perms } = await supabase
      .from('perfil_permissoes')
      .select('modulo, pode_ver, pode_editar')
      .eq('perfil_id', up.perfil_id)

    setPermissoes((perms ?? []) as PermissaoModulo[])
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading) return
    carregar()
  }, [user, authLoading])

  const podeVer    = (m: Modulo) => permissoes.find(p => p.modulo === m)?.pode_ver    ?? false
  const podeEditar = (m: Modulo) => permissoes.find(p => p.modulo === m)?.pode_editar ?? false

  return (
    <PermissoesContext.Provider value={{ permissoes, loading, podeVer, podeEditar, recarregar: carregar }}>
      {children}
    </PermissoesContext.Provider>
  )
}

export function usePermissoes() {
  const ctx = useContext(PermissoesContext)
  if (!ctx) throw new Error('usePermissoes must be used within PermissoesProvider')
  return ctx
}
