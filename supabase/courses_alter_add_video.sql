-- Add tutorial/ads video URL column per course
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS tutorial_video_url text;