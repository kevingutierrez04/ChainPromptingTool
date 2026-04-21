/**
 * Integration tests for step CRUD + reorder — hit the real Supabase DB via service role key.
 * Auth is mocked so no OAuth credentials are needed.
 */

import { POST as postStep, GET as getSteps } from "@/app/api/flavors/[id]/steps/route";
import { PATCH as patchStep, DELETE as deleteStep } from "@/app/api/flavors/[id]/steps/[stepId]/route";
import { POST as reorder } from "@/app/api/flavors/[id]/reorder/route";
import { adminClient, getTestUserId, getRefIds } from "./setup";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

let testFlavorId: number;
let createdStepId: number;
let secondStepId: number;
let userId: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let refIds: Awaited<ReturnType<typeof getRefIds>>;

beforeAll(async () => {
  userId = await getTestUserId();
  refIds = await getRefIds();

  // Create a dedicated test flavor directly via adminClient (skips route auth)
  const { data, error } = await adminClient
    .from("humor_flavors")
    .insert({ slug: `__test__steps_${Date.now()}`, created_by_user_id: userId, modified_by_user_id: userId })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Could not create test flavor: ${error?.message}`);
  testFlavorId = data.id;

  // Hybrid mock: auth returns real admin user; from() uses real DB via service role key
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    from: adminClient.from.bind(adminClient),
  });
});

afterAll(async () => {
  await adminClient.from("humor_flavor_steps").delete().eq("humor_flavor_id", testFlavorId);
  await adminClient.from("humor_flavors").delete().eq("id", testFlavorId);
});

function flavorParams(extraParams?: { stepId?: string }) {
  return {
    params: Promise.resolve({ id: String(testFlavorId), ...extraParams }),
  };
}

describe("Steps integration — POST", () => {
  it("creates a step and assigns order_by = 1 (first step)", async () => {
    const req = new Request(`http://localhost/api/flavors/${testFlavorId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        llm_system_prompt: "You are a comedian",
        description: "integration step 1",
        ...refIds,
      }),
    });

    const res = await postStep(req, flavorParams());
    expect(res.status).toBe(201);

    const body = await res.json();
    createdStepId = body.id;
    expect(body.order_by).toBe(1);

    // Verify in DB
    const { data } = await adminClient
      .from("humor_flavor_steps")
      .select("order_by, description")
      .eq("id", createdStepId)
      .single();

    expect(data?.order_by).toBe(1);
    expect(data?.description).toBe("integration step 1");
  });

  it("creates a second step and auto-increments order_by to 2", async () => {
    const req = new Request(`http://localhost/api/flavors/${testFlavorId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        llm_system_prompt: "Follow-up step",
        description: "integration step 2",
        ...refIds,
      }),
    });

    const res = await postStep(req, flavorParams());
    expect(res.status).toBe(201);
    const body = await res.json();
    secondStepId = body.id;
    expect(body.order_by).toBe(2);
  });
});

describe("Steps integration — GET", () => {
  it("returns all steps ordered by order_by ascending", async () => {
    const req = new Request(`http://localhost/api/flavors/${testFlavorId}/steps`);
    const res = await getSteps(req, flavorParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
    expect(body[0].order_by).toBeLessThan(body[1].order_by);
  });
});

describe("Steps integration — PATCH", () => {
  it("updates the step system prompt and persists the change", async () => {
    const req = new Request(
      `http://localhost/api/flavors/${testFlavorId}/steps/${createdStepId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llm_system_prompt: "Updated prompt via integration test" }),
      }
    );

    const res = await patchStep(req, flavorParams({ stepId: String(createdStepId) }));
    expect(res.status).toBe(200);

    const { data } = await adminClient
      .from("humor_flavor_steps")
      .select("llm_system_prompt")
      .eq("id", createdStepId)
      .single();

    expect(data?.llm_system_prompt).toBe("Updated prompt via integration test");
  });
});

describe("Steps integration — reorder", () => {
  it("swaps step order and persists the new order_by values", async () => {
    const req = new Request(`http://localhost/api/flavors/${testFlavorId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Reverse the order: step2 first, step1 second
      body: JSON.stringify({ orderedIds: [String(secondStepId), String(createdStepId)] }),
    });

    const res = await reorder(req, flavorParams());
    expect(res.status).toBe(200);

    const { data } = await adminClient
      .from("humor_flavor_steps")
      .select("id, order_by")
      .eq("humor_flavor_id", testFlavorId)
      .order("order_by", { ascending: true });

    const first = data?.find((s: { id: number }) => s.id === secondStepId);
    const second = data?.find((s: { id: number }) => s.id === createdStepId);
    expect(first?.order_by).toBe(1);
    expect(second?.order_by).toBe(2);
  });
});

describe("Steps integration — DELETE", () => {
  it("deletes a step and renumbers the remaining step to order_by = 1", async () => {
    const req = new Request(
      `http://localhost/api/flavors/${testFlavorId}/steps/${secondStepId}`
    );

    const res = await deleteStep(req, flavorParams({ stepId: String(secondStepId) }));
    expect(res.status).toBe(200);

    // Deleted step should be gone
    const { data: gone } = await adminClient
      .from("humor_flavor_steps")
      .select("id")
      .eq("id", secondStepId)
      .maybeSingle();
    expect(gone).toBeNull();

    // Remaining step should now be order_by = 1
    const { data: remaining } = await adminClient
      .from("humor_flavor_steps")
      .select("order_by")
      .eq("id", createdStepId)
      .single();
    expect(remaining?.order_by).toBe(1);
  });
});
