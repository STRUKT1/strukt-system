-- =========================================================
-- Log Embeddings Table
-- Migration: 20251022_create_log_embeddings_table
-- =========================================================

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create log_embeddings table for semantic search
CREATE TABLE IF NOT EXISTS public.log_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL,
  log_id UUID NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_log_embeddings_user_id 
  ON public.log_embeddings(user_id);

CREATE INDEX IF NOT EXISTS idx_log_embeddings_created_at 
  ON public.log_embeddings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_log_embeddings_log_type 
  ON public.log_embeddings(log_type);

-- Create vector index for similarity search (HNSW for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_log_embeddings_vector 
  ON public.log_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security
ALTER TABLE public.log_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own embeddings
CREATE POLICY user_can_view_own_embeddings
  ON public.log_embeddings
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert embeddings
CREATE POLICY service_role_can_insert_embeddings
  ON public.log_embeddings
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Service role can view all embeddings (for admin/debugging)
CREATE POLICY service_role_can_view_all_embeddings
  ON public.log_embeddings
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.log_embeddings IS 'Vector embeddings of user logs for semantic search and RAG-based memory recall.';
COMMENT ON COLUMN public.log_embeddings.user_id IS 'Reference to the user who created the log';
COMMENT ON COLUMN public.log_embeddings.log_type IS 'Type of log (workout, meal, sleep, mood, supplement, etc.)';
COMMENT ON COLUMN public.log_embeddings.log_id IS 'Reference to the original log entry';
COMMENT ON COLUMN public.log_embeddings.text IS 'Text content that was embedded';
COMMENT ON COLUMN public.log_embeddings.embedding IS '1536-dimensional vector from OpenAI text-embedding-3-small';
COMMENT ON COLUMN public.log_embeddings.created_at IS 'When the embedding was created';
