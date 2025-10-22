-- =========================================================
-- Vector Search RPC Function
-- Migration: 20251022_create_vector_search_rpc
-- =========================================================

-- Create RPC function for vector similarity search
-- This uses pgvector's cosine distance for semantic search
CREATE OR REPLACE FUNCTION search_similar_logs(
  query_user_id UUID,
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 3,
  date_threshold TIMESTAMPTZ DEFAULT NOW() - INTERVAL '90 days'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  log_type TEXT,
  log_id UUID,
  text TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    log_embeddings.id,
    log_embeddings.user_id,
    log_embeddings.log_type,
    log_embeddings.log_id,
    log_embeddings.text,
    log_embeddings.created_at,
    1 - (log_embeddings.embedding <=> query_embedding) as similarity
  FROM log_embeddings
  WHERE log_embeddings.user_id = query_user_id
    AND log_embeddings.created_at >= date_threshold
    AND 1 - (log_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY log_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_similar_logs TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_logs TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION search_similar_logs IS 'Search for semantically similar logs using vector embeddings. Returns logs within the specified date range and above the similarity threshold, ordered by relevance.';
