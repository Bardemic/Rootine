-- Habits (from packages/backend/src/models/habits.ts)
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Proofs for habits (normalized from habits.proofs[])
CREATE TABLE IF NOT EXISTS public.proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  goal_id uuid,
  image_data_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Flowers (from packages/backend/src/models/flowers.ts)
CREATE TABLE IF NOT EXISTS public.flowers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
  name text NOT NULL,
  image text NOT NULL,
  type text NOT NULL,
  position integer[] NOT NULL CHECK (array_length(position, 1) = 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_proofs_habit_id ON public.proofs(habit_id);
CREATE INDEX IF NOT EXISTS idx_flowers_user_id ON public.flowers(user_id);

-- Add coin balance to auth.user
ALTER TABLE IF EXISTS auth.user
ADD COLUMN IF NOT EXISTS coin integer NOT NULL DEFAULT 0;

COMMIT;

