import { vi } from 'vitest';

type MockResponse = {
  data: any;
  error: any;
};

type MockResponses = Record<string, MockResponse>;

/**
 * Creates a mock Supabase client for testing.
 * Supports chainable query methods like .from().insert().select()
 *
 * @param options - Configuration options
 * @param options.mockResponses - Map of operation keys to mock responses
 * @returns Mock Supabase client
 *
 * @example
 * const mockClient = createMockSupabaseClient({
 *   mockResponses: {
 *     'uploads.insert': { data: { id: 'mock-upload-id' }, error: null },
 *     'invoice_revenue.insert': { data: null, error: null }
 *   }
 * });
 */
export function createMockSupabaseClient(options?: { mockResponses?: MockResponses }) {
  const { mockResponses = {} } = options || {};
  const callHistory: Array<{ table: string; operation: string; args: any[] }> = [];

  // Helper to create chainable query builder
  const createQueryBuilder = (table: string) => {
    let currentOperation = '';
    let currentArgs: any[] = [];

    const builder: any = {
      select: (...args: any[]) => {
        currentOperation = 'select';
        currentArgs = args;
        return builder;
      },
      insert: (...args: any[]) => {
        currentOperation = 'insert';
        currentArgs = args;
        callHistory.push({ table, operation: 'insert', args });
        return builder;
      },
      update: (...args: any[]) => {
        currentOperation = 'update';
        currentArgs = args;
        callHistory.push({ table, operation: 'update', args });
        return builder;
      },
      delete: () => {
        currentOperation = 'delete';
        currentArgs = [];
        callHistory.push({ table, operation: 'delete', args: [] });
        return builder;
      },
      upsert: (...args: any[]) => {
        currentOperation = 'upsert';
        currentArgs = args;
        callHistory.push({ table, operation: 'upsert', args });
        return builder;
      },
      eq: (...args: any[]) => {
        return builder;
      },
      neq: (...args: any[]) => {
        return builder;
      },
      single: () => {
        const key = `${table}.${currentOperation}`;
        return mockResponses[key] || { data: null, error: null };
      },
    };

    // Make builder thenable for async/await
    builder.then = (resolve: any) => {
      const key = `${table}.${currentOperation}`;
      const response = mockResponses[key] || { data: null, error: null };
      resolve(response);
      return Promise.resolve(response);
    };

    return builder;
  };

  const mockClient = {
    from: vi.fn((table: string) => createQueryBuilder(table)),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: null },
          error: null,
        })
      ),
      signUp: vi.fn(() =>
        Promise.resolve({
          data: { user: null, session: null },
          error: null,
        })
      ),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({
          data: { user: null, session: null },
          error: null,
        })
      ),
      signOut: vi.fn(() =>
        Promise.resolve({
          error: null,
        })
      ),
    },
    // Expose call history for assertions in tests
    _callHistory: callHistory,
  };

  return mockClient;
}

/**
 * Get calls to a specific table.operation for assertions
 * @example
 * const calls = getMockCalls(mockClient, 'uploads', 'insert');
 * expect(calls).toHaveLength(1);
 * expect(calls[0].args[0]).toMatchObject({ filename: 'test.csv' });
 */
export function getMockCalls(
  mockClient: any,
  table: string,
  operation: string
): Array<{ table: string; operation: string; args: any[] }> {
  return mockClient._callHistory.filter(
    (call: any) => call.table === table && call.operation === operation
  );
}
