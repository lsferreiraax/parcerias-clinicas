import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePerfil } from '@/contexts/PerfilContext'
import type { Role } from '@/contexts/PerfilContext'

interface RoleGuardProps {
  roles: Role[]
  children: ReactNode
  fallback?: ReactNode
  redirect?: string
}

export default function RoleGuard({ roles, children, fallback, redirect }: RoleGuardProps) {
  const { perfil, loading } = usePerfil()

  if (loading) return null

  if (!perfil || !roles.includes(perfil.role)) {
    if (redirect) return <Navigate to={redirect} replace />
    if (fallback) return <>{fallback}</>
    return null
  }

  return <>{children}</>
}
