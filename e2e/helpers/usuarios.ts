/**
 * Helpers do DT16 (cadastro de usuários, troca obrigatória de senha, usuário inativo).
 *
 * Regras de segurança:
 *  - NENHUMA senha em arquivo, log ou mensagem de erro: as senhas dos usuários que os testes criam são geradas aqui,
 *    em memória, de forma aleatória (crypto), e só vivem durante a execução do teste.
 *  - Só e-mails `qa-dt16-<aleatório>@staging.test` e nomes `QA-DT16-...`; ao final todo usuário criado é desativado
 *    (ativo=false). Apagar de auth.users exige service role: ver o SQL de limpeza em docs/scripts-banco-de-dados.md.
 */
import * as crypto from 'node:crypto'
import { PREFIXO_QA, SUPABASE_URL } from '../config'
import { ApiRest } from './api'
import { obterAnonKey, payloadJwt } from './bundle'
import { nomeQA } from './dados'
import { lerSessao } from './sessao'

export const EMAIL_PREFIXO = 'qa-dt16-'
export const EMAIL_DOMINIO = '@staging.test'

const LETRAS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'
const NUMEROS = '23456789'
const sorteio = (conj: string) => conj[crypto.randomInt(conj.length)]

/** Senha forte aleatória (18 caracteres, letras e números) gerada em memória; nunca imprimir nem gravar. */
export function senhaAleatoria(): string {
  const chars = [sorteio(LETRAS), sorteio(LETRAS), sorteio(LETRAS), sorteio(NUMEROS), sorteio(NUMEROS), sorteio(NUMEROS)]
  while (chars.length < 18) chars.push(sorteio(LETRAS + NUMEROS))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

/** E-mail único e descartável: qa-dt16-<rótulo><aleatório>@staging.test. */
export function emailQA(rotulo = ''): string {
  return `${EMAIL_PREFIXO}${rotulo ? rotulo + '-' : ''}${crypto.randomBytes(5).toString('hex')}${EMAIL_DOMINIO}`
}

export function uuidAleatorio(): string {
  return crypto.randomUUID()
}

export interface RespFuncao { status: number; body: any }

/** Chama uma Edge Function do staging. Sem `token`, usa só a chave anon (equivale a "sem login"). */
export async function chamarFuncao(nome: 'criar-usuario' | 'trocar-senha', corpo: unknown, token?: string): Promise<RespFuncao> {
  const anon = await obterAnonKey()
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${nome}`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${token ?? anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  const texto = await r.text()
  let body: any = texto
  try { body = texto ? JSON.parse(texto) : null } catch { /* mantém texto */ }
  return { status: r.status, body }
}

export interface Login {
  ok: boolean
  status: number
  /** Token de acesso (só em memória). */
  token: string
  api: ApiRest | null
  /** app_metadata.must_change_password do JWT recebido. */
  trocaPendente: boolean
}

/** Login por senha (grant password) direto na API de Auth; não imprime nem devolve o corpo da resposta de erro. */
export async function loginSenha(email: string, senha: string): Promise<Login> {
  const anon = await obterAnonKey()
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  })
  if (!r.ok) return { ok: false, status: r.status, token: '', api: null, trocaPendente: false }
  const j = (await r.json()) as { access_token: string }
  const claims = payloadJwt(j.access_token) as { app_metadata?: { must_change_password?: boolean } }
  return {
    ok: true, status: r.status, token: j.access_token, api: new ApiRest(anon, j.access_token),
    trocaPendente: claims.app_metadata?.must_change_password === true,
  }
}

/** Token do admin da sessão do storageState (para chamar a Edge Function como admin). */
export function tokenAdmin(): string {
  return lerSessao('admin').accessToken
}

export interface UsuarioQA { id: string; email: string; senha: string; nome: string }

const criados = new Set<string>()

export interface DadosCadastro {
  rotulo?: string
  role?: 'admin' | 'gestor' | 'profissional'
  tipo_profissional?: string
  profissional_id?: string
  perfil_id?: string
}

/** Cadastro manual (acao=cadastrar) como admin; registra o id para a desativação no fim do teste. */
export async function cadastrarUsuarioQA(d: DadosCadastro = {}): Promise<UsuarioQA & { resp: RespFuncao }> {
  const email = emailQA(d.rotulo)
  const senha = senhaAleatoria()
  const nome = nomeQA('DT16', d.rotulo ?? '')
  const resp = await chamarFuncao('criar-usuario', {
    acao: 'cadastrar', email, nome, role: d.role ?? 'gestor', senha,
    tipo_profissional: d.tipo_profissional, profissional_id: d.profissional_id, perfil_id: d.perfil_id,
  }, tokenAdmin())
  if (resp.status === 200 && resp.body?.id) criados.add(resp.body.id)
  return { id: resp.body?.id ?? '', email, senha, nome, resp }
}

export function registrarCriado(id: string): void { if (id) criados.add(id) }

/** Desativa (ativo=false) os usuários criados nesta execução; devolve quantos foram desativados. */
export async function desativarCriados(admin: ApiRest): Promise<number> {
  const ids = [...criados]
  if (!ids.length) return 0
  const r = await admin.patch(`user_profiles?id=in.(${ids.join(',')})`, { ativo: false })
  criados.clear()
  return Array.isArray(r.body) ? r.body.length : 0
}

/** Perfil (user_profiles) de um usuário pelo e-mail, lido com o token do admin. */
export async function perfilPorEmail(admin: ApiRest, email: string): Promise<any[]> {
  const r = await admin.get(`user_profiles?select=*&email=eq.${encodeURIComponent(email)}`)
  return Array.isArray(r.body) ? r.body : []
}

/**
 * Limpeza geral (setup e teardown): desativa QUALQUER usuário `qa-dt16-*@staging.test` ainda ativo (resíduo de execução
 * interrompida) e prefixa o nome com "QA-" se faltar. NÃO apaga de auth.users (exige service role: ver SQL de limpeza em
 * docs/scripts-banco-de-dados.md). Falha aqui vira aviso (nunca derruba a suíte).
 */
export async function desativarUsuariosQA(admin: ApiRest): Promise<string> {
  const padrao = `like.${EMAIL_PREFIXO}*${EMAIL_DOMINIO}`
  try {
    const ativos = await admin.patch(`user_profiles?email=${padrao}&ativo=eq.true`, { ativo: false })
    const total = await admin.get(`user_profiles?select=id,nome&email=${padrao}`)
    const semPrefixo = Array.isArray(total.body) ? total.body.filter((u: { nome: string }) => !u.nome?.startsWith(PREFIXO_QA)) : []
    for (const u of semPrefixo as { id: string; nome: string }[]) {
      await admin.patch(`user_profiles?id=eq.${u.id}`, { nome: `${PREFIXO_QA}${u.nome}` })
    }
    if (ativos.status >= 200 && ativos.status < 300 && total.status === 200) {
      return `usuarios QA (qa-dt16-*): ${Array.isArray(ativos.body) ? ativos.body.length : 0} desativado(s) agora; ${total.body.length} no total ` +
        '(permanecem em auth.users, desativados; para apagar use o SQL de limpeza do docs/scripts-banco-de-dados.md)'
    }
    return `AVISO usuarios QA: desativação não confirmada (HTTP ${ativos.status}/${total.status}); confira user_profiles com e-mail qa-dt16-*`
  } catch (e) {
    return `AVISO usuarios QA: erro ao desativar (${(e as Error).message}); confira user_profiles com e-mail qa-dt16-*`
  }
}
