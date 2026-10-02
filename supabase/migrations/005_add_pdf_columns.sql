-- ==============================================================================
-- Migration 005: Add PDF Manifesto Columns to Candidates Table
-- ==============================================================================

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pdf_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pdf_updated_at TIMESTAMPTZ;
