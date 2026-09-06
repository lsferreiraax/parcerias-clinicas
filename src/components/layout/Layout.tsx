import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, ClipboardList, CreditCard, BarChart3 } from "lucide-react"

const nav = [
  { to: '/',          label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/lancamentos', label: 'Lançamentos', icon: ClipboardList },
  { to: '/parcelas',  label: 'Parcelas',    icon: CreditCard },
  { to: '/resumo',    label: 'Resumo',      icon: BarChart3 },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1F3864] text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-lg font-bold leading-tight">🏥 Parcerias Clínicas</h1>
          <p className="text-blue-300 text-xs mt-1">Sistema de Rateio</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
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
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-800 text-xs text-blue-400">
          v1.0.0 · {new Date().getFullYear()}
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
