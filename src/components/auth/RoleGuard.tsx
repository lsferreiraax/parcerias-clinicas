import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePerfil } from '@/contexts/PerfilContext'
import type { Role } from '@/contexts/PerfilContext'
import { usePermissoes } from '@/contexts/PermissoesContext'
import type { Modulo } from '@/contexts/PermissoesContext'

interface RoleGuardProps {
  roles: Role[]
  modulo?: Modulo
  children: ReactNode
  fallback?: ReactNode
  redirect?: string
}

// Libera a rota quando a role é permitida e, se `modulo` for informado, o perfil de acesso pode ver o módulo
export default function RoleGuard({ roles, modulo, children, fallback, redirect }: RoleGuardProps) {
  const { perfil, loading } = usePerfil()
  const { podeVer, loading: permLoading } = usePermissoes()

  if (loading || (modulo && permLoading)) return null

  if (!perfil || !roles.includes(perfil.role)) {
    if (redirect) return <Navigate to={redirect} replace />
    if (fallback) return <>{fallback}</>
    return null
  }

  if (modulo && !podeVer(modulo)) return <Navigate to="/sem-acesso" replace />

  return <>{children}</>
}
