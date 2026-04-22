CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
