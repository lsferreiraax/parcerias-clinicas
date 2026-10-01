import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { trocarMinhaSenha, senhaValida } from '@/services/usuarios'

/** Tela única exibida enquanto a troca obrigatória de senha estiver pendente (convite, cadastro manual ou senha temporária). */
export default function TrocarSenha() {
  const { user, signOut } = useAuth()
  const [senha, setSenha]         = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrar, setMostrar]     = useState(false)
  const [erro, setErro]           = useState('')
  const [salvando, setSalvando]   = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!senhaValida(senha)) { setErro('A senha deve ter ao menos 10 caracteres, com letras e números.'); return }
    if (senha !== confirmar) { setErro('As senhas não conferem.'); return }
    setSalvando(true)
    try {
      await trocarMinhaSenha(senha)   // limpa a marca no servidor e renova a sessão; o guard libera o app
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <form onSubmit={salvar} className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-[#1F3864] dark:text-blue-300">Defina a sua senha</h1>
          <p className="text-sm text-gray-500 mt-1">
            Por segurança, é preciso criar uma nova senha antes de usar o sistema.
          </p>
          {user?.email && <p className="text-xs text-gray-400 mt-2">{user.email}</p>}
        </div>

        <div className="relative">
          <Input label="Nova senha" type={mostrar ? 'text' : 'password'} autoComplete="new-password"
            value={senha} onChange={e => setSenha(e.target.value)} />
          <button type="button" onClick={() => setMostrar(m => !m)}
            className="absolute right-3 top-8 text-gray-400" aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}>
            {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <Input label="Confirmar nova senha" type={mostrar ? 'text' : 'password'} autoComplete="new-password"
          value={confirmar} onChange={e => setConfirmar(e.target.value)} />
        <p className="text-xs text-gray-400">Mínimo de 10 caracteres, com letras e números, diferente da senha atual.</p>

        {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        <Button type="submit" className="w-full" loading={salvando}>Salvar nova senha</Button>
        <button type="button" onClick={signOut} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
          Sair
        </button>
      </form>
    </div>
  )
}
