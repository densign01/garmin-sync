-- Store encrypted Garmin tokens
CREATE TABLE garmin_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tokens_encrypted TEXT NOT NULL,  -- Encrypted JSON blob
    garmin_display_name TEXT,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE garmin_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own token status (but not the encrypted data from client)
CREATE POLICY "Users can view own token metadata"
    ON garmin_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- No direct insert/update from client - only via service role in API routes
