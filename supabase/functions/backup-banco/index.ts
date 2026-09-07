import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUCKET            = 'backups'
const DIAS_RETENCAO     = 30

Deno.serve(async (req) => {
  // Permite chamada manual autenticada (Authorization: Bearer <service_role_key>)
  // ou via pg_cron (sem header)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  try {
    // ── 1. Exportar todas as tabelas ──────────────────────────────────
    const tabelas = [
      'parcerias',
      'profissionais',
      'lancamentos',
      'parcelas',
      'parcelas_log',
      'user_profiles',
      'configuracoes',
    ]

    const dump: Record<string, unknown[]> = {}

    for (const tabela of tabelas) {
      const { data, error } = await supabase.from(tabela).select('*')
      if (error) {
        console.error(`Erro ao exportar ${tabela}:`, error.message)
        dump[tabela] = []
      } else {
        dump[tabela] = data ?? []
      }
    }

    // ── 2. Montar arquivo JSON ────────────────────────────────────────
    const agora    = new Date()
    const timestamp = agora.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename  = `backup_${timestamp}.json`

    const conteudo = JSON.stringify({
      gerado_em:  agora.toISOString(),
      versao:     '1.0',
      tabelas:    Object.keys(dump).map(t => ({ nome: t, registros: dump[t].length })),
      dados:      dump,
    }, null, 2)

    const bytes = new TextEncoder().encode(conteudo)

    // ── 3. Garantir que o bucket existe ──────────────────────────────
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExiste = (buckets ?? []).some(b => b.name === BUCKET)

    if (!bucketExiste) {
      const { error: errBucket } = await supabase.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 52_428_800, // 50 MB
      })
      if (errBucket) throw new Error(`Erro ao criar bucket: ${errBucket.message}`)
    }

    // ── 4. Upload do backup ───────────────────────────────────────────
    const { error: errUpload } = await supabase.storage
      .from(BUCKET)
      .upload(filename, bytes, { contentType: 'application/json', upsert: false })

    if (errUpload) throw new Error(`Erro no upload: ${errUpload.message}`)

    // ── 5. Limpeza de backups antigos (> DIAS_RETENCAO) ───────────────
    const { data: arquivos } = await supabase.storage.from(BUCKET).list('', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'asc' },
    })

    const limite = new Date(Date.now() - DIAS_RETENCAO * 24 * 60 * 60 * 1000)
    const antigos = (arquivos ?? []).filter(f => {
      const criado = f.created_at ? new Date(f.created_at) : null
      return criado && criado < limite
    })

    if (antigos.length > 0) {
      await supabase.storage.from(BUCKET).remove(antigos.map(f => f.name))
      console.log(`Removidos ${antigos.length} backup(s) antigo(s)`)
    }

    // ── 6. Resposta ───────────────────────────────────────────────────
    const resumo = Object.entries(dump).map(([t, rows]) => `${t}: ${rows.length}`)
    console.log(`Backup concluído: ${filename}`)

    return new Response(JSON.stringify({
      ok:       true,
      arquivo:  filename,
      tamanho:  `${(bytes.length / 1024).toFixed(1)} KB`,
      tabelas:  resumo,
      removidos: antigos.length,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Falha no backup:', err)
    return new Response(
      JSON.stringify({ ok: false, erro: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
