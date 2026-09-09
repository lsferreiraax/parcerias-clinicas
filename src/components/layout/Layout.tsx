import { useState, useEffect } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { LayoutDashboard, ClipboardList, CreditCard, BarChart3, FileText, Users, LogOut, Settings, FileDown, ArrowLeftRight, AlertOctagon, Menu, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { usePerfil } from "@/contexts/PerfilContext"
import { useParcelasAlerta } from "@/hooks/useResumo"
import { useRepassesPendentesAlerta } from "@/hooks/useRepasses"
import type { Role } from "@/contexts/PerfilContext"

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  roles: Role[]
  badge?: 'parcelas' | 'repasses'
}

const nav: NavItem[] = [
  { to: '/',              label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin', 'gestor'] },
  { to: '/lancamentos',   label: 'Lançamentos',   icon: ClipboardList,   roles: ['admin', 'gestor'] },
  { to: '/parcelas',      label: 'Parcelas',      icon: CreditCard,      roles: ['admin', 'gestor'], badge: 'parcelas' },
  { to: '/inadimplencia', label: 'Inadimplência', icon: AlertOctagon,    roles: ['admin', 'gestor'] },
  { to: '/resumo',        label: 'Resumo',        icon: BarChart3,       roles: ['admin', 'gestor'] },
  { to: '/extrato',       label: 'Extrato',       icon: FileText,        roles: ['admin', 'gestor', 'profissional'] },
  { to: '/repasses',      label: 'Repasses',      icon: ArrowLeftRight,  roles: ['admin', 'gestor'], badge: 'repasses' },
  { to: '/relatorios',    label: 'Relatórios',    icon: FileDown,        roles: ['admin', 'gestor'] },
  { to: '/usuarios',      label: 'Usuários',      icon: Users,           roles: ['admin'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings,        roles: ['admin'] },
]

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', gestor: 'Gestor', profissional: 'Profissional' }

function SidebarContent({
  alertaCount, repassesAlerta, can, perfil, user, signOut, onNavClick,
}: {
  alertaCount: number
  repassesAlerta: number
  can: (roles: Role[]) => boolean
  perfil: { nome: string; role: Role } | null
  user: { email?: string } | null
  signOut: () => void
  onNavClick?: () => void
}) {
  return (
    <>
      <div className="p-6 border-b border-blue-800">
        <h1 className="text-lg font-bold leading-tight">🏥 Parcerias Clínicas</h1>
        <p className="text-blue-300 text-xs mt-1">Sistema de Rateio</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.filter(item => can(item.roles)).map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavClick}
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
            {badge === 'parcelas' && alertaCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {alertaCount}
              </span>
            )}
            {badge === 'repasses' && repassesAlerta > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {repassesAlerta}
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
    </>
  )
}

export default function Layout() {
  const { user, signOut }            = useAuth()
  const { perfil, can }              = usePerfil()
  const { data: alertaCount = 0 }    = useParcelasAlerta()
  const { data: repassesAlerta = 0 } = useRepassesPendentesAlerta()
  const [drawerOpen, setDrawerOpen]  = useState(false)
  const location                     = useLocation()

  // Fecha drawer ao navegar
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Bloqueia scroll do body quando drawer está aberto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const sidebarProps = { alertaCount, repassesAlerta, can, perfil, user, signOut }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar — desktop (sempre visível em md+) */}
      <aside className="hidden md:flex w-64 bg-[#1F3864] text-white flex-col shadow-xl shrink-0">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Drawer mobile — overlay + painel deslizante */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1F3864] text-white flex flex-col shadow-2xl transition-transform duration-300 md:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-0">
          <span className="text-sm font-bold text-blue-200">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <SidebarContent {...sidebarProps} onNavClick={() => setDrawerOpen(false)} />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b px-4 md:px-8 py-3 md:py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Botão hambúrguer — só mobile */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
            <div className="hidden md:block" />
            <div className="text-xs md:text-sm text-gray-500 text-right">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
