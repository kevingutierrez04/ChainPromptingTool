import { POST, GET } from "@/app/api/flavors/route";
import { createMockSupabaseClient } from "../../setup/supabaseMock";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

const adminProfile = { data: { is_superadmin: true, is_matrix_admin: false }, error: null };
const notAdminProfile = { data: { is_superadmin: false, is_matrix_admin: false }, error: null };

function makePost(body: object) {
  return new Request("http://localhost/api/flavors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/flavors", () => {
  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await POST(makePost({ slug: "test" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ queryResults: { profiles: notAdminProfile } })
    );
    const res = await POST(makePost({ slug: "test" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when slug is blank", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ queryResults: { profiles: adminProfile } })
    );
    const res = await POST(makePost({ slug: "   " }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Slug is required");
  });

  it("returns 201 with the created flavor", async () => {
    const flavor = { id: 1, slug: "my-flavor", description: "a description" };
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: adminProfile,
          humor_flavors: { data: flavor, error: null },
        },
      })
    );
    const res = await POST(makePost({ slug: "my-flavor", description: "a description" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe("my-flavor");
  });

  it("returns 500 when the DB insert fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          profiles: adminProfile,
          humor_flavors: { data: null, error: { message: "unique constraint violation" } },
        },
      })
    );
    const res = await POST(makePost({ slug: "duplicate" }));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/flavors", () => {
  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with an array of flavors", async () => {
    const flavors = [{ id: 1, slug: "a" }, { id: 2, slug: "b" }];
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: { humor_flavors: { data: flavors, error: null } },
      })
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
  });

  it("returns 500 when the DB query fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: { humor_flavors: { data: null, error: { message: "connection refused" } } },
      })
    );
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
