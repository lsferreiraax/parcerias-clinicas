import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, ClipboardList, CreditCard, BarChart3, FileText, Users, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { usePerfil } from "@/contexts/PerfilContext"
import { useParcelasAlerta } from "@/hooks/useResumo"
import type { Role } from "@/contexts/PerfilContext"

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  roles: Role[]
  badge?: boolean
}

const nav: NavItem[] = [
  { to: '/',              label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin', 'gestor'] },
  { to: '/lancamentos',   label: 'Lançamentos',   icon: ClipboardList,   roles: ['admin', 'gestor'] },
  { to: '/parcelas',      label: 'Parcelas',      icon: CreditCard,      roles: ['admin', 'gestor'], badge: true },
  { to: '/resumo',        label: 'Resumo',        icon: BarChart3,       roles: ['admin', 'gestor'] },
  { to: '/extrato',       label: 'Extrato',       icon: FileText,        roles: ['admin', 'gestor', 'profissional'] },
  { to: '/usuarios',      label: 'Usuários',      icon: Users,           roles: ['admin'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings,        roles: ['admin'] },
]

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', gestor: 'Gestor', profissional: 'Profissional' }

export default function Layout() {
  const { user, signOut }        = useAuth()
  const { perfil, can }          = usePerfil()
  const { data: alertaCount = 0 } = useParcelasAlerta()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1F3864] text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-lg font-bold leading-tight">🏥 Parcerias Clínicas</h1>
          <p className="text-blue-300 text-xs mt-1">Sistema de Rateio</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.filter(item => can(item.roles)).map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2E75B6] text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {badge && alertaCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {alertaCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-800 space-y-2">
          {perfil && (
            <div>
              <p className="text-xs text-white font-medium truncate">{perfil.nome}</p>
              <p className="text-xs text-blue-400">{ROLE_LABEL[perfil.role]}</p>
            </div>
          )}
          {!perfil && user && (
            <p className="text-xs text-blue-300 truncate">{user.email}</p>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>
          <p className="text-xs text-blue-400">v1.1.0 · {new Date().getFullYear()}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div />
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
