import { useState, useEffect } from "react"
import pkg from '../../../package.json'
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { LayoutDashboard, ClipboardList, CreditCard, BarChart3, FileText, Users, LogOut, Settings, FileDown, ArrowLeftRight, AlertOctagon, Menu, X, Sun, Moon, Download, Wallet, UserRound, CalendarDays, Shield, Building2, Grid3X3, Home } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { usePerfil } from "@/contexts/PerfilContext"
import { usePermissoes } from "@/contexts/PermissoesContext"
import { useParcelasAlerta } from "@/hooks/useResumo"
import { useRepassesPendentesAlerta } from "@/hooks/useRepasses"
import { useCondominioAlerta } from "@/hooks/useCondominio"
import type { Role } from "@/contexts/PerfilContext"
import type { Modulo } from "@/contexts/PermissoesContext"

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  roles: Role[]
  badge?: 'parcelas' | 'repasses' | 'condominio'
  modulo?: Modulo
}

const nav: NavItem[] = [
  { to: '/',              label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin', 'gestor'],              modulo: 'parcerias' },
  { to: '/lancamentos',   label: 'Lançamentos',   icon: ClipboardList,   roles: ['admin', 'gestor'],              modulo: 'parcerias' },
  { to: '/parcelas',      label: 'Parcelas',      icon: CreditCard,      roles: ['admin', 'gestor'],              modulo: 'parcerias', badge: 'parcelas' },
  { to: '/inadimplencia', label: 'Inadimplência', icon: AlertOctagon,    roles: ['admin', 'gestor'],              modulo: 'parcerias' },
  { to: '/resumo',        label: 'Resumo',        icon: BarChart3,       roles: ['admin', 'gestor'],              modulo: 'parcerias' },
  { to: '/extrato',       label: 'Extrato',       icon: FileText,        roles: ['admin', 'gestor', 'profissional'], modulo: 'parcerias' },
  { to: '/repasses',        label: 'Repasses',        icon: ArrowLeftRight, roles: ['admin', 'gestor'],           modulo: 'parcerias', badge: 'repasses' },
  { to: '/conta-corrente',  label: 'Conta Corrente',  icon: Wallet,         roles: ['admin', 'gestor'],           modulo: 'conta_corrente' },
  { to: '/pacientes',       label: 'Pacientes',       icon: UserRound,      roles: ['admin', 'gestor', 'profissional'], modulo: 'psicologia' },
  { to: '/agenda',          label: 'Agenda',          icon: CalendarDays,   roles: ['admin', 'gestor', 'profissional'], modulo: 'psicologia' },
  { to: '/dashboard-psicologia', label: 'Psicologia', icon: BarChart3,      roles: ['admin', 'gestor', 'profissional'], modulo: 'psicologia' },
  { to: '/prontuario',      label: 'Prontuário',      icon: ClipboardList,  roles: ['profissional'],              modulo: 'psicologia' },
  { to: '/titular-dados',   label: 'Titular de Dados', icon: Shield,        roles: ['admin'],                    modulo: 'psicologia' },
  { to: '/salas',           label: 'Salas',            icon: Building2,     roles: ['admin'],                    modulo: 'salas' },
  { to: '/grade-salas',    label: 'Grade de Salas',   icon: Grid3X3,        roles: ['admin', 'gestor'],          modulo: 'salas' },
  { to: '/condominio',     label: 'Condomínio',       icon: Home,           roles: ['admin'],                    modulo: 'condominio', badge: 'condominio' },
  { to: '/relatorios',      label: 'Relatórios',      icon: FileDown,       roles: ['admin', 'gestor'],          modulo: 'relatorios' },
  { to: '/usuarios',        label: 'Usuários',        icon: Users,          roles: ['admin'],                    modulo: 'usuarios' },
  { to: '/perfis',          label: 'Perfis de Acesso', icon: Shield,        roles: ['admin'],                    modulo: 'usuarios' },
  { to: '/configuracoes',   label: 'Configurações',   icon: Settings,       roles: ['admin'],                    modulo: 'configuracoes' },
]

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', gestor: 'Gestor', profissional: 'Profissional' }

function SidebarContent({
  alertaCount, repassesAlerta, condominioAlerta, can, podeVer, perfil, user, signOut, onNavClick,
}: {
  alertaCount: number
  repassesAlerta: number
  condominioAlerta: number
  can: (roles: Role[]) => boolean
  podeVer: (modulo: Modulo) => boolean
  perfil: { nome: string; role: Role } | null
  user: { email?: string } | null
  signOut: () => void
  onNavClick?: () => void
}) {
  return (
    <>
      <div className="p-6 border-b border-blue-800">
        <h1 className="text-lg font-bold leading-tight text-white">🏥 Parcerias Clínicas</h1>
        <p className="text-blue-300 text-xs mt-1">Sistema de Rateio</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.filter(item =>
          can(item.roles) &&
          (!item.modulo || podeVer(item.modulo))
        ).map(({ to, label, icon: Icon, badge }) => (
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
            {badge === 'condominio' && condominioAlerta > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {condominioAlerta}
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
        <p className="text-xs text-blue-400">v{pkg.version} · {new Date().getFullYear()}</p>
      </div>
    </>
  )
}

// Hook para PWA install prompt
function usePWAInstall() {
  const [prompt, setPrompt] = useState<Event & { prompt?: () => void } | null>(null)

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as any) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt || !(prompt as any).prompt) return
    ;(prompt as any).prompt()
    setPrompt(null)
  }

  return { canInstall: !!prompt, install }
}

// Hook para dark mode
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark' } catch { return false }
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) { root.classList.add('dark') } else { root.classList.remove('dark') }
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* noop */ }
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}

export default function Layout() {
  const { user, signOut }              = useAuth()
  const { perfil, can }                = usePerfil()
  const { podeVer }                    = usePermissoes()
  const { data: alertaCount = 0 }      = useParcelasAlerta()
  const { data: repassesAlerta = 0 }   = useRepassesPendentesAlerta()
  const { data: condominioAlerta = 0 } = useCondominioAlerta()
  const [drawerOpen, setDrawerOpen]    = useState(false)
  const location                       = useLocation()
  const { dark, toggle: toggleDark }   = useDarkMode()
  const { canInstall, install }        = usePWAInstall()

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const sidebarProps = { alertaCount, repassesAlerta, condominioAlerta, can, podeVer, perfil, user, signOut }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-64 bg-[#1F3864] text-white flex-col shadow-xl shrink-0">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Drawer mobile */}
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
        <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 md:px-8 py-3 md:py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <button
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
            <div className="hidden md:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              {canInstall && (
                <button
                  onClick={install}
                  title="Instalar app"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F3864] dark:text-blue-300 bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Instalar app</span>
                </button>
              )}
              <button
                onClick={toggleDark}
                title={dark ? 'Modo claro' : 'Modo escuro'}
                className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
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
