-- Agenda a Edge Function notificar-vencidas para rodar todo dia às 08:00 (BRT = UTC-3 → 11:00 UTC)
-- Requer extensão pg_cron habilitada no projeto Supabase (Database → Extensions → pg_cron)
-- e pg_net para chamadas HTTP internas.

SELECT cron.schedule(
  'notificar-parcelas-vencidas',   -- nome do job
  '0 11 * * *',                    -- cron: 11:00 UTC = 08:00 BRT, todos os dias
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notificar-vencidas',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    )
  $$
);
