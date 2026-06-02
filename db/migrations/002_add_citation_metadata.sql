-- Migration 002: add citation_metadata_json column to uploaded_documents
-- Run this once in your Supabase SQL editor.
-- Stores AI-extracted citation metadata (title, author, year, journal, doi)
-- so synthesis does not have to rely on filename parsing.

ALTER TABLE uploaded_documents
  ADD COLUMN IF NOT EXISTS citation_metadata_json TEXT DEFAULT NULL;

COMMENT ON COLUMN uploaded_documents.citation_metadata_json IS
  'JSON string with AI-extracted citation metadata: { title, authorDisplay, authors[], year, journal, doi, metadataReliable, source }';
