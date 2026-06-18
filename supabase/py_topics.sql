-- PY Topics Table
CREATE TABLE IF NOT EXISTS py_topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
    years integer[],
    topic text NOT NULL,
    sub_topics text[],
    extra_explanation text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
