import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useConfiguracoes, useSalvarConfiguracoes } from '@/hooks/useConfiguracoes'

export default function DadosClinica() {
  const { data: cfg, isLoading } = useConfiguracoes()
  const salvar = useSalvarConfiguracoes()

  const [nome, setNome]       = useState('')
  const [emails, setEmails]   = useState('')  // CSV
  const [notif, setNotif]     = useState(true)

  useEffect(() => {
    if (!cfg) return
    setNome(cfg.nome_clinica)
    setEmails((cfg.email_notificacao ?? []).join(', '))
    setNotif(cfg.notificacao_ativa)
  }, [cfg])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email_notificacao = emails
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    await salvar.mutateAsync({ nome_clinica: nome, email_notificacao, notificacao_ativa: notif })
  }

  if (isLoading) return <p className="text-sm text-gray-400 py-6 text-center">Carregando...</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Clínica</label>
        <input
          type="text"
          required
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-mails de Notificação
          <span className="text-gray-400 font-normal ml-1">(separar por vírgula)</span>
        </label>
        <input
          type="text"
          value={emails}
          onChange={e => setEmails(e.target.value)}
          placeholder="email1@exemplo.com, email2@exemplo.com"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="notif"
          checked={notif}
          onChange={e => setNotif(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="notif" className="text-sm text-gray-700">
          Enviar notificação diária de parcelas vencidas
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={salvar.isPending}
          className="flex items-center gap-2 px-5 py-2 bg-[#1F3864] text-white text-sm font-medium rounded-lg hover:bg-[#2E75B6] disabled:opacity-50"
        >
          <Save size={15} />
          {salvar.isPending ? 'Salvando...' : 'Salvar'}
        </button>
        {salvar.isSuccess && <span className="text-sm text-green-600">Salvo com sucesso!</span>}
        {salvar.isError   && <span className="text-sm text-red-600">Erro ao salvar.</span>}
      </div>
    </form>
  )
}
