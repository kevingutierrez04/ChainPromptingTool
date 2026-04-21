/**
 * Integration tests for flavor CRUD — hit the real Supabase DB via service role key.
 * Auth is mocked so no OAuth credentials are needed.
 */

import { POST, GET } from "@/app/api/flavors/route";
import { PATCH, DELETE } from "@/app/api/flavors/[id]/route";
import { adminClient, getTestUserId } from "./setup";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

const TEST_SLUG = `__test__flavor_${Date.now()}`;
let createdFlavorId: number;
let userId: string;

beforeAll(async () => {
  userId = await getTestUserId();

  // Hybrid mock: auth returns real admin user; from() uses real DB via service role key
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    from: adminClient.from.bind(adminClient),
  });
});

afterAll(async () => {
  // Clean up by specific ID so we don't race with other integration test files
  if (createdFlavorId) {
    await adminClient.from("humor_flavor_steps").delete().eq("humor_flavor_id", createdFlavorId);
    await adminClient.from("humor_flavors").delete().eq("id", createdFlavorId);
  }
});

describe("Flavors integration — POST", () => {
  it("creates a flavor and persists it in the DB", async () => {
    const req = new Request("http://localhost/api/flavors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: TEST_SLUG, description: "integration test flavor" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    createdFlavorId = body.id;
    expect(typeof createdFlavorId).toBe("number");

    // Verify row exists in DB
    const { data } = await adminClient
      .from("humor_flavors")
      .select("slug, description")
      .eq("id", createdFlavorId)
      .single();

    expect(data?.slug).toBe(TEST_SLUG);
    expect(data?.description).toBe("integration test flavor");
  });
});

describe("Flavors integration — GET", () => {
  it("lists flavors and includes the one we just created", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    const found = body.find((f: { id: number }) => f.id === createdFlavorId);
    expect(found).toBeDefined();
  });
});

describe("Flavors integration — PATCH", () => {
  it("updates the flavor slug and persists the change", async () => {
    const updatedSlug = `${TEST_SLUG}_updated`;
    const req = new Request(`http://localhost/api/flavors/${createdFlavorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: updatedSlug }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: String(createdFlavorId) }) });
    expect(res.status).toBe(200);

    // Verify updated value in DB
    const { data } = await adminClient
      .from("humor_flavors")
      .select("slug")
      .eq("id", createdFlavorId)
      .single();

    expect(data?.slug).toBe(updatedSlug);
  });
});

describe("Flavors integration — DELETE", () => {
  it("deletes the flavor and confirms it no longer exists in the DB", async () => {
    const res = await DELETE(
      new Request(`http://localhost/api/flavors/${createdFlavorId}`),
      { params: Promise.resolve({ id: String(createdFlavorId) }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify the row is gone
    const { data } = await adminClient
      .from("humor_flavors")
      .select("id")
      .eq("id", createdFlavorId)
      .maybeSingle();

    expect(data).toBeNull();
  });
});
