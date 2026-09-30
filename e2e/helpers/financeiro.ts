import type { Locator, Page } from '@playwright/test'
import { campo, modalAberto, abrirRota } from './ui'

export interface DadosLancamento {
  paciente: string
  /** Data do atendimento (YYYY-MM-DD). Data passada => parcelas vencidas. */
  data: string
  parcelas: number
  valor: number
}

/** Cria um lançamento parcelado pela tela de Lançamentos (parceria = a primeira da lista). */
export async function criarLancamentoPelaTela(page: Page, d: DadosLancamento): Promise<void> {
  await abrirRota(page, '/lancamentos')
  await page.getByRole('button', { name: /Novo Lançamento/ }).click()
  const modal = modalAberto(page)
  await modal.locator('h2', { hasText: 'Novo Lançamento' }).waitFor()
  await campo(modal, 'Data do Atendimento').fill(d.data)
  await campo(modal, 'Nome do Paciente').fill(d.paciente)
  await campo(modal, 'Forma de Pagamento').selectOption('parcelado')
  await campo(modal, 'Nº de Parcelas').fill(String(d.parcelas))
  await campo(modal, 'Valor Total (R$)').fill(String(d.valor))
  await modal.getByRole('button', { name: 'Salvar Lançamento' }).click()
  await modal.locator('h2', { hasText: 'Novo Lançamento' }).waitFor({ state: 'detached', timeout: 20_000 })
}

/** Filtra a tela de Parcelas pelo paciente (campo "Buscar paciente...") e devolve as linhas do paciente. */
export async function filtrarParcelas(page: Page, paciente: string) {
  await abrirRota(page, '/parcelas')
  await page.getByPlaceholder('Buscar paciente...').fill(paciente)
  const linhas = page.locator('table tbody tr', { hasText: paciente })
  await linhas.first().waitFor()
  return linhas
}

/**
 * Linha da parcela `num/total` dentro das linhas do paciente. Não usar regex sobre o texto da linha:
 * as células são concatenadas sem separador ("Mental1/3") e `\b` não casa; usa a célula exata "1/3".
 */
export function linhaParcela(linhas: Locator, num: number, total = 3): Locator {
  return linhas.filter({ has: linhas.page().getByRole('cell', { name: `${num}/${total}`, exact: true }) })
}

export const ROTULO_ABA_REPASSE: Record<string, string> = { medico: 'Médico', camta: 'Camta', psi1: 'Psi 1', psi2: 'Psi 2' }
