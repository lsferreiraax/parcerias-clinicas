import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="animate-spin w-8 h-8 border-4 border-[#1F3864] border-t-transparent rounded-full" />
      </div>
    )
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />
}
