-- Allowlisted store owner can claim admin after login (needed for product RLS).
CREATE OR REPLACE FUNCTION public.claim_allowlisted_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF lower(coalesce(auth.jwt() ->> 'email', '')) <> 'mukremin.cakmak.da@gmail.com' THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_allowlisted_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_allowlisted_admin() TO authenticated;
