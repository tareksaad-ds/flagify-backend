CREATE TABLE IF NOT EXISTS public.sdk_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  environment_id  UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  key             TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked         BOOLEAN NOT NULL DEFAULT false
);
