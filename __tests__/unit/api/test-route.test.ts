import { POST } from "@/app/api/flavors/[id]/test/route";
import { createMockSupabaseClient } from "../../setup/supabaseMock";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

const PARAMS = { params: Promise.resolve({ id: "5" }) };
const adminProfile = { data: { is_superadmin: true, is_matrix_admin: false }, error: null };

function makePost(body: object) {
  return new Request("http://localhost/api/flavors/5/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/flavors/[id]/test", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await POST(makePost({ image_id: 99 }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: { data: { is_superadmin: false, is_matrix_admin: false }, error: null },
        },
      })
    );
    const res = await POST(makePost({ image_id: 99 }), PARAMS);
    expect(res.status).toBe(403);
  });

  it("returns 400 when image_id is missing", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ queryResults: { profiles: adminProfile } })
    );
    const res = await POST(makePost({}), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/image_id/i);
  });

  it("returns 401 when there is no active session", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        session: null,
        queryResults: { profiles: adminProfile },
      })
    );
    const res = await POST(makePost({ image_id: 99 }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 200 with caption data from the external API", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ queryResults: { profiles: adminProfile } })
    );
    const captions = [{ id: 1, content: "Very funny caption" }];
    jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(captions), { status: 200 })
    );
    const res = await POST(makePost({ image_id: 99 }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(captions);
  });

  it("returns 500 when the external caption API is unreachable", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ queryResults: { profiles: adminProfile } })
    );
    jest.spyOn(global, "fetch").mockRejectedValueOnce(new Error("network error"));
    const res = await POST(makePost({ image_id: 99 }), PARAMS);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/network error/i);
  });
});
