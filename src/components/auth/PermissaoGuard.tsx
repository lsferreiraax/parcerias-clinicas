import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePermissoes } from '@/contexts/PermissoesContext'
import type { Modulo } from '@/contexts/PermissoesContext'

interface PermissaoGuardProps {
  modulo: Modulo
  redirect?: string
  children: ReactNode
}

export default function PermissaoGuard({ modulo, redirect = '/sem-acesso', children }: PermissaoGuardProps) {
  const { podeVer, loading } = usePermissoes()

  if (loading) return null
  if (!podeVer(modulo)) return <Navigate to={redirect} replace />

  return <>{children}</>
}
