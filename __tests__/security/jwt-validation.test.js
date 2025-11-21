const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

describe('JWT Validation Security', () => {
  let supabase;
  let validToken;
  let userId;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Create test user and get valid token
    const { data, error } = await supabase.auth.signUp({
      email: `test-jwt-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });

    if (error) throw error;

    validToken = data.session.access_token;
    userId = data.user.id;
  });

  afterAll(async () => {
    // Cleanup test user
    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  test('Valid JWT should be accepted', async () => {
    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .get('/api/profile')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  test('Missing JWT should be rejected', async () => {
    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .get('/api/profile');

    expect(response.status).toBe(401);
  });

  test('Invalid JWT should be rejected', async () => {
    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .get('/api/profile')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
  });

  test('Malformed JWT should be rejected', async () => {
    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .get('/api/profile')
      .set('Authorization', 'Bearer notevenatoken');

    expect(response.status).toBe(401);
  });

  test('Tampered JWT should be rejected', async () => {
    // Take valid token and modify the payload (will break signature)
    const parts = validToken.split('.');
    if (parts.length === 3) {
      const tamperedToken = parts[0] + '.eyJ0YW1wZXJlZCI6dHJ1ZX0.' + parts[2];

      const response = await request(process.env.API_URL || 'http://localhost:3000')
        .get('/api/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    }
  });
});

describe('Token Expiry Security', () => {
  test('Expired token should be rejected', async () => {
    // Create a token that's already expired
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalidexpiredtoken';

    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .get('/api/profile')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });

  test('Fresh token should be accepted', async () => {
    // Sign in to get fresh token
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data } = await supabase.auth.signUp({
      email: `test-fresh-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });

    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .get('/api/profile')
      .set('Authorization', `Bearer ${data.session.access_token}`);

    expect(response.status).not.toBe(401);

    // Cleanup
    await supabase.auth.admin.deleteUser(data.user.id);
  });
});
