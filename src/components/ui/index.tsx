export { FiltroData } from './FiltroData'

// ── Paginacao ─────────────────────────────────────────────────────
export function Paginacao({
  total, pagina, porPagina, onChange,
}: {
  total: number
  pagina: number
  porPagina: number
  onChange: (p: number) => void
}) {
  const totalPaginas = Math.ceil(total / porPagina)
  if (totalPaginas <= 1) return null
  const inicio = (pagina - 1) * porPagina + 1
  const fim    = Math.min(pagina * porPagina, total)
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
      <span>{inicio}–{fim} de {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(pagina - 1)}
          disabled={pagina === 1}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium"
        >
          ← Anterior
        </button>
        <span className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
          {pagina} / {totalPaginas}
        </span>
        <button
          onClick={() => onChange(pagina + 1)}
          disabled={pagina === totalPaginas}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium"
        >
          Próxima →
        </button>
      </div>
    </div>
  )
}
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { ReactNode } from 'react'

// ── Badge ─────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'A' | 'B' | 'C' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-800',
    danger:  'bg-red-100 text-red-700',
    A: 'bg-blue-100 text-blue-800',
    B: 'bg-green-100 text-green-800',
    C: 'bg-yellow-100 text-yellow-800',
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant])}>
      {children}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4 border-b border-gray-100 dark:border-gray-700', className)}>{children}</div>
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

// ── Button ────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
export function Button({ children, variant = 'primary', size = 'md', loading, className, disabled, ...rest }: ButtonProps) {
  const variants = {
    primary:   'bg-[#1F3864] text-white hover:bg-[#152744] focus:ring-blue-500',
    secondary: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-gray-500',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost:     'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className
      )}
    >
      {loading && <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}
export function Input({ label, error, className, ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        {...rest}
        className={cn(
          'w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-blue-50 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600',
          error && 'border-red-400',
          className
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}
export function Select({ label, error, children, className, ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        {...rest}
        className={cn(
          'w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-blue-50 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error && 'border-red-400',
          className
        )}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-[#1F3864] dark:text-blue-300">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card className={cn('border-l-4', color ?? 'border-l-[#2E75B6]')}>
      <CardBody>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </CardBody>
    </Card>
  )
}
