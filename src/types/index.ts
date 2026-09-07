export type ParceriaId = 'A' | 'B' | 'C'
export type FormaPagamento = 'avista' | 'parcelado'
export type StatusLancamento = 'pendente' | 'pago' | 'cancelado'
export type StatusParcela = 'pendente' | 'pago' | 'vencido' | 'renegociada'

export interface Parceria {
  id: ParceriaId
  descricao: string
  camta_pct: number
  medico_pct: number
  psi1_pct: number
  psi2_pct: number
}

export interface Lancamento {
  id: string
  data_atendimento: string
  paciente: string
  parceria_id: ParceriaId
  forma_pagamento: FormaPagamento
  num_parcelas: number
  valor_total: number
  camta_valor: number
  medico_valor: number
  psi1_valor: number
  psi2_valor: number
  status: StatusLancamento
  observacoes?: string
  created_at: string
  parcelas?: Parcela[]
}

export interface Parcela {
  id: string
  lancamento_id: string
  parcela_num: number
  parcela_total: number
  data_vencimento: string
  data_pagamento?: string
  valor_parcela: number
  camta_valor: number
  medico_valor: number
  psi1_valor: number
  psi2_valor: number
  status: StatusParcela
  observacoes?: string
  created_at: string
}

export interface ResumoParceria {
  parceria: ParceriaId
  descricao: string
  total_atendimentos: number
  valor_total: number
  camta_total: number
  medico_total: number
  psi1_total: number
  psi2_total: number
}

export interface ResumoProfissional {
  profissional: string
  total: number
}

export interface RateioResult {
  camta_valor: number
  medico_valor: number
  psi1_valor: number
  psi2_valor: number
}

export interface ParcelaLog {
  id: string
  parcela_id: string
  campo_alterado: string
  valor_anterior: string | null
  valor_novo: string | null
  alterado_por: string | null
  alterado_em: string
  user_profiles?: { nome: string }
}

export interface Configuracao {
  id: number
  nome_clinica: string
  logo_url: string | null
  email_notificacao: string[]
  notificacao_ativa: boolean
  fuso_horario: string
  updated_at: string
}

export interface ParceriaCompleta {
  id: string
  descricao: string
  camta_pct: number
  medico_pct: number
  psi1_pct: number
  psi2_pct: number
  ativo: boolean
}

export interface Profissional {
  id: string
  nome: string
  tipo: 'camta' | 'medico' | 'psi1' | 'psi2'
  ativo: boolean
  created_at: string
}
