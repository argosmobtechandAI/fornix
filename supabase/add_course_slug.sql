-- 1. Add the slug column
ALTER TABLE courses ADD COLUMN slug VARCHAR(255);

-- 2. Define a function to automatically generate slugs if we want it via trigger (optional, but we'll do it manually for existing rows)
-- Let's update existing courses to have a slug based on their name
-- PostgreSQL regex to replace spaces and special characters with hyphens
UPDATE courses
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));

-- Remove trailing or leading hyphens if any
UPDATE courses
SET slug = trim(both '-' from slug);

-- 3. Make the slug column unique so we don't have duplicates
ALTER TABLE courses ADD CONSTRAINT courses_slug_key UNIQUE (slug);
