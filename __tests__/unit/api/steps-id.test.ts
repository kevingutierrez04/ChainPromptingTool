import { PATCH, DELETE } from "@/app/api/flavors/[id]/steps/[stepId]/route";
import { createMockSupabaseClient } from "../../setup/supabaseMock";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

const PARAMS = { params: Promise.resolve({ id: "1", stepId: "42" }) };

function makePatch(body: object) {
  return new Request("http://localhost/api/flavors/1/steps/42", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/flavors/[id]/steps/[stepId]", () => {
  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await PATCH(makePatch({ llm_system_prompt: "updated" }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 200 with the updated step", async () => {
    const updated = { id: 42, llm_system_prompt: "updated prompt", order_by: 1 };
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: { humor_flavor_steps: { data: updated, error: null } },
      })
    );
    const res = await PATCH(makePatch({ llm_system_prompt: "updated prompt" }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.llm_system_prompt).toBe("updated prompt");
  });

  it("returns 500 when DB update fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: { humor_flavor_steps: { data: null, error: { message: "step not found" } } },
      })
    );
    const res = await PATCH(makePatch({ llm_system_prompt: "x" }), PARAMS);
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/flavors/[id]/steps/[stepId]", () => {
  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await DELETE(new Request("http://localhost/api/flavors/1/steps/42"), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 200 and re-numbers remaining steps", async () => {
    // After deletion, two steps remain to be renumbered
    const remaining = [{ id: "s1" }, { id: "s2" }];
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          humor_flavor_steps: { data: remaining, error: null },
        },
      })
    );
    const res = await DELETE(new Request("http://localhost/api/flavors/1/steps/42"), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 when the DB delete fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          humor_flavor_steps: { data: null, error: { message: "constraint error" } },
        },
      })
    );
    const res = await DELETE(new Request("http://localhost/api/flavors/1/steps/42"), PARAMS);
    expect(res.status).toBe(500);
  });
});
