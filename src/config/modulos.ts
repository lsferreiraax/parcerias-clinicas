// Controle de acesso por módulo em fase beta.
// Adicione o e-mail do usuário à lista do módulo para liberar o acesso.
export const ACESSO_MODULOS: Record<string, string[]> = {
  psicologia: ['leandro.ferreira@bit.com.br'],
}

export function temAcessoModulo(modulo: string, email?: string | null): boolean {
  if (!email) return false
  return ACESSO_MODULOS[modulo]?.includes(email) ?? false
}
