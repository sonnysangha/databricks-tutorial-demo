-- Run as the database owner in the dedicated demo database.
-- Grant a hosted app principal explicit schema/table access before deployment.
-- Decisions are separate from the analytical feedback tables.
CREATE SCHEMA IF NOT EXISTS papaeats_app;
CREATE TABLE IF NOT EXISTS papaeats_app.issue_decisions (
  issue_key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'needs_info')),
  priority TEXT CHECK (priority IN ('P0','P1','P2','P3')),
  owner TEXT,
  note TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
