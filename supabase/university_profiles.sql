CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.university_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    country VARCHAR(255) NOT NULL,
    university_name VARCHAR(255) NOT NULL,
    max_students INT NOT NULL DEFAULT 50,
    contact_details TEXT,
    assigned_courses JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT university_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.university_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.university_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on university_profiles" 
ON public.university_profiles 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow all access to service_role on university_profiles" 
ON public.university_profiles 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_university_profiles_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_university_profiles_updated_at ON public.university_profiles;

CREATE TRIGGER trigger_update_university_profiles_updated_at
BEFORE UPDATE ON public.university_profiles
FOR EACH ROW
EXECUTE FUNCTION update_university_profiles_updated_at_column();
