-- ─────────────────────────────────────────────
-- Agendamento do backup diário do banco
-- ─────────────────────────────────────────────
-- Pré-requisito: extensões pg_cron e pg_net habilitadas
--   Database → Extensions → pg_cron e pg_net
-- Pré-requisito: Edge Function 'backup-banco' já deployada

SELECT cron.schedule(
  'backup-diario-banco',
  '0 6 * * *',   -- 06:00 UTC = 03:00 BRT
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/backup-banco',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    )
  $$
);
