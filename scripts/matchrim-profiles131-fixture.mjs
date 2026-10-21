export const makeProfiles131 = firstId => Array.from({ length: 50 }, (_, i) => ({
  user: { id: i === 0 ? firstId : `00000000-0000-4000-8000-${String(200000 + i).padStart(12, '0')}`,
    aud: 'authenticated', role: 'authenticated', email: `qa-profile131-${String(i+1).padStart(2,'0')}@example.invalid`,
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-10-21T00:00:00Z' },
  profile: { potente: (i % 11) / 2, acidez: ((i * 7) % 51) / 10, dulce: ((i * 11) % 51) / 10,
    tanico: ((i * 13) % 51) / 10, afrutado: ((i * 17) % 51) / 10 },
}));
export const session131 = user => ({ access_token: Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.'
  + Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800, role: 'authenticated' })).toString('base64url') + '.synthetic-only',
  refresh_token: 'synthetic-only', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user });
