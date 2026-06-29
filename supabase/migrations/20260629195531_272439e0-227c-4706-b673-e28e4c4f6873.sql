
CREATE TABLE public.user_app_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_app_state TO authenticated;
GRANT ALL ON public.user_app_state TO service_role;

ALTER TABLE public.user_app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own app state"
  ON public.user_app_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_app_state_touch_updated_at
  BEFORE UPDATE ON public.user_app_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
