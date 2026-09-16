-- Local demo schema in the dedicated PapaEats Lakebase project.
-- Grant a deployed app principal explicit access before hosting this app.
CREATE SCHEMA IF NOT EXISTS papaeats_app;
CREATE TABLE IF NOT EXISTS papaeats_app.feedback_submissions (
  id UUID PRIMARY KEY,
  message_text TEXT NOT NULL CHECK (char_length(message_text) BETWEEN 10 AND 2000),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_id BIGINT,
  attempt INTEGER NOT NULL DEFAULT 0,
  dispatch_error TEXT,
  result JSONB,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS submissions_created_by_time
  ON papaeats_app.feedback_submissions(created_by, created_at DESC);
