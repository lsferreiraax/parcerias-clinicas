import { useState } from 'react'
import { Settings, Handshake, UserCog, Bell } from 'lucide-react'
import { Card } from '@/components/ui'
import DadosClinica from '@/components/config/DadosClinica'
import GerenciarParcerias from '@/components/config/GerenciarParcerias'
import GerenciarProfissionais from '@/components/config/GerenciarProfissionais'

type Aba = 'clinica' | 'parcerias' | 'profissionais' | 'notificacoes'

const abas: { id: Aba; label: string; icon: React.ElementType }[] = [
  { id: 'clinica',        label: 'Dados da Clínica',    icon: Settings   },
  { id: 'parcerias',      label: 'Parcerias',            icon: Handshake  },
  { id: 'profissionais',  label: 'Profissionais',        icon: UserCog    },
  { id: 'notificacoes',   label: 'Notificações',         icon: Bell       },
]

export default function Configuracoes() {
  const [aba, setAba] = useState<Aba>('clinica')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864]">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie os dados da clínica, parcerias e profissionais</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {abas.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              aba === id
                ? 'border-[#1F3864] text-[#1F3864]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <Card>
        <div className="p-6">
          {aba === 'clinica'       && <DadosClinica />}
          {aba === 'parcerias'     && <GerenciarParcerias />}
          {aba === 'profissionais' && <GerenciarProfissionais />}
          {aba === 'notificacoes'  && <AbaNotificacoes />}
        </div>
      </Card>
    </div>
  )
}

function AbaNotificacoes() {
  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-gray-600">
        As configurações de e-mail e ativação da notificação estão na aba <strong>Dados da Clínica</strong>.
      </p>
      <p className="text-sm text-gray-600">
        A notificação diária é disparada automaticamente pelo Supabase (pg_cron) às <strong>08h00 BRT</strong>,
        enviando um resumo de todas as parcelas vencidas para os e-mails cadastrados.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        Para testar o envio manualmente, execute a Edge Function <code className="font-mono text-xs">notificar-vencidas</code> no painel do Supabase → Edge Functions → Invoke.
      </div>
    </div>
  )
}
