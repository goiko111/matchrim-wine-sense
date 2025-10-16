-- Add grape_varieties column to wines table
ALTER TABLE public.wines 
ADD COLUMN grape_varieties TEXT[] DEFAULT '{}';

-- Add index for better query performance
CREATE INDEX idx_wines_grape_varieties ON public.wines USING GIN(grape_varieties);

-- Add comment
COMMENT ON COLUMN public.wines.grape_varieties IS 'Array of grape varieties used in the wine (e.g., Tempranillo, Garnacha)';