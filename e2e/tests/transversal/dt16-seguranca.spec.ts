/**
 * DT16 — segurança das funções de usuário, para CADA perfil logado (projetos admin, financeiro, profissional, recepcionista).
 *
 *  - Só admin chama criar-usuario (cadastrar/convidar/reenviar_convite/redefinir_senha): os demais recebem 403 e nada é criado.
 *  - Sem token: 401.
 *  - listar_perfis_com_email (migration 039): 0 linhas para não-admin; lista completa para admin.
 *  - trocar-senha sem a marca de troca pendente: 403 (usuários de teste NÃO têm a marca; o corpo enviado é inválido de
 *    propósito para que, mesmo num defeito, a senha do usuário de teste não seja alterada).
 *
 * Cuidado deliberado: as ações destrutivas (redefinir_senha/reenviar_convite) usam UUID aleatório, nunca o id de um
 * usuário real de teste. Sem trace/screenshot/vídeo (há senhas aleatórias em memória).
 */
import { test, expect } from '../../fixtures'
import { EMAILS } from '../../config'
import { clienteAutenticado, descrever, semDados } from '../../helpers/api'
import { chamarFuncao, desativarCriados, emailQA, perfilPorEmail, registrarCriado, senhaAleatoria, uuidAleatorio } from '../../helpers/usuarios'
import { lerSessao } from '../../helpers/sessao'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

test.afterAll(async () => {
  // Rede de segurança: se algum usuário foi criado indevidamente (defeito de autorização), desativa-o.
  await desativarCriados(await clienteAutenticado('admin'))
})

test.describe('DT16: autorização das Edge Functions e da listagem de usuários', () => {
  test('criar-usuario: só admin; os demais perfis recebem 403 e nada é criado', async ({ perfil, apiAdmin }) => {
    test.skip(perfil.id === 'admin', 'o admin é o único autorizado (coberto em tests/admin/07)')
    const token = lerSessao(perfil.id).accessToken

    for (const acao of ['cadastrar', 'convidar'] as const) {
      const email = emailQA(`negado-${perfil.id}`)
      const r = await chamarFuncao('criar-usuario', {
        acao, email, nome: 'QA-DT16-negado', role: 'gestor', senha: senhaAleatoria(),
      }, token)
      if (r.status === 200 && r.body?.id) registrarCriado(r.body.id)
      expect(r.status, `${perfil.id} acao=${acao}: ${JSON.stringify(r.body)}`).toBe(403)
      expect(String(r.body?.error)).toMatch(/Acesso negado/)
      expect(await perfilPorEmail(apiAdmin, email), `${acao}: nada criado`).toHaveLength(0)
    }

    // Ações sobre usuário existente, com id inexistente: a autorização vem antes (403, não 404)
    for (const acao of ['reenviar_convite', 'redefinir_senha'] as const) {
      const r = await chamarFuncao('criar-usuario', { acao, id: uuidAleatorio(), nova_senha: senhaAleatoria() }, token)
      expect(r.status, `${perfil.id} acao=${acao}: ${JSON.stringify(r.body)}`).toBe(403)
    }
  })

  test('criar-usuario e trocar-senha sem token (só a chave anon) devolvem 401 e nada é criado', async ({ perfil, apiAdmin }) => {
    test.skip(perfil.id !== 'admin', 'independe do perfil: roda uma vez')
    const email = emailQA('anonimo')
    const r = await chamarFuncao('criar-usuario', { acao: 'cadastrar', email, nome: 'QA-DT16-anon', role: 'gestor', senha: senhaAleatoria() })
    expect(r.status, JSON.stringify(r.body)).toBe(401)
    expect(await perfilPorEmail(apiAdmin, email)).toHaveLength(0)
    const t = await chamarFuncao('trocar-senha', { nova_senha: senhaAleatoria() })
    expect(t.status, JSON.stringify(t.body)).toBe(401)
    const g = await chamarFuncao('criar-usuario', { acao: 'redefinir_senha', id: uuidAleatorio(), nova_senha: senhaAleatoria() })
    expect(g.status).toBe(401)
  })

  test('trocar-senha sem a marca de troca pendente é recusado (403)', async ({ perfil }) => {
    const token = lerSessao(perfil.id).accessToken
    // corpo inválido de propósito: nunca altera a senha do usuário de teste, nem se a trava falhasse
    const r = await chamarFuncao('trocar-senha', { nova_senha: 'x' }, token)
    expect(r.status, `${perfil.id}: ${JSON.stringify(r.body)}`).toBe(403)
    expect(String(r.body?.error)).toMatch(/troca de senha obrigatória/)
  })

  test('listar_perfis_com_email: 0 linhas para não-admin; lista completa para admin (migration 039)', async ({ perfil, api }) => {
    const r = await api.rpc('listar_perfis_com_email')
    expect(r.status, descrever(r)).toBe(200)
    if (perfil.id !== 'admin') {
      expect(semDados(r), `${perfil.id}: ${descrever(r)}`).toBe(true)
      expect(r.body).toEqual([])
      return
    }
    const linhas = r.body as { email: string; perfil_id: string | null; convite_pendente: boolean; ultimo_login: string | null }[]
    for (const email of Object.values(EMAILS)) {
      const u = linhas.find(l => l.email === email)
      expect(u, `${email} listado para o admin`).toBeTruthy()
      expect(u!.perfil_id, `${email} tem perfil de acesso`).toBeTruthy()
      expect(u!.convite_pendente, `${email} já acessou (login do setup)`).toBe(false)
      expect(u!.ultimo_login).not.toBeNull()
    }
  })

  test('não-admin lê apenas o PRÓPRIO user_profiles', async ({ perfil, api, meuId }) => {
    test.skip(perfil.id === 'admin', 'o admin lê todos')
    const r = await api.get('user_profiles?select=id,email')
    expect(r.status, descrever(r)).toBe(200)
    expect((r.body as { id: string }[]).map(l => l.id), `${perfil.id} só vê a própria linha`).toEqual([meuId])
  })
})
