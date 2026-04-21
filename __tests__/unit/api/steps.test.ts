import { POST, GET } from "@/app/api/flavors/[id]/steps/route";
import { createMockSupabaseClient } from "../../setup/supabaseMock";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

const PARAMS = { params: Promise.resolve({ id: "1" }) };

const validStepBody = {
  llm_system_prompt: "You are a comedian",
  llm_user_prompt: "Make it funny",
  llm_model_id: 1,
  llm_input_type_id: 1,
  llm_output_type_id: 1,
  humor_flavor_step_type_id: 1,
};

function makePost(body: object) {
  return new Request("http://localhost/api/flavors/1/steps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/flavors/[id]/steps", () => {
  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await POST(makePost(validStepBody), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required FK fields are missing", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());
    const res = await POST(makePost({ llm_system_prompt: "hello" }), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it("auto-assigns order_by as 1 when flavor has no existing steps", async () => {
    const step = { id: 10, order_by: 1, humor_flavor_id: 1 };
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          humor_flavor_steps: { data: step, error: null },
        },
      })
    );
    const res = await POST(makePost(validStepBody), PARAMS);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(10);
  });

  it("returns 500 when DB insert fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: {
          humor_flavor_steps: { data: null, error: { message: "FK violation" } },
        },
      })
    );
    const res = await POST(makePost(validStepBody), PARAMS);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/flavors/[id]/steps", () => {
  it("returns 401 when no user", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
    const res = await GET(new Request("http://localhost/api/flavors/1/steps"), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 200 with ordered steps array", async () => {
    const steps = [
      { id: 1, order_by: 1, humor_flavor_id: 1 },
      { id: 2, order_by: 2, humor_flavor_id: 1 },
    ];
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: { humor_flavor_steps: { data: steps, error: null } },
      })
    );
    const res = await GET(new Request("http://localhost/api/flavors/1/steps"), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("returns 500 when DB query fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        queryResults: { humor_flavor_steps: { data: null, error: { message: "timeout" } } },
      })
    );
    const res = await GET(new Request("http://localhost/api/flavors/1/steps"), PARAMS);
    expect(res.status).toBe(500);
  });
});
