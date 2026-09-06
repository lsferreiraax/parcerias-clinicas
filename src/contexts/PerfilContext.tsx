import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

export type Role = 'admin' | 'gestor' | 'profissional'
export type TipoProfissional = 'camta' | 'medico' | 'psi1' | 'psi2'

export interface UserPerfil {
  id: string
  nome: string
  role: Role
  tipo_profissional: TipoProfissional | null
  ativo: boolean
}

interface PerfilContextValue {
  perfil: UserPerfil | null
  loading: boolean
  isAdmin: boolean
  isGestor: boolean
  isProfissional: boolean
  can: (roles: Role[]) => boolean
  recarregar: () => Promise<void>
}

const PerfilContext = createContext<PerfilContextValue | null>(null)

export function PerfilProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [perfil, setPerfil]   = useState<UserPerfil | null>(null)
  const [loading, setLoading] = useState(true)

  const carregar = async () => {
    if (!user) { setPerfil(null); setLoading(false); return }

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setPerfil(data as UserPerfil | null)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [user])

  const can = (roles: Role[]) => !!perfil && roles.includes(perfil.role)

  return (
    <PerfilContext.Provider value={{
      perfil,
      loading,
      isAdmin:        perfil?.role === 'admin',
      isGestor:       perfil?.role === 'gestor',
      isProfissional: perfil?.role === 'profissional',
      can,
      recarregar:     carregar,
    }}>
      {children}
    </PerfilContext.Provider>
  )
}

export function usePerfil() {
  const ctx = useContext(PerfilContext)
  if (!ctx) throw new Error('usePerfil must be used within PerfilProvider')
  return ctx
}
