CREATE TABLE IF NOT EXISTS public.flag_states (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id             UUID NOT NULL REFERENCES public.flags(id) ON DELETE CASCADE,
  environment_id      UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  enabled             BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage  INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  rules               JSONB NOT NULL DEFAULT '[]',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT flag_states_flag_id_environment_id_unique UNIQUE (flag_id, environment_id)
);
