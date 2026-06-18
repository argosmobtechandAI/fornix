-- Course Features Table
-- Per-course flags for available features
-- Features: "premium plan", "ccd podcast", "viva", "kbc", "smart tracking", "T & D"

CREATE TABLE IF NOT EXISTS course_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,

    -- Individual feature flags
    premium_plan boolean NOT NULL DEFAULT false,
    ccd_podcast boolean NOT NULL DEFAULT false,
    viva boolean NOT NULL DEFAULT false,
    kbc boolean NOT NULL DEFAULT false,
    smart_tracking boolean NOT NULL DEFAULT false,
    t_and_d boolean NOT NULL DEFAULT false,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
