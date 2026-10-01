import * as fs from 'node:fs'
import { PerfilId, STORAGE_KEY, caminhoAuth } from '../config'

export interface SessaoSupabase { accessToken: string; expiresAt: number; userId: string }

/** Lê a sessão de .auth-prod/<perfil>.json (ignorado pelo git; apagado no fim da rodada). Nunca é impressa. */
export function lerSessao(perfil: PerfilId): SessaoSupabase {
  const arq = caminhoAuth(perfil)
  if (!fs.existsSync(arq)) throw new Error(`Sessão do perfil "${perfil}" não encontrada. Rode o projeto de login (precisa das variáveis PROD_SMOKE_*).`)
  const st = JSON.parse(fs.readFileSync(arq, 'utf-8'))
  for (const o of st.origins ?? []) {
    for (const item of o.localStorage ?? []) {
      if (item.name === STORAGE_KEY || /auth-token$/.test(item.name)) {
        const s = JSON.parse(item.value)
        return { accessToken: s.access_token, expiresAt: s.expires_at ?? 0, userId: s.user?.id }
      }
    }
  }
  throw new Error(`Token não encontrado na sessão do perfil "${perfil}"`)
}
