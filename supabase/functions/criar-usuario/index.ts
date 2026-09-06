import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Verifica se quem chamou é admin
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )

    const { data: { user }, error: authErr } = await userSupabase.auth.getUser()
    if (authErr || !user) throw new Error('Não autenticado.')

    const { data: perfil } = await userSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (perfil?.role !== 'admin') throw new Error('Acesso negado. Apenas admins podem criar usuários.')

    // Usa service role para criar o usuário
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { email, nome, role, tipo_profissional } = await req.json()

    if (!email || !nome || !role) throw new Error('email, nome e role são obrigatórios.')
    if (role === 'profissional' && !tipo_profissional) {
      throw new Error('tipo_profissional é obrigatório para o perfil profissional.')
    }

    // Convida o usuário — ele recebe um e-mail para definir a senha
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nome },
    })
    if (inviteErr) throw inviteErr

    // Cria o perfil
    const { error: profileErr } = await admin
      .from('user_profiles')
      .insert({
        id:                invited.user.id,
        nome,
        role,
        tipo_profissional: tipo_profissional ?? null,
      })
    if (profileErr) throw profileErr

    return new Response(
      JSON.stringify({ message: 'Usuário convidado com sucesso.', id: invited.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
