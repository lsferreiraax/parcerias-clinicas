import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePerfil } from '@/contexts/PerfilContext'
import type { Role } from '@/contexts/PerfilContext'
import { temAcessoModulo, ACESSO_MODULOS } from '@/config/modulos'

export type { ACESSO_MODULOS }

interface ModuloGuardProps {
  modulo: keyof typeof ACESSO_MODULOS
  roles: Role[]
  children: ReactNode
  redirect?: string
}

export default function ModuloGuard({ modulo, roles, children, redirect = '/' }: ModuloGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const { perfil, loading: perfilLoading } = usePerfil()

  if (authLoading || perfilLoading) return null

  const temRole = perfil && roles.includes(perfil.role)
  const temAcesso = temAcessoModulo(modulo, user?.email)

  if (!temRole || !temAcesso) {
    return <Navigate to={redirect} replace />
  }

  return <>{children}</>
}
