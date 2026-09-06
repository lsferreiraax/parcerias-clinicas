# Feature: Aplicativo Mobile (PWA)

## Visão Geral

Transformar o sistema em uma Progressive Web App (PWA) instalável no celular, com suporte offline básico e notificações push — sem necessidade de publicar na App Store ou Google Play.

---

## Motivação

Profissionais e gestores precisam consultar extratos e verificar parcelas em situações onde não estão no computador. Um app instalável no celular aumenta a acessibilidade sem o custo de desenvolvimento nativo.

---

## O que é PWA?

Uma PWA é o próprio site com capacidades extras:
- **Instalável** — ícone na tela inicial do celular, sem loja de apps
- **Offline** — páginas visitadas ficam disponíveis sem internet (via Service Worker + cache)
- **Notificações push** — alertas nativos no celular (requer permissão do usuário)
- **Tela cheia** — abre sem barra de URL, como um app nativo

---

## Funcionalidades

### 1. Instalação como App
- Arquivo `manifest.json` com nome, ícones, cor de tema
- Prompt "Adicionar à tela inicial" em Android/Chrome e iOS/Safari
- Ícone da clínica (192×192 e 512×512 PNG)

### 2. Cache Offline
- Service Worker via **Workbox** (integrado ao Vite com `vite-plugin-pwa`)
- Cache de assets estáticos (JS, CSS, fontes) — sempre offline
- Cache de rotas da API — últimos dados consultados ficam disponíveis offline
- Página de fallback "Sem conexão" para dados não cacheados

### 3. Notificações Push
- Usuário autoriza notificações no primeiro acesso mobile
- Edge Function `notificar-push` envia push via **Web Push API** (VAPID keys)
- Casos de uso:
  - Parcela vence hoje → push às 08h para Gestor/Admin
  - Novo lançamento registrado → push para profissional afetado (opcional)

### 4. Layout Mobile-First
- Revisar páginas para telas menores (375px)
- Bottom navigation bar no mobile (substitui sidebar lateral)
- Gestos de swipe em tabelas longas
- Botões com área de toque mínima de 44×44px

---

## Tecnologia

| Componente | Biblioteca/Serviço |
|------------|-------------------|
| PWA / Service Worker | `vite-plugin-pwa` + Workbox |
| Push notifications | Web Push API + VAPID (sem Firebase) |
| Edge Function push | `supabase/functions/notificar-push/` |
| Armazenamento de subscriptions | Nova tabela `push_subscriptions` |

---

## Modelo de Dados

### Nova tabela: `push_subscriptions`

```sql
CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_own" ON push_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `vite.config.ts` | Adicionar plugin `vite-plugin-pwa` |
| `public/manifest.json` | Manifesto PWA |
| `public/icons/` | Ícones 192×192 e 512×512 |
| `src/components/layout/Layout.tsx` | Bottom nav no mobile |
| `src/hooks/usePushNotification.ts` | Novo — solicita permissão e salva subscription |
| `supabase/functions/notificar-push/index.ts` | Nova Edge Function |
| `supabase/migrations/006_push_subscriptions.sql` | Nova migration |
| `docs/scripts-banco-de-dados.md` | Documentar migration 006 e Edge Function |

---

## Dependências

```bash
npm install vite-plugin-pwa workbox-window
npm install web-push  # apenas para gerar VAPID keys localmente
```

**Gerar VAPID keys:**
```bash
npx web-push generate-vapid-keys
```
Salvar como secrets no Supabase: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.

---

## Critérios de Aceite

- [ ] App instalável no Android (Chrome) e iOS (Safari) com ícone correto
- [ ] Páginas visitadas carregam offline
- [ ] Notificação push chega no celular quando há parcelas vencendo no dia
- [ ] Layout funcional em 375px sem scroll horizontal
- [ ] Lighthouse PWA score ≥ 90

---

## Status

- [ ] Documentação criada
- [ ] Gerar ícones e manifest.json
- [ ] Configurar vite-plugin-pwa
- [ ] Revisar layout mobile (breakpoints)
- [ ] Bottom navigation mobile
- [ ] Migration 006 + Edge Function push
- [ ] Testes em Android e iOS
- [ ] Deploy
