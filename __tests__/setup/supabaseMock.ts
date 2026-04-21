type MockResult = { data: unknown; error: unknown };

function makeQueryBuilder(result: MockResult) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb: any = {};

  for (const method of ["select", "insert", "update", "delete", "upsert", "eq", "neq", "order", "limit"]) {
    qb[method] = jest.fn(() => qb);
  }

  qb.single = jest.fn(() => Promise.resolve(result));
  // Makes the builder itself awaitable (for chains that don't call .single())
  qb.then = (resolve: (v: MockResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  qb.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);

  return qb;
}

export interface MockSupabaseOptions {
  user?: object | null;
  session?: object | null;
  queryResults?: Record<string, MockResult>;
  exchangeCodeError?: object | null;
}

export function createMockSupabaseClient(opts: MockSupabaseOptions = {}) {
  const {
    user = { id: "user-123" },
    session = { access_token: "mock-access-token" },
    queryResults = {},
    exchangeCodeError = null,
  } = opts;

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
      getSession: jest.fn().mockResolvedValue({ data: { session } }),
      exchangeCodeForSession: jest.fn().mockResolvedValue({ error: exchangeCodeError }),
      signOut: jest.fn().mockResolvedValue({}),
    },
    from: jest.fn().mockImplementation((table: string) => {
      const result = queryResults[table] ?? { data: null, error: null };
      return makeQueryBuilder(result);
    }),
  };
}
