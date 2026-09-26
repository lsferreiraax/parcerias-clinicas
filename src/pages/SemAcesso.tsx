import { useNavigate } from 'react-router-dom'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'

export default function SemAcesso() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
        <ShieldOff size={32} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Acesso Restrito</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
        Seu perfil de acesso não tem permissão para visualizar este módulo.
        Entre em contato com o administrador para solicitar acesso.
      </p>
      <Button variant="secondary" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Voltar
      </Button>
    </div>
  )
}
