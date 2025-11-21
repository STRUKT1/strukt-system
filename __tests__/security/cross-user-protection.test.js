const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

describe('Cross-User Protection', () => {
  let supabase;
  let userA_token, userA_id;
  let userB_token, userB_id;
  let userB_profileId;

  beforeAll(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Create User A
    const userA = await supabase.auth.signUp({
      email: `usera-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });
    userA_token = userA.data.session.access_token;
    userA_id = userA.data.user.id;

    // Create User B
    const userB = await supabase.auth.signUp({
      email: `userb-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });
    userB_token = userB.data.session.access_token;
    userB_id = userB.data.user.id;

    // Create a profile for User B
    const { data: profile } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userB_id,
        email: `userb-${Date.now()}@example.com`,
        name: 'User B',
      })
      .select()
      .single();

    userB_profileId = profile.id;
  });

  afterAll(async () => {
    // Cleanup
    if (userA_id) await supabase.auth.admin.deleteUser(userA_id);
    if (userB_id) await supabase.auth.admin.deleteUser(userB_id);
  });

  test('User A cannot access User B profile', async () => {
    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .get(`/api/profile/${userB_profileId}`)
      .set('Authorization', `Bearer ${userA_token}`);

    expect([401, 403, 404]).toContain(response.status);
  });

  test('User A can only see their own data', async () => {
    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .get('/api/profile')
      .set('Authorization', `Bearer ${userA_token}`);

    expect(response.status).toBe(200);
    expect(response.body.user_id).toBe(userA_id);
    expect(response.body.user_id).not.toBe(userB_id);
  });

  test('User A cannot modify User B data', async () => {
    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .put(`/api/profile/${userB_profileId}`)
      .set('Authorization', `Bearer ${userA_token}`)
      .send({ name: 'Hacked!' });

    expect([401, 403, 404]).toContain(response.status);
  });

  test('User A cannot delete User B data', async () => {
    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .delete(`/api/profile/${userB_profileId}`)
      .set('Authorization', `Bearer ${userA_token}`);

    expect([401, 403, 404]).toContain(response.status);
  });

  test('User B can still access their own data after attack attempts', async () => {
    const response = await request(process.env.API_URL || 'http://localhost:3000')
      .get('/api/profile')
      .set('Authorization', `Bearer ${userB_token}`);

    expect(response.status).toBe(200);
    expect(response.body.user_id).toBe(userB_id);
  });
});
