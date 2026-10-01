/**
 * DT16 — cadastro de usuários, troca obrigatória de senha, usuário inativo, redefinir senha e reenvio de convite.
 *
 * Critérios do backlog cobertos: A1 (perfil_id/profissional_id/email gravados), A3 (só admin; ver também
 * transversal/dt16-seguranca), A4 (cadastro manual cria usuário que loga), A5 (primeiro acesso força troca e bloqueia o
 * app), A6 (reenviar convite só para quem nunca logou), A7 (redefinir senha reativa a troca), A8 (validações),
 * A9 (nenhuma senha devolvida/impressa), bloqueio de usuário inativo e troca pendente no banco (migration 040).
 *
 * Segurança: senhas dos usuários criados são aleatórias, geradas em memória (helpers/usuarios.ts), nunca impressas
 * nem gravadas; trace/screenshot/vídeo desligados neste arquivo (o UI digita senhas); ao final todo usuário criado é
 * desativado (ativo=false) com nome "QA-DT16-...". Nada de e-mail é disparado, exceto o teste opt-in E2E_TESTA_CONVITE=sim.
 */
import type { Browser, Page } from '@playwright/test'
import { test, expect } from '../../fixtures'
import { BASE_URL, PROFISSIONAL_ANA_ID } from '../../config'
import { clienteAutenticado, descrever, semDados } from '../../helpers/api'
import { campoExato, modalAberto } from '../../helpers/ui'
import {
  UsuarioQA, cadastrarUsuarioQA, chamarFuncao, desativarCriados, emailQA, loginSenha, perfilPorEmail,
  registrarCriado, senhaAleatoria, tokenAdmin, uuidAleatorio,
} from '../../helpers/usuarios'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test.describe.configure({ mode: 'serial' })

const MSG_SENHA = /ao menos 10 caracteres/

let perfis: Record<string, string> = {}
let u1: UsuarioQA          // gestor (perfil financeiro), cadastrado pela API; usado nas provas de API
let u3: UsuarioQA          // gestor (perfil financeiro), cadastrado pela tela; usado nas provas de UI

async function novoContextoIsolado(browser: Browser) {
  return browser.newContext({
    baseURL: BASE_URL, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block',
    viewport: { width: 1366, height: 800 },
  })
}

async function entrarPelaTela(page: Page, email: string, senha: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

test.beforeAll(async () => {
  const admin = await clienteAutenticado('admin')
  const r = await admin.get('perfis_acesso?select=id,nome')
  perfis = Object.fromEntries((r.body as { id: string; nome: string }[]).map(p => [p.nome.toLowerCase(), p.id]))
})

test.afterAll(async () => {
  // Desativa (ativo=false) todo usuário criado por este arquivo. Apagar de auth.users exige service role (ver docs).
  const n = await desativarCriados(await clienteAutenticado('admin'))
  console.log(`[dt16] ${n} usuário(s) de teste desativado(s)`)
})

test.describe('DT16 admin: cadastro manual (API da Edge Function)', () => {
  test('A1/A4: cadastro manual de gestor com perfil financeiro grava user_profiles correto', async ({ apiAdmin }) => {
    expect(perfis.financeiro, 'perfil de acesso "financeiro" existe no staging').toBeTruthy()
    const criado = await cadastrarUsuarioQA({ rotulo: 'api', role: 'gestor', perfil_id: perfis.financeiro })
    u1 = criado
    expect(criado.resp.status, JSON.stringify(criado.resp.body)).toBe(200)
    expect(criado.resp.body.id).toMatch(/^[0-9a-f-]{36}$/)
    // A9: a resposta não devolve a senha
    expect(JSON.stringify(criado.resp.body)).not.toContain(u1.senha)

    const linhas = await perfilPorEmail(apiAdmin, u1.email)
    expect(linhas, 'uma linha em user_profiles').toHaveLength(1)
    const p = linhas[0]
    expect(p.id).toBe(u1.id)
    expect(p.email).toBe(u1.email)
    expect(p.role).toBe('gestor')
    expect(p.perfil_id).toBe(perfis.financeiro)
    expect(p.ativo).toBe(true)
    expect(p.profissional_id).toBeNull()
    expect(String(p.nome)).toMatch(/^QA-/)

    // Nunca logou: a listagem do admin marca o convite pendente e sem último login
    const lista = await apiAdmin.rpc('listar_perfis_com_email')
    const linha = (lista.body as any[]).find(u => u.id === u1.id)
    expect(linha, 'usuário aparece em listar_perfis_com_email').toBeTruthy()
    expect(linha.convite_pendente).toBe(true)
    expect(linha.ultimo_login).toBeNull()
    expect(linha.perfil_id).toBe(perfis.financeiro)
  })

  test('A1: profissional vinculado grava profissional_id/tipo e, sem perfil_id, usa o perfil padrão "profissional"', async ({ apiAdmin }) => {
    const u2 = await cadastrarUsuarioQA({ rotulo: 'prof', role: 'profissional', tipo_profissional: 'psi1', profissional_id: PROFISSIONAL_ANA_ID })
    expect(u2.resp.status, JSON.stringify(u2.resp.body)).toBe(200)
    const [p] = await perfilPorEmail(apiAdmin, u2.email)
    expect(p.role).toBe('profissional')
    expect(p.tipo_profissional).toBe('psi1')
    expect(p.profissional_id).toBe(PROFISSIONAL_ANA_ID)
    expect(p.perfil_id, 'perfil padrão do papel profissional').toBe(perfis.profissional)
  })

  test('A8: validações recusadas com 400 e mensagem; nada é criado', async ({ apiAdmin }) => {
    const casos: { nome: string; corpo: Record<string, unknown>; msg: RegExp }[] = [
      { nome: 'profissional sem profissional_id', corpo: { role: 'profissional', tipo_profissional: 'psi1' }, msg: /Vincule o usuário a um profissional/ },
      { nome: 'profissional sem tipo', corpo: { role: 'profissional', profissional_id: PROFISSIONAL_ANA_ID }, msg: /tipo do profissional/ },
      { nome: 'profissional_id de tipo diferente (Ana é psi1, enviado medico)', corpo: { role: 'profissional', tipo_profissional: 'medico', profissional_id: PROFISSIONAL_ANA_ID }, msg: /não confere/ },
      { nome: 'profissional_id inexistente', corpo: { role: 'profissional', tipo_profissional: 'psi1', profissional_id: uuidAleatorio() }, msg: /não encontrado ou inativo/ },
      { nome: 'senha curta', corpo: { role: 'gestor', senha: 'abc123' }, msg: MSG_SENHA },
      { nome: 'senha sem número', corpo: { role: 'gestor', senha: 'somenteletrasaqui' }, msg: MSG_SENHA },
      { nome: 'senha sem letra', corpo: { role: 'gestor', senha: '12345678901234' }, msg: MSG_SENHA },
      { nome: 'senha ausente', corpo: { role: 'gestor' }, msg: MSG_SENHA },
      { nome: 'role inválido', corpo: { role: 'superadmin', senha: senhaAleatoria() }, msg: /Papel \(role\) inválido/ },
      { nome: 'perfil de acesso inexistente', corpo: { role: 'gestor', senha: senhaAleatoria(), perfil_id: uuidAleatorio() }, msg: /Perfil de acesso não encontrado/ },
    ]
    for (const c of casos) {
      const email = emailQA('invalido')
      const r = await chamarFuncao('criar-usuario', { acao: 'cadastrar', email, nome: 'QA-DT16-invalido', ...c.corpo }, tokenAdmin())
      expect(r.status, `${c.nome}: ${JSON.stringify(r.body)}`).toBe(400)
      expect(String(r.body?.error), c.nome).toMatch(c.msg)
      expect(await perfilPorEmail(apiAdmin, email), `${c.nome}: nada criado em user_profiles`).toHaveLength(0)
    }
    // e-mail inválido e nome vazio
    const e1 = await chamarFuncao('criar-usuario', { acao: 'cadastrar', email: 'isto-nao-e-email', nome: 'QA-DT16-x', role: 'gestor', senha: senhaAleatoria() }, tokenAdmin())
    expect(e1.status).toBe(400)
    expect(String(e1.body?.error)).toMatch(/e-mail válido/)
    const e2 = await chamarFuncao('criar-usuario', { acao: 'cadastrar', email: emailQA('semnome'), nome: '  ', role: 'gestor', senha: senhaAleatoria() }, tokenAdmin())
    expect(e2.status).toBe(400)
    expect(String(e2.body?.error)).toMatch(/nome é obrigatório/)
    const e3 = await chamarFuncao('criar-usuario', { acao: 'inexistente' }, tokenAdmin())
    expect(e3.status).toBe(400)
  })

  test('A8: e-mail duplicado dá mensagem amigável (sem vazar texto do Auth) e não duplica o perfil', async ({ apiAdmin }) => {
    const nova = senhaAleatoria()
    for (const email of [u1.email, u1.email.toUpperCase()]) {
      const r = await chamarFuncao('criar-usuario', { acao: 'cadastrar', email, nome: 'QA-DT16-dup', role: 'gestor', perfil_id: perfis.financeiro, senha: nova }, tokenAdmin())
      expect(r.status, JSON.stringify(r.body)).toBe(400)
      expect(r.body.error).toBe('Já existe um usuário com este e-mail.')
    }
    expect(await perfilPorEmail(apiAdmin, u1.email), 'continua uma única linha').toHaveLength(1)
  })
})

test.describe('DT16 admin: tela Usuários', () => {
  test('coluna "ainda não acessou" aparece para quem nunca logou e não para quem já acessou', async ({ page }) => {
    await page.goto('/usuarios')
    const nova = page.locator('tbody tr', { hasText: u1.email })
    await expect(nova).toHaveCount(1)
    await expect(nova.getByText('ainda não acessou')).toBeVisible()
    await expect(nova.getByRole('button', { name: 'Reenviar convite' }), 'reenviar convite disponível para quem nunca acessou').toBeVisible()
    // Usuários que o setup já logou não têm a marca
    for (const email of ['admin@staging.test', 'financeiro@staging.test']) {
      await expect(page.locator('tbody tr', { hasText: email }).getByText('ainda não acessou'), email).toHaveCount(0)
    }
  })

  test('Novo Usuário (cadastro manual pela tela): validações, e-mail duplicado amigável e criação', async ({ page, apiAdmin }) => {
    u3 = { id: '', email: emailQA('ui'), senha: senhaAleatoria(), nome: 'QA-DT16-ui' }
    await page.goto('/usuarios')
    await page.getByRole('button', { name: 'Novo Usuário' }).click()
    const modal = modalAberto(page)
    await expect(modal.locator('h2', { hasText: 'Novo Usuário' })).toBeVisible()

    // Alterna para "Cadastrar com senha" e confere o campo da senha inicial
    await modal.getByRole('radio', { name: 'Cadastrar com senha' }).click()
    await expect(campoExato(modal, 'Senha inicial')).toBeVisible()
    const salvar = modal.getByRole('button', { name: 'Cadastrar Usuário' })

    // 1) vazio
    await salvar.click()
    await expect(modal.getByText('E-mail e nome são obrigatórios.')).toBeVisible()

    // 2) profissional sem vínculo
    await campoExato(modal, 'E-mail').fill(u3.email)
    await campoExato(modal, 'Nome').fill(u3.nome)
    await campoExato(modal, 'Perfil').selectOption('profissional')
    await campoExato(modal, 'Tipo do Profissional').selectOption('psi1')
    await salvar.click()
    await expect(modal.getByText(/Vincule o usuário a um profissional/)).toBeVisible()
    await campoExato(modal, 'Perfil').selectOption('gestor')

    // 3) perfil de acesso explícito (financeiro) + senha fraca
    await campoExato(modal, 'Perfil de Acesso').selectOption(perfis.financeiro)
    await campoExato(modal, 'Senha inicial').fill('abc')
    await salvar.click()
    await expect(modal.getByText(MSG_SENHA)).toBeVisible()

    // 4) e-mail duplicado: mensagem amigável vinda da Edge Function
    await campoExato(modal, 'E-mail').fill(u1.email)
    await campoExato(modal, 'Senha inicial').fill(u3.senha)
    await salvar.click()
    await expect(modal.getByText('Já existe um usuário com este e-mail.')).toBeVisible()
    expect(await perfilPorEmail(apiAdmin, u3.email), 'nada foi criado nas tentativas inválidas').toHaveLength(0)

    // 5) criação válida
    await campoExato(modal, 'E-mail').fill(u3.email)
    await salvar.click()
    const aviso = page.locator('p[role="status"]')
    await expect(aviso).toContainText('Usuário cadastrado')
    await expect(aviso).not.toContainText(u3.senha)

    const [p] = await perfilPorEmail(apiAdmin, u3.email)
    expect(p, 'linha criada').toBeTruthy()
    u3.id = p.id
    registrarCriado(p.id)
    expect(p.perfil_id).toBe(perfis.financeiro)
    expect(p.role).toBe('gestor')
    expect(p.email).toBe(u3.email)
    expect(String(p.nome)).toMatch(/^QA-/)
    await expect(page.locator('tbody tr', { hasText: u3.email }).getByText('ainda não acessou')).toBeVisible()
  })
})

test.describe('DT16: troca obrigatória de senha na tela (usuário recém-criado, contexto isolado)', () => {
  test('A5: só "Defina a sua senha"; URL direta não escapa; validações; após trocar o app abre', async ({ browser, page }) => {
    const ctx = await novoContextoIsolado(browser)
    try {
      const p = await ctx.newPage()
      await entrarPelaTela(p, u3.email, u3.senha)
      const titulo = p.getByRole('heading', { name: 'Defina a sua senha' })
      await expect(titulo).toBeVisible({ timeout: 30_000 })
      await expect(p.locator('aside'), 'menu do app não é renderizado').toHaveCount(0)

      // URLs diretas (recarga completa) continuam na tela de troca
      for (const rota of ['/lancamentos', '/parcelas', '/usuarios', '/']) {
        await p.goto(rota)
        await expect(titulo, `rota ${rota}`).toBeVisible({ timeout: 30_000 })
        await expect(p.locator('aside'), `rota ${rota}: sem menu`).toHaveCount(0)
      }

      const nova = campoExato(p, 'Nova senha')
      const conf = campoExato(p, 'Confirmar nova senha')
      const enviar = p.getByRole('button', { name: 'Salvar nova senha' })

      // senha fraca (cliente)
      await nova.fill('abc'); await conf.fill('abc'); await enviar.click()
      await expect(p.getByText(MSG_SENHA).first()).toBeVisible()
      // confirmação diferente
      const senhaNova = senhaAleatoria()
      await nova.fill(senhaNova); await conf.fill(senhaAleatoria()); await enviar.click()
      await expect(p.getByText('As senhas não conferem.')).toBeVisible()
      // igual à atual (servidor recusa)
      await nova.fill(u3.senha); await conf.fill(u3.senha); await enviar.click()
      await expect(p.getByText('A nova senha deve ser diferente da senha atual.')).toBeVisible()
      await expect(titulo).toBeVisible()

      // senha válida e diferente: o app libera
      await nova.fill(senhaNova); await conf.fill(senhaNova); await enviar.click()
      await expect(titulo).toBeHidden({ timeout: 30_000 })
      await expect(p.locator('aside nav a').first()).toBeVisible({ timeout: 30_000 })
      u3.senha = senhaNova

      // Recarregar mantém o app liberado
      await p.goto('/lancamentos')
      await expect(p.locator('main h1').first()).toBeVisible({ timeout: 30_000 })
      await expect(titulo).toHaveCount(0)
    } finally {
      await ctx.close()
    }

    // A listagem do admin deixa de marcar "ainda não acessou" para u3
    await page.goto('/usuarios')
    const linha = page.locator('tbody tr', { hasText: u3.email })
    await expect(linha).toHaveCount(1)
    await expect(linha.getByText('ainda não acessou')).toHaveCount(0)
  })

  test('usuário desativado pelo admin vê "Usuário inativo" e a API não devolve dados', async ({ browser, apiAdmin }) => {
    const antes = await apiAdmin.get('lancamentos?select=id&limit=1')
    const off = await apiAdmin.patch(`user_profiles?id=eq.${u3.id}`, { ativo: false })
    expect(off.status, descrever(off)).toBe(200)
    expect((off.body as any[])[0].ativo).toBe(false)

    // Tela
    const ctx = await novoContextoIsolado(browser)
    try {
      const p = await ctx.newPage()
      await entrarPelaTela(p, u3.email, u3.senha)
      await expect(p.getByRole('heading', { name: 'Usuário inativo' })).toBeVisible({ timeout: 30_000 })
      await expect(p.locator('aside')).toHaveCount(0)
      await p.goto('/lancamentos')
      await expect(p.getByRole('heading', { name: 'Usuário inativo' })).toBeVisible({ timeout: 30_000 })
    } finally {
      await ctx.close()
    }

    // API com o token dele (senha já trocada, sem a marca): migration 040 nega o acesso
    const lg = await loginSenha(u3.email, u3.senha)
    expect(lg.ok, `login HTTP ${lg.status}`).toBe(true)
    expect(lg.trocaPendente).toBe(false)
    const api = lg.api!
    if (!Array.isArray(antes.body) || antes.body.length === 0) {
      test.info().annotations.push({ type: 'aviso', description: 'admin não vê lancamentos no staging: prova de bloqueio menos forte' })
    }
    for (const [rotulo, r] of [
      ['lancamentos', await api.get('lancamentos?select=id&limit=5')],
      ['parcelas', await api.get('parcelas?select=id&limit=5')],
      ['repasses', await api.get('repasses?select=id&limit=5')],
      ['pacientes', await api.get('pacientes?select=id&limit=5')],
      ['psicologia.sessoes', await api.get('sessoes?select=id&limit=5', 'psicologia')],
      ['psicologia.prontuarios', await api.get('prontuarios?select=id&limit=5', 'psicologia')],
    ] as const) {
      expect(semDados(r), `${rotulo}: ${descrever(r)}`).toBe(true)
    }
    const proprio = await api.get(`user_profiles?select=id,ativo&id=eq.${u3.id}`)
    expect(proprio.body, 'continua lendo o PRÓPRIO user_profiles (a tela mostra "Usuário inativo")').toEqual([{ id: u3.id, ativo: false }])
    expect((await api.rpc('get_my_role')).body).toBeNull()
    expect((await api.rpc('acl_ver', { p_modulo: 'parcerias' })).body).toBe(false)
    expect((await api.rpc('acl_editar', { p_modulo: 'parcerias' })).body).toBe(false)
    expect((await api.rpc('meu_profissional_id')).body).toBeNull()
  })
})

test.describe('DT16: troca pendente na API (migration 040), trocar-senha, redefinir e reenviar convite', () => {
  test('usuário com troca pendente: gestor financeiro não lê lancamentos/parcelas/sessões, mas lê o próprio perfil', async ({ apiAdmin }) => {
    const lg = await loginSenha(u1.email, u1.senha)
    expect(lg.ok, `login com a senha inicial: HTTP ${lg.status}`).toBe(true)
    expect(lg.trocaPendente, 'o JWT traz app_metadata.must_change_password=true').toBe(true)
    const api = lg.api!

    const admLanc = await apiAdmin.get('lancamentos?select=id&limit=1')
    if (!Array.isArray(admLanc.body) || admLanc.body.length === 0) {
      test.info().annotations.push({ type: 'aviso', description: 'admin não vê lancamentos no staging: prova de bloqueio menos forte' })
    }
    for (const [rotulo, r] of [
      ['lancamentos', await api.get('lancamentos?select=id&limit=5')],
      ['parcelas', await api.get('parcelas?select=id&limit=5')],
      ['repasses', await api.get('repasses?select=id&limit=5')],
      ['pacientes', await api.get('pacientes?select=id&limit=5')],
      ['psicologia.sessoes', await api.get('sessoes?select=id&limit=5', 'psicologia')],
    ] as const) {
      expect(semDados(r), `${rotulo}: ${descrever(r)}`).toBe(true)
    }
    const proprio = await api.get(`user_profiles?select=id,role,ativo&id=eq.${u1.id}`)
    expect(proprio.body).toEqual([{ id: u1.id, role: 'gestor', ativo: true }])
    expect((await api.rpc('get_my_role')).body).toBeNull()
    expect((await api.rpc('acl_ver', { p_modulo: 'parcerias' })).body).toBe(false)
    expect((await api.rpc('meu_profissional_id')).body).toBeNull()
    expect(semDados(await api.rpc('listar_perfis_com_email'))).toBe(true)
  })

  test('A5/A8: trocar-senha recusa sem token, senha fraca e igual à atual; aceita nova e libera o acesso', async ({ apiAdmin }) => {
    const lg = await loginSenha(u1.email, u1.senha)
    expect(lg.trocaPendente).toBe(true)

    const semToken = await chamarFuncao('trocar-senha', { nova_senha: senhaAleatoria() })
    expect(semToken.status, JSON.stringify(semToken.body)).toBe(401)

    const fraca = await chamarFuncao('trocar-senha', { nova_senha: 'abc' }, lg.token)
    expect(fraca.status).toBe(400)
    expect(fraca.body.error).toMatch(MSG_SENHA)
    const semNumero = await chamarFuncao('trocar-senha', { nova_senha: 'somenteletrasaqui' }, lg.token)
    expect(semNumero.status).toBe(400)

    const igual = await chamarFuncao('trocar-senha', { nova_senha: u1.senha }, lg.token)
    expect(igual.status, JSON.stringify(igual.body)).toBe(400)
    expect(igual.body.error).toBe('A nova senha deve ser diferente da senha atual.')
    expect((await loginSenha(u1.email, u1.senha)).trocaPendente, 'recusas não limparam a marca').toBe(true)

    const nova = senhaAleatoria()
    const ok = await chamarFuncao('trocar-senha', { nova_senha: nova }, lg.token)
    expect(ok.status, JSON.stringify(ok.body)).toBe(200)
    expect(JSON.stringify(ok.body)).not.toContain(nova)

    // senha antiga deixa de valer; a nova entra sem a marca e libera o acesso financeiro
    expect((await loginSenha(u1.email, u1.senha)).ok, 'senha antiga recusada').toBe(false)
    u1.senha = nova
    const lg2 = await loginSenha(u1.email, u1.senha)
    expect(lg2.ok).toBe(true)
    expect(lg2.trocaPendente, 'marca limpa').toBe(false)
    expect((await lg2.api!.rpc('get_my_role')).body).toBe('gestor')
    expect((await lg2.api!.rpc('acl_ver', { p_modulo: 'parcerias' })).body).toBe(true)
    const admLanc = await apiAdmin.get('lancamentos?select=id&limit=1')
    const meu = await lg2.api!.get('lancamentos?select=id&limit=1')
    expect(meu.status, descrever(meu)).toBe(200)
    if (Array.isArray(admLanc.body) && admLanc.body.length > 0) {
      expect((meu.body as unknown[]).length, 'gestor financeiro volta a ler lancamentos').toBeGreaterThan(0)
    }

    // Sem a marca, a função recusa (um token roubado não troca senha sem a atual); corpo inválido por segurança
    const semMarca = await chamarFuncao('trocar-senha', { nova_senha: 'x' }, lg2.token)
    expect(semMarca.status, JSON.stringify(semMarca.body)).toBe(403)
  })

  test('A7: redefinir_senha reativa a troca obrigatória no próximo login e bloqueia o banco de novo', async ({ apiAdmin }) => {
    const temp = senhaAleatoria()
    const r = await chamarFuncao('criar-usuario', { acao: 'redefinir_senha', id: u1.id, nova_senha: temp }, tokenAdmin())
    expect(r.status, JSON.stringify(r.body)).toBe(200)
    expect(JSON.stringify(r.body)).not.toContain(temp)

    expect((await loginSenha(u1.email, u1.senha)).ok, 'senha anterior não vale mais').toBe(false)
    const lg = await loginSenha(u1.email, temp)
    expect(lg.ok).toBe(true)
    expect(lg.trocaPendente, 'a marca voltou').toBe(true)
    const meu = await lg.api!.get('lancamentos?select=id&limit=5')
    expect(semDados(meu), descrever(meu)).toBe(true)
    expect((await lg.api!.rpc('get_my_role')).body).toBeNull()
    u1.senha = temp

    // Validações da ação
    const fraca = await chamarFuncao('criar-usuario', { acao: 'redefinir_senha', id: u1.id, nova_senha: 'abc' }, tokenAdmin())
    expect(fraca.status).toBe(400)
    expect(fraca.body.error).toMatch(MSG_SENHA)
    const inexistente = await chamarFuncao('criar-usuario', { acao: 'redefinir_senha', id: uuidAleatorio(), nova_senha: senhaAleatoria() }, tokenAdmin())
    expect(inexistente.status, JSON.stringify(inexistente.body)).toBe(404)
    const semId = await chamarFuncao('criar-usuario', { acao: 'redefinir_senha', nova_senha: senhaAleatoria() }, tokenAdmin())
    expect(semId.status).toBe(400)

    // Não funciona para o próprio admin (a senha dele NÃO pode mudar: a requisição é recusada antes de gravar)
    const adminId = (await apiAdmin.get('user_profiles?select=id&email=eq.admin@staging.test')).body[0].id as string
    const proprio = await chamarFuncao('criar-usuario', { acao: 'redefinir_senha', id: adminId, nova_senha: senhaAleatoria() }, tokenAdmin())
    expect(proprio.status, JSON.stringify(proprio.body)).toBe(400)
    expect(proprio.body.error).toMatch(/própria senha/)
  })

  test('A6: reenviar_convite é recusado para quem já acessou (sem enviar e-mail) e para id inexistente', async ({ apiAdmin }) => {
    // u1 já fez login nos testes anteriores (last_sign_in_at preenchido)
    const lista = await apiAdmin.rpc('listar_perfis_com_email')
    const linha = (lista.body as any[]).find(u => u.id === u1.id)
    expect(linha.convite_pendente, 'u1 já acessou').toBe(false)
    expect(linha.ultimo_login).not.toBeNull()

    const r = await chamarFuncao('criar-usuario', { acao: 'reenviar_convite', id: u1.id }, tokenAdmin())
    expect(r.status, JSON.stringify(r.body)).toBe(400)
    expect(r.body.error).toMatch(/já acessou o sistema/)
    const inexistente = await chamarFuncao('criar-usuario', { acao: 'reenviar_convite', id: uuidAleatorio() }, tokenAdmin())
    expect(inexistente.status).toBe(404)
    // O admin também já acessou: recusado antes de qualquer envio
    const adminId = (await apiAdmin.get('user_profiles?select=id&email=eq.admin@staging.test')).body[0].id as string
    const ad = await chamarFuncao('criar-usuario', { acao: 'reenviar_convite', id: adminId }, tokenAdmin())
    expect(ad.status).toBe(400)
  })
})

// Opt-in: dispara e-mails reais (convite + reenvio) para um endereço @staging.test descartável.
test.describe('DT16 admin: convite por e-mail (E2E_TESTA_CONVITE=sim)', () => {
  test.skip(process.env.E2E_TESTA_CONVITE !== 'sim', 'Convite por e-mail desligado (defina E2E_TESTA_CONVITE=sim para dispará-lo; gera 2 e-mails).')

  test('A1/A6: convidar grava perfil/email/profissional e reenviar_convite funciona para quem nunca acessou', async ({ apiAdmin }) => {
    const email = emailQA('convite')
    const r = await chamarFuncao('criar-usuario', {
      acao: 'convidar', email, nome: 'QA-DT16-convite', role: 'profissional', tipo_profissional: 'psi1', profissional_id: PROFISSIONAL_ANA_ID,
    }, tokenAdmin())
    expect(r.status, JSON.stringify(r.body)).toBe(200)
    registrarCriado(r.body.id)
    const [p] = await perfilPorEmail(apiAdmin, email)
    expect(p.email).toBe(email)
    expect(p.perfil_id).toBe(perfis.profissional)
    expect(p.profissional_id).toBe(PROFISSIONAL_ANA_ID)
    const lista = await apiAdmin.rpc('listar_perfis_com_email')
    expect((lista.body as any[]).find(u => u.id === r.body.id).convite_pendente).toBe(true)

    const re = await chamarFuncao('criar-usuario', { acao: 'reenviar_convite', id: r.body.id }, tokenAdmin())
    expect(re.status, JSON.stringify(re.body)).toBe(200)
    expect(re.body.message).toBe('Convite reenviado.')
  })
})
