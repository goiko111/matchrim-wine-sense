-- Fix security issue: Restrict contact_submissions read access to admins only

-- Drop the overly permissive policy that allows any authenticated user to read all contact submissions
DROP POLICY IF EXISTS "Allow authenticated read on contact_submissions" ON public.contact_submissions;

-- Create a new policy that only allows admins to read contact submissions
CREATE POLICY "Only admins can read contact submissions" 
ON public.contact_submissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep the existing public insert policy for contact form submissions
-- (This allows the contact form to work for unauthenticated users)