-- Add admin read policies for user data tables

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all wine preferences
CREATE POLICY "Admins can view all wine preferences"
ON public.wine_preferences
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all dietary preferences
CREATE POLICY "Admins can view all dietary preferences"
ON public.dietary_preferences
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all quiz results
CREATE POLICY "Admins can view all quiz results"
ON public.quiz_results
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));