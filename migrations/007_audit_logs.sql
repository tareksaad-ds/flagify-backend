CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id         UUID NOT NULL REFERENCES public.flags(id) ON DELETE CASCADE,
  environment_id  UUID NOT NULL REFERENCES public.environments(id),
  user_id         UUID NOT NULL REFERENCES public.users(id),
  action          TEXT NOT NULL,
  diff            JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
