ALTER TABLE public.projects
  ADD CONSTRAINT projects_owner_id_name_unique UNIQUE (owner_id, name);
