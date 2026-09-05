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
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4 border-b border-gray-100', className)}>{children}</div>
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
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost:     'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
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
          'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100',
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
          'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-[#1F3864]">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
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
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardBody>
    </Card>
  )
}
