import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePerfil } from '@/contexts/PerfilContext'
import TrocarSenha from '@/pages/TrocarSenha'

export default function ProtectedRoute() {
  const { session, loading, mustChangePassword, signOut } = useAuth()
  const { perfil, loading: perfilLoading } = usePerfil()

  if (loading || (session && perfilLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="animate-spin w-8 h-8 border-4 border-[#1F3864] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  // Troca obrigatória de senha: nada do app abre (nem por URL direta) até concluir.
  if (mustChangePassword) return <TrocarSenha />

  // Sem perfil em user_profiles (ou falha ao lê-lo): nada do app abre
  if (!perfil) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center space-y-3">
          <h1 className="text-lg font-bold text-[#1F3864] dark:text-blue-300">Acesso não configurado</h1>
          <p className="text-sm text-gray-500">O seu usuário não tem perfil no sistema. Fale com o administrador.</p>
          <button onClick={signOut} className="text-sm text-blue-600 hover:underline">Sair</button>
        </div>
      </div>
    )
  }

  // Usuário desativado pelo admin
  if (perfil.ativo === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center space-y-3">
          <h1 className="text-lg font-bold text-[#1F3864] dark:text-blue-300">Usuário inativo</h1>
          <p className="text-sm text-gray-500">O seu acesso foi desativado. Fale com o administrador do sistema.</p>
          <button onClick={signOut} className="text-sm text-blue-600 hover:underline">Sair</button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
