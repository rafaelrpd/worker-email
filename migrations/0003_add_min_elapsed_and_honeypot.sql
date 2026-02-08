-- Migration number: 0003 	 2026-02-08T05:03:13.736Z
CREATE TABLE IF NOT EXISTS suspicious_submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  ip TEXT NOT NULL,
  reason TEXT NOT NULL,      -- "honeypot", "too_fast", "turnstile_fail", etc.
  user_agent TEXT,
  origin TEXT,
  payload_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_suspicious_submissions_created_at
ON suspicious_submissions(created_at);