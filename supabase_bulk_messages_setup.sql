-- Migration Script: Setup Bulk Messages Campaigns and Queue tables
-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR

-- 1. Extend the notifications table with support for attachments and links
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS external_link TEXT;

-- 2. Create the campaigns table
CREATE TABLE IF NOT EXISTS public.bulk_message_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    document_url TEXT,
    external_link TEXT,
    filter_type TEXT NOT NULL, -- 'all_users', 'all_students', 'recently_joined', 'course_students', 'custom'
    filter_details JSONB DEFAULT '{}'::jsonb, -- e.g. { "course_id": "uuid", "course_name": "AMC" }
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create the campaign queue table
CREATE TABLE IF NOT EXISTS public.bulk_message_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.bulk_message_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'delivered', 'failed'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create Indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_bulk_msg_campaign_id ON public.bulk_message_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bulk_msg_user_id ON public.bulk_message_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_msg_status ON public.bulk_message_queue(status);
CREATE INDEX IF NOT EXISTS idx_bulk_campaign_created_at ON public.bulk_message_campaigns(created_at DESC);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.bulk_message_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_message_queue ENABLE ROW LEVEL SECURITY;

-- 6. Add RLS Policies (Restricted to Admins)
-- Note: Service role (used in backend) bypasses RLS, but these keep it secure for client direct access if any.
DROP POLICY IF EXISTS "Admins have full access to campaigns" ON public.bulk_message_campaigns;
CREATE POLICY "Admins have full access to campaigns" 
ON public.bulk_message_campaigns
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins have full access to queue" ON public.bulk_message_queue;
CREATE POLICY "Admins have full access to queue" 
ON public.bulk_message_queue
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);
