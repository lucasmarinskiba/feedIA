-- FeedIA Calendar Queue + Publishing Schema
-- Ajusta la tabla posts para soportar cola de publicación programada y reintentos.

-- Asegurar columnas de tracking de publicación (idempotente)
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS error_log text;

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

-- Índices para el dispatcher de calendario
CREATE INDEX IF NOT EXISTS idx_posts_account_status ON public.posts(account_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_status ON public.posts(status, scheduled_at)
  WHERE status = 'scheduled';

-- Tabla de jobs de publicación encolados (opcional, para trazabilidad fuera de BullMQ)
CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  queue_name text NOT NULL DEFAULT 'socialPublish',
  external_job_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  started_at timestamptz,
  finished_at timestamptz,
  result_json jsonb DEFAULT '{}',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_jobs_post ON public.publish_jobs(post_id);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON public.publish_jobs(status, created_at);

-- RLS para publish_jobs: service role/admin solamente
ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS publish_jobs_service ON public.publish_jobs;
CREATE POLICY publish_jobs_service ON public.publish_jobs
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Función utilitaria: posts vencidos para publicar
CREATE OR REPLACE FUNCTION public.due_scheduled_posts(limit_count integer DEFAULT 50)
RETURNS SETOF public.posts
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.posts
  WHERE status = 'scheduled'
    AND scheduled_at <= now()
  ORDER BY scheduled_at ASC
  LIMIT limit_count;
$$;
