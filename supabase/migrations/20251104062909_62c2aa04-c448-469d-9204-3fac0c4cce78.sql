-- Add interaction fields to user_wines table
ALTER TABLE public.user_wines 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rating TEXT CHECK (rating IN ('love', 'ok', 'not_for_me')),
ADD COLUMN IF NOT EXISTS personal_note TEXT,
ADD COLUMN IF NOT EXISTS consumption_place TEXT,
ADD COLUMN IF NOT EXISTS consumption_place_type TEXT CHECK (consumption_place_type IN ('winerim_restaurant', 'external_restaurant', 'home', 'other')),
ADD COLUMN IF NOT EXISTS consumption_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS restaurant_id UUID,
ADD COLUMN IF NOT EXISTS place_details JSONB,
ADD COLUMN IF NOT EXISTS matchrim_affinity INTEGER CHECK (matchrim_affinity >= 0 AND matchrim_affinity <= 100),
ADD COLUMN IF NOT EXISTS sensory_attributes JSONB,
ADD COLUMN IF NOT EXISTS use_for_profile_training BOOLEAN DEFAULT false;

-- Create index for favorites filtering
CREATE INDEX IF NOT EXISTS idx_user_wines_favorite ON public.user_wines(user_id, is_favorite) WHERE is_favorite = true;

-- Create index for affinity sorting
CREATE INDEX IF NOT EXISTS idx_user_wines_affinity ON public.user_wines(user_id, matchrim_affinity DESC NULLS LAST);

-- Create index for consumption date
CREATE INDEX IF NOT EXISTS idx_user_wines_consumption_date ON public.user_wines(user_id, consumption_date DESC NULLS LAST);