-- Complete Database Schema for 1000x Agent
-- Run this in Supabase SQL Editor for new deployments
-- Safe to run on existing databases (uses IF NOT EXISTS)

-- ==============================================
-- TABLES
-- ==============================================

-- Clients table: stores client business info and credentials
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  twilio_number TEXT UNIQUE NOT NULL,
  ghl_token TEXT NOT NULL,
  location_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice sessions table: tracks all call sessions
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vapi_call_id TEXT UNIQUE,
  caller TEXT NOT NULL,
  called_number TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  consent_recorded BOOLEAN NOT NULL DEFAULT FALSE,
  recording_url TEXT,
  transcript TEXT,
  summary TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- INDEXES (Critical for Performance)
-- ==============================================

-- Index on twilio_number for fast client lookup (CRITICAL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_twilio_number 
ON clients (twilio_number);

-- Index on vapi_call_id for session lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_sessions_vapi_call_id 
ON voice_sessions (vapi_call_id);

-- Index on client_id for filtering sessions by client
CREATE INDEX IF NOT EXISTS idx_voice_sessions_client_id 
ON voice_sessions (client_id);

-- ==============================================
-- ROW LEVEL SECURITY (Optional)
-- ==============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "Allow service role full access to clients"
ON clients FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow service role full access to voice_sessions"
ON voice_sessions FOR ALL
USING (true)
WITH CHECK (true);

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Verify tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'voice_sessions');

-- Verify indexes exist
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('clients', 'voice_sessions')
ORDER BY tablename, indexname;

-- Verify columns in clients table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- Verify columns in voice_sessions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'voice_sessions'
ORDER BY ordinal_position;
