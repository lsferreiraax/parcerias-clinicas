import type { Locator, Page } from '@playwright/test'
import { campo, modalAberto } from './ui'

export interface DadosSessao {
  paciente: string
  /** Nome do profissional; omitido para perfis com campo Profissional fixo (vinculado). */
  profissional?: string
  data: string
  inicio: string
  fim?: string
  salaNome?: string
  observacoes: string
  modalidade?: 'presencial' | 'online'
}

/** Abre "Nova Sessão" na Agenda e preenche o formulário (não clica em Agendar). Devolve o modal. */
export async function preencherNovaSessao(page: Page, d: DadosSessao): Promise<Locator> {
  await page.getByRole('button', { name: /Nova Sessão/ }).click()
  const modal = modalAberto(page)
  await modal.locator('h2', { hasText: 'Nova Sessão' }).waitFor()
  await campo(modal, 'Paciente').selectOption({ label: d.paciente })
  if (d.profissional) await campo(modal, 'Profissional').selectOption({ label: d.profissional })
  await campo(modal, 'Data').fill(d.data)
  await campo(modal, 'Início').fill(d.inicio)
  if (d.fim) await campo(modal, 'Fim').fill(d.fim)
  if (d.modalidade) await campo(modal, 'Modalidade').selectOption(d.modalidade)
  if (d.salaNome) await campo(modal, 'Sala').selectOption({ label: d.salaNome })
  await campo(modal, 'Observações').fill(d.observacoes)
  return modal
}

/** Preenche e confirma; espera o modal fechar (sucesso). Lança se o modal permanecer aberto. */
export async function agendarSessao(page: Page, d: DadosSessao): Promise<void> {
  const modal = await preencherNovaSessao(page, d)
  await modal.getByRole('button', { name: 'Agendar', exact: true }).click()
  await modal.locator('h2', { hasText: 'Nova Sessão' }).waitFor({ state: 'detached', timeout: 15_000 })
}

/** Cartão de sessão na grade semanal (pelo nome do paciente). */
export function cartaoSessao(page: Page, paciente: string): Locator {
  return page.locator('div.cursor-pointer', { hasText: paciente }).first()
}
