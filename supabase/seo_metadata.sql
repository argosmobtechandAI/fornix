-- Create SEO Metadata table
CREATE TABLE IF NOT EXISTS public.seo_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_path VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    keywords TEXT,
    og_title VARCHAR(255),
    og_description TEXT,
    og_image TEXT,
    robots VARCHAR(100) DEFAULT 'index, follow',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read SEO metadata
CREATE POLICY "Allow public read access to seo_metadata" 
ON public.seo_metadata 
FOR SELECT 
USING (true);

-- Allow authenticated users (Admins) to perform write operations
CREATE POLICY "Allow admin CRUD access to seo_metadata" 
ON public.seo_metadata 
FOR ALL 
USING (true); -- Assuming checking admin role is handled at the API level for simplicity

-- Seed default SEO configurations
INSERT INTO public.seo_metadata (page_path, title, description, keywords, og_title, og_description, robots) VALUES
('/', 'Fornix Academy | Premier Medical Exam Preparation', 'Fornix Academy offers next-generation clinical question banks, interactive smart tutoring, podcasts, and mock tests for global medical licensing exams.', 'medical exam prep, clinical questions, AMC CAT, PLAB 1, NEET PG, FMGE, medical coaching', 'Fornix Academy | Medical Exam Prep', 'Prepare for AMC CAT MCQ, PLAB 1, FMGE, and NEET PG with high-yield clinical questions and smart analytics.', 'index, follow'),

('/about', 'About Us | Fornix Academy', 'Learn about Fornix Academy''s mission, our clinical education methods, and the medical experts helping doctors succeed in licensing exams worldwide.', 'about fornix academy, medical faculty experts, clinical exam tutoring', 'About Us | Fornix Academy', 'Empowering future doctors to achieve global licensing exam success.', 'index, follow'),

('/blogs', 'Medical Education & Exam Prep Blog | Fornix Academy', 'Read study guides, tips, success stories, and strategies for passing the AMC CAT, PLAB, FMGE, and NEET PG licensing exams.', 'medical blog, exam tips, study guides, amc prep blog, plab tips', 'Fornix Academy Blog', 'Get the latest medical exam strategies, revision tips, and medical education updates.', 'index, follow'),

('/contact', 'Contact Us | Fornix Academy', 'Have questions about our course plans, dynamic tutoring, or subscriptions? Reach out to the Fornix Academy support team today.', 'contact fornix academy, medical exam support, course assistance', 'Contact Us | Fornix Academy', 'We are here to support your medical education journey. Get in touch.', 'index, follow'),

('/pricing', 'Course Pricing & Subscription Plans | Fornix Academy', 'Explore affordable course plans for AMC CAT, PLAB 1, FMGE, and NEET PG. Access high-yield clinical questions, mock tests, and smart doubt solving.', 'exam prep plans, course pricing, medical tutoring cost, buy question bank', 'Subscription Pricing Plans | Fornix Academy', 'Select the best plan to pass your medical exam. Start practicing today.', 'index, follow'),

('/terms-and-conditions', 'Terms and Conditions | Fornix Academy', 'Read the terms of service and agreement guidelines for using the Fornix Academy platform and mobile application.', 'terms of service, legal terms, website agreement', 'Terms and Conditions | Fornix Academy', 'Legal terms and conditions governing the use of Fornix Academy.', 'index, follow'),

('/privacy-policy', 'Privacy Policy | Fornix Academy', 'Learn how Fornix Academy collects, secures, and handles user account data and subscription information.', 'privacy policy, data protection, user security', 'Privacy Policy | Fornix Academy', 'Understand how we protect your personal and study data.', 'index, follow'),

('/refund-policy', 'Refund Policy | Fornix Academy', 'Review our cancellation and subscription refund policies for medical exam coaching programs.', 'refund policy, cancellation guidelines, money back policy', 'Refund Policy | Fornix Academy', 'Details about cancellations and refunds at Fornix Academy.', 'index, follow'),

('/courses/:courseSlug', 'Prepare for :courseSlug Exam | Fornix Academy', 'Get expert clinical practice questions, mock tests, and adaptive performance tracking for the :courseSlug medical licensing exam.', 'medical exam, mock test, clinical revision, :courseSlug prep', 'Prepare for :courseSlug | Fornix Academy', 'Pass your :courseSlug licensing exam with our comprehensive curriculum.', 'index, follow')
ON CONFLICT (page_path) DO NOTHING;

