import { GET } from "@/app/auth/callback/route";
import { createMockSupabaseClient } from "../../setup/supabaseMock";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/auth/callback");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

function redirectLocation(res: Response) {
  return res.headers.get("location") ?? "";
}

describe("GET /auth/callback", () => {
  it("redirects to /login?error=auth_failed when no code is present", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());
    const res = await GET(makeRequest({}));
    expect(redirectLocation(res)).toMatch(/login\?error=auth_failed/);
  });

  it("redirects to /login?error=auth_failed when code exchange fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ exchangeCodeError: { message: "invalid code" } })
    );
    const res = await GET(makeRequest({ code: "bad-code" }));
    expect(redirectLocation(res)).toMatch(/login\?error=auth_failed/);
  });

  it("redirects to /login?error=unauthorized when user has no profile row", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: { profiles: { data: null, error: null } },
      })
    );
    const res = await GET(makeRequest({ code: "valid-code" }));
    expect(redirectLocation(res)).toMatch(/login\?error=unauthorized/);
  });

  it("redirects to /login?error=unauthorized when user is not an admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: { data: { is_superadmin: false, is_matrix_admin: false }, error: null },
        },
      })
    );
    const res = await GET(makeRequest({ code: "valid-code" }));
    expect(redirectLocation(res)).toMatch(/login\?error=unauthorized/);
  });

  it("redirects to /dashboard when user is a superadmin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: { data: { is_superadmin: true, is_matrix_admin: false }, error: null },
        },
      })
    );
    const res = await GET(makeRequest({ code: "valid-code" }));
    expect(redirectLocation(res)).toMatch(/\/dashboard$/);
  });

  it("redirects to /dashboard when user is a matrix_admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: { data: { is_superadmin: false, is_matrix_admin: true }, error: null },
        },
      })
    );
    const res = await GET(makeRequest({ code: "valid-code" }));
    expect(redirectLocation(res)).toMatch(/\/dashboard$/);
  });
});
