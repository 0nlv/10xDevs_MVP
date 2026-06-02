/**
 * Mock user object matching Supabase Auth User type.
 * Used to simulate authenticated requests in tests.
 */
export interface MockUser {
  id: string;
  email: string;
  aud?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Creates a mock authenticated user object for testing.
 * Matches the shape of Supabase Auth User.
 *
 * @param overrides - Optional fields to override defaults
 * @returns Mock user object
 *
 * @example
 * const user = createMockUser({ email: 'custom@example.com' });
 * const context = { locals: { user } };
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  const now = new Date().toISOString();

  return {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a mock Astro context with authenticated user.
 * Simulates the context.locals.user shape from middleware.
 *
 * @param user - Optional user object (defaults to createMockUser())
 * @returns Mock Astro context
 *
 * @example
 * const context = createMockAPIContext();
 * const response = await POST(context);
 */
export function createMockAPIContext(user?: MockUser | null) {
  return {
    locals: {
      user: user === null ? null : user || createMockUser(),
    },
  };
}
