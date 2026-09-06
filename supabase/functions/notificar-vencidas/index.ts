import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const hoje = new Date().toISOString().split('T')[0]

    // Busca parcelas vencidas com dados do lançamento
    const { data: parcelas, error } = await supabase
      .from('parcelas')
      .select('id, data_vencimento, valor_parcela, parcela_num, parcela_total, lancamentos(paciente, parceria_id)')
      .eq('status', 'pendente')
      .lt('data_vencimento', hoje)
      .order('data_vencimento', { ascending: true })

    if (error) throw error

    if (!parcelas || parcelas.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma parcela vencida.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Formata o corpo do e-mail em HTML
    const linhas = parcelas.map(p => {
      const lanc = p.lancamentos as { paciente: string; parceria_id: string } | null
      const [ano, mes, dia] = p.data_vencimento.split('-')
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${lanc?.paciente ?? '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Parceria ${lanc?.parceria_id ?? '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${p.parcela_num}/${p.parcela_total}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#e53e3e;font-weight:bold">${dia}/${mes}/${ano}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold">
            ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(p.valor_parcela))}
          </td>
        </tr>`
    }).join('')

    const totalVencido = parcelas.reduce((s, p) => s + Number(p.valor_parcela), 0)
    const totalFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVencido)

    const html = `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
        <div style="background:#1F3864;color:white;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:20px">🏥 Parcerias Clínicas</h1>
          <p style="margin:4px 0 0;opacity:.8;font-size:14px">Alerta de Parcelas Vencidas</p>
        </div>
        <div style="background:#fff;padding:24px 32px;border:1px solid #e2e8f0">
          <p style="color:#e53e3e;font-size:16px;font-weight:bold;margin:0 0 16px">
            ⚠️ ${parcelas.length} parcela(s) vencida(s) — Total: ${totalFmt}
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="background:#f7fafc;color:#718096;font-size:12px;text-transform:uppercase">
                <th style="padding:8px 12px;text-align:left">Paciente</th>
                <th style="padding:8px 12px;text-align:left">Parceria</th>
                <th style="padding:8px 12px;text-align:left">Parcela</th>
                <th style="padding:8px 12px;text-align:left">Vencimento</th>
                <th style="padding:8px 12px;text-align:left">Valor</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
        <div style="background:#f7fafc;padding:16px 32px;border-radius:0 0 8px 8px;font-size:12px;color:#718096;text-align:center">
          Enviado automaticamente em ${new Date().toLocaleDateString('pt-BR')} · Parcerias Clínicas
        </div>
      </div>`

    // Envia via Resend (configure RESEND_API_KEY e NOTIFY_EMAIL nos secrets do Supabase)
    const resendKey   = Deno.env.get('RESEND_API_KEY')
    const notifyEmail = Deno.env.get('NOTIFY_EMAIL')

    if (!resendKey || !notifyEmail) {
      // Se não configurado, retorna o resumo sem enviar e-mail
      return new Response(
        JSON.stringify({
          message: 'RESEND_API_KEY ou NOTIFY_EMAIL não configurados. E-mail não enviado.',
          parcelas_vencidas: parcelas.length,
          total_vencido: totalFmt,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Parcerias Clínicas <noreply@seudominio.com.br>',
        to:   [notifyEmail],
        subject: `⚠️ ${parcelas.length} parcela(s) vencida(s) — ${totalFmt}`,
        html,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.text()
      throw new Error(`Falha ao enviar e-mail: ${err}`)
    }

    return new Response(
      JSON.stringify({ message: 'E-mail enviado com sucesso.', parcelas_vencidas: parcelas.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
