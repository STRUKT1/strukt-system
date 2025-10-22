/**
 * Embedding Service
 * 
 * Handles generation and management of vector embeddings for logs using OpenAI.
 * Supports semantic search and RAG-based memory recall.
 */

const { OpenAI } = require('openai');
const { supabaseAdmin } = require('../lib/supabaseServer');

// Initialize OpenAI client
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      project: process.env.OPENAI_PROJECT_ID || undefined,
    });
  }
} catch (error) {
  console.warn('OpenAI client initialization failed:', error.message);
}

/**
 * Check if OpenAI is configured
 */
function checkOpenAI() {
  if (!openai) {
    throw new Error('OpenAI is not configured. Please set OPENAI_API_KEY environment variable.');
  }
}

/**
 * Generate embedding for text using OpenAI
 * 
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} 1536-dimensional embedding vector
 */
async function generateEmbedding(text) {
  checkOpenAI();

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Store embedding for a log entry
 * 
 * @param {Object} params - Embedding parameters
 * @param {string} params.userId - User ID (UUID)
 * @param {string} params.logType - Type of log (workout, meal, sleep, etc.)
 * @param {string} params.logId - ID of the original log entry
 * @param {string} params.text - Text content to embed
 * @returns {Promise<Object>} Created embedding entry or null on failure
 */
async function storeLogEmbedding({ userId, logType, logId, text }) {
  try {
    // Generate embedding
    const embedding = await generateEmbedding(text);

    // Store in database
    const { data, error } = await supabaseAdmin
      .from('log_embeddings')
      .insert({
        user_id: userId,
        log_type: logType,
        log_id: logId,
        text,
        embedding: JSON.stringify(embedding), // Supabase handles vector type
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to store embedding:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception while storing embedding:', error);
    return null;
  }
}

/**
 * Search for similar logs using vector similarity
 * 
 * @param {Object} params - Search parameters
 * @param {string} params.userId - User ID to filter by
 * @param {string} params.queryText - Text to search for
 * @param {number} [params.limit=3] - Number of results to return
 * @param {number} [params.daysBack=90] - Only search logs from last N days
 * @returns {Promise<Array>} Array of similar log entries with similarity scores
 */
async function searchSimilarLogs({ userId, queryText, limit = 3, daysBack = 90 }) {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(queryText);

    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);

    // Use pgvector's cosine similarity search
    // Note: We use RPC call for vector search with proper SQL
    const { data, error } = await supabaseAdmin.rpc('search_similar_logs', {
      query_user_id: userId,
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.5, // Minimum similarity threshold
      match_count: limit,
      date_threshold: dateThreshold.toISOString(),
    });

    if (error) {
      // If RPC doesn't exist, fall back to manual query
      // This is for testing purposes - in production the RPC should exist
      console.warn('RPC search_similar_logs not found, using fallback query');
      
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('log_embeddings')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', dateThreshold.toISOString())
        .limit(limit);

      if (fallbackError) {
        console.error('Failed to search similar logs:', fallbackError);
        return [];
      }

      return fallbackData || [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception while searching similar logs:', error);
    return [];
  }
}

/**
 * Generate embeddings for all user's logs (batch operation)
 * Useful for initial setup or backfill
 * 
 * @param {string} userId - User ID
 * @param {Array} logs - Array of log entries with id, type, and text
 * @returns {Promise<Object>} Result summary
 */
async function batchGenerateEmbeddings(userId, logs) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const log of logs) {
    try {
      const result = await storeLogEmbedding({
        userId,
        logType: log.type,
        logId: log.id,
        text: log.text,
      });

      if (result) {
        results.success++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        logId: log.id,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  generateEmbedding,
  storeLogEmbedding,
  searchSimilarLogs,
  batchGenerateEmbeddings,
};
