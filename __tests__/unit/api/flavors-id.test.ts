import { PATCH, DELETE } from "@/app/api/flavors/[id]/route";
import { createMockSupabaseClient } from "../../setup/supabaseMock";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

const adminProfile = { data: { is_superadmin: true, is_matrix_admin: false }, error: null };
const PARAMS = { params: Promise.resolve({ id: "1" }) };

function makePatch(body: object) {
  return new Request("http://localhost/api/flavors/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/flavors/[id]", () => {
  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await PATCH(makePatch({ slug: "new" }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 401 when user is not an admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: { data: { is_superadmin: false, is_matrix_admin: false }, error: null },
        },
      })
    );
    const res = await PATCH(makePatch({ slug: "new" }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 200 with updated flavor", async () => {
    const updated = { id: 1, slug: "updated-slug", description: null };
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: adminProfile,
          humor_flavors: { data: updated, error: null },
        },
      })
    );
    const res = await PATCH(makePatch({ slug: "updated-slug" }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe("updated-slug");
  });

  it("returns 500 when DB update fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: adminProfile,
          humor_flavors: { data: null, error: { message: "not found" } },
        },
      })
    );
    const res = await PATCH(makePatch({ slug: "x" }), PARAMS);
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/flavors/[id]", () => {
  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await DELETE(new Request("http://localhost/api/flavors/1"), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 200 on successful delete", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: adminProfile,
          humor_flavor_steps: { data: null, error: null },
          humor_flavors: { data: null, error: null },
        },
      })
    );
    const res = await DELETE(new Request("http://localhost/api/flavors/1"), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 when DB delete fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: adminProfile,
          humor_flavor_steps: { data: null, error: null },
          humor_flavors: { data: null, error: { message: "foreign key constraint" } },
        },
      })
    );
    const res = await DELETE(new Request("http://localhost/api/flavors/1"), PARAMS);
    expect(res.status).toBe(500);
  });
});
