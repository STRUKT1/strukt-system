/**
 * Supabase Server Client
 * 
 * Server-side Supabase client using service role key for admin operations.
 * This client bypasses RLS policies and can perform any database operation.
 * 
 * Environment Variables Required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (not anon key)
 */

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a lazy-initialized client
let _supabaseAdmin = null;

function getSupabaseAdmin() {
  if (!url) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(url, serviceKey, {
      auth: { 
        autoRefreshToken: false, 
        persistSession: false 
      },
    });
  }

  return _supabaseAdmin;
}

// Export a proxy that creates the client on first access
const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseAdmin();
    return client[prop];
  }
});

module.exports = {
  supabaseAdmin
};