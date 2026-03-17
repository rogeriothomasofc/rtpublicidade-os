
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read roles
CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage roles (will use has_role function)
-- For now, no insert/update/delete policies (managed by service role only)

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Prevent deleting profiles that are admin (owner)
CREATE OR REPLACE FUNCTION public.prevent_admin_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(OLD.user_id, 'admin') THEN
    RAISE EXCEPTION 'Cannot delete admin profile';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_admin_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_profile_delete();

-- Prevent deleting admin auth users via a trigger on user_roles
CREATE OR REPLACE FUNCTION public.prevent_admin_role_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot remove admin role';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_admin_role_removal
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_role_delete();
