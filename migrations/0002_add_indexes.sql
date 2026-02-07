-- Migration number: 0002 	 2026-02-07T03:57:25.603Z
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_resend_email_id
ON messages(resend_email_id);

CREATE INDEX IF NOT EXISTS idx_rate_limits_last_sent
ON rate_limits(last_sent_at);

CREATE INDEX IF NOT EXISTS idx_conversations_last_activity
ON conversations(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_conversations_token
ON conversations(token);
