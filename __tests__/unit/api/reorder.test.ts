import { POST } from "@/app/api/flavors/[id]/reorder/route";
import { createMockSupabaseClient } from "../../setup/supabaseMock";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

const PARAMS = { params: Promise.resolve({ id: "1" }) };

function makePost(body: object) {
  return new Request("http://localhost/api/flavors/1/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/flavors/[id]/reorder", () => {
  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await POST(makePost({ orderedIds: ["1", "2"] }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 400 when orderedIds is not an array", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());
    const res = await POST(makePost({ orderedIds: "not-an-array" }), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/array/i);
  });

  it("returns 200 with steps in the new order", async () => {
    const reordered = [
      { id: "2", order_by: 1 },
      { id: "1", order_by: 2 },
    ];
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          humor_flavor_steps: { data: reordered, error: null },
        },
      })
    );
    const res = await POST(makePost({ orderedIds: ["2", "1"] }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 500 when the final select fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          humor_flavor_steps: { data: null, error: { message: "query failed" } },
        },
      })
    );
    const res = await POST(makePost({ orderedIds: ["1", "2"] }), PARAMS);
    expect(res.status).toBe(500);
  });
});
