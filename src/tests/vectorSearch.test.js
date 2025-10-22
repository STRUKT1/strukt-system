/**
 * Tests for Vector Search and Embeddings
 */

console.log('🚀 Running Vector Search Tests\n');

let passedTests = 0;
let failedTests = 0;

function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
    passedTests++;
  } catch (err) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${err.message}`);
    failedTests++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: Embedding service module exists
test('Embedding service module exports required functions', () => {
  const embeddingService = require('../services/embeddingService');
  
  assert(typeof embeddingService.generateEmbedding === 'function', 'Should export generateEmbedding');
  assert(typeof embeddingService.storeLogEmbedding === 'function', 'Should export storeLogEmbedding');
  assert(typeof embeddingService.searchSimilarLogs === 'function', 'Should export searchSimilarLogs');
  assert(typeof embeddingService.batchGenerateEmbeddings === 'function', 'Should export batchGenerateEmbeddings');
});

// Test 2: Embedding service uses correct model
test('Embedding service uses text-embedding-3-small', () => {
  const fs = require('fs');
  const path = require('path');
  const servicePath = path.join(__dirname, '../services/embeddingService.js');
  const content = fs.readFileSync(servicePath, 'utf-8');
  
  assert(content.includes('text-embedding-3-small'), 'Should use text-embedding-3-small model');
});

// Test 3: SQL migration for log_embeddings exists
test('log_embeddings table migration exists', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_log_embeddings_table.sql');
  assert(fs.existsSync(migrationPath), 'log_embeddings migration file should exist');
  
  const content = fs.readFileSync(migrationPath, 'utf-8');
  assert(content.includes('CREATE TABLE'), 'Should create table');
  assert(content.includes('log_embeddings'), 'Should be named log_embeddings');
  assert(content.includes('VECTOR(1536)'), 'Should use VECTOR(1536) for embeddings');
});

// Test 4: log_embeddings has vector index
test('log_embeddings has HNSW vector index', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_log_embeddings_table.sql');
  const content = fs.readFileSync(migrationPath, 'utf-8');
  
  assert(content.includes('hnsw'), 'Should use HNSW index');
  assert(content.includes('vector_cosine_ops'), 'Should use cosine similarity');
});

// Test 5: log_embeddings has RLS policies
test('log_embeddings has proper RLS policies', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_log_embeddings_table.sql');
  const content = fs.readFileSync(migrationPath, 'utf-8');
  
  assert(content.includes('ENABLE ROW LEVEL SECURITY'), 'Should enable RLS');
  assert(content.includes('user_can_view_own_embeddings'), 'Should have user view policy');
  assert(content.includes('service_role_can_insert_embeddings'), 'Should have service role insert policy');
});

// Test 6: Vector search RPC function exists
test('Vector search RPC function migration exists', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_vector_search_rpc.sql');
  assert(fs.existsSync(migrationPath), 'Vector search RPC migration should exist');
  
  const content = fs.readFileSync(migrationPath, 'utf-8');
  assert(content.includes('search_similar_logs'), 'Should create search_similar_logs function');
  assert(content.includes('cosine'), 'Should use cosine distance');
});

// Test 7: Vector search filters by user
test('Vector search RPC filters by user_id', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_vector_search_rpc.sql');
  const content = fs.readFileSync(migrationPath, 'utf-8');
  
  assert(content.includes('query_user_id'), 'Should accept query_user_id parameter');
  assert(content.includes('user_id = query_user_id'), 'Should filter by user_id');
});

// Test 8: Vector search limits to 90 days by default
test('Vector search has date threshold parameter', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_vector_search_rpc.sql');
  const content = fs.readFileSync(migrationPath, 'utf-8');
  
  assert(content.includes('date_threshold'), 'Should have date_threshold parameter');
  assert(content.includes('90 days'), 'Should default to 90 days');
});

// Test 9: Embedding service filters vector search by user
test('searchSimilarLogs accepts userId parameter', () => {
  const fs = require('fs');
  const path = require('path');
  const servicePath = path.join(__dirname, '../services/embeddingService.js');
  const content = fs.readFileSync(servicePath, 'utf-8');
  
  assert(content.includes('userId'), 'Should accept userId parameter');
  assert(content.includes('query_user_id'), 'Should pass userId to RPC');
});

// Test 10: Embedding service limits search to 90 days
test('searchSimilarLogs defaults to 90 days back', () => {
  const fs = require('fs');
  const path = require('path');
  const servicePath = path.join(__dirname, '../services/embeddingService.js');
  const content = fs.readFileSync(servicePath, 'utf-8');
  
  assert(content.includes('daysBack = 90') || content.includes('daysBack=90'), 'Should default to 90 days');
});

// Test 11: Prompt service integrates vector search
test('Prompt service integrates vector search', () => {
  const fs = require('fs');
  const path = require('path');
  const servicePath = path.join(__dirname, '../services/promptService.js');
  const content = fs.readFileSync(servicePath, 'utf-8');
  
  assert(content.includes('searchSimilarLogs') || content.includes('fetchRelevantPastLogs'), 'Should use vector search');
  assert(content.includes('RELEVANT PAST LOGS') || content.includes('Relevant Past Logs'), 'Should include relevant logs section');
});

// Test 12: Embedding service stores all required fields
test('storeLogEmbedding stores all required fields', () => {
  const fs = require('fs');
  const path = require('path');
  const servicePath = path.join(__dirname, '../services/embeddingService.js');
  const content = fs.readFileSync(servicePath, 'utf-8');
  
  assert(content.includes('user_id'), 'Should store user_id');
  assert(content.includes('log_type'), 'Should store log_type');
  assert(content.includes('log_id'), 'Should store log_id');
  assert(content.includes('text'), 'Should store text');
  assert(content.includes('embedding'), 'Should store embedding');
});

console.log('\n==================================================');
console.log(`📊 Test Results: ${passedTests}/${passedTests + failedTests} tests passed`);

if (failedTests === 0) {
  console.log('🎉 All vector search tests passed!');
} else {
  console.log(`❌ ${failedTests} test(s) failed`);
  process.exit(1);
}
