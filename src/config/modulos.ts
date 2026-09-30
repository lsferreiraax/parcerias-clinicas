// Controle de acesso por módulo em fase beta.
// Adicione o e-mail do usuário à lista do módulo para liberar o acesso.
// Domínios @staging.test têm acesso automático a todos os módulos (ambiente de homologação).
export const ACESSO_MODULOS: Record<string, string[]> = {
  psicologia: ['leandro.ferreira@bit.com.br', 'lsferreiraax@outlook.com'],
}

export function temAcessoModulo(modulo: string, email?: string | null): boolean {
  if (!email) return false
  if (email.endsWith('@staging.test')) return true
  return ACESSO_MODULOS[modulo]?.includes(email) ?? false
}
