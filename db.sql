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


-- Groups and shared habit functionality
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Track per-day distributions to ensure once-per-day per group
CREATE TABLE IF NOT EXISTS public.group_coin_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  award_date date NOT NULL,
  reward_amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_group_day UNIQUE (group_id, award_date)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);

-- Add display fields for groups
ALTER TABLE IF EXISTS public.groups
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'My Group',
  ADD COLUMN IF NOT EXISTS habit_description text NOT NULL DEFAULT 'Shared habit';

-- Group-specific proofs (each member submits to the group habit)
CREATE TABLE IF NOT EXISTS public.group_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
  image_data_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_proofs_group ON public.group_proofs(group_id);
CREATE INDEX IF NOT EXISTS idx_group_proofs_user ON public.group_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_group_proofs_group_day ON public.group_proofs(group_id, created_at);


