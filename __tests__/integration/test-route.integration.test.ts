/**
 * Integration tests for the caption generation route.
 * The profile lookup hits the real DB via service role key.
 * The external almostcrackd.ai API is intercepted by URL — Supabase HTTP calls pass through.
 */

import { POST } from "@/app/api/flavors/[id]/test/route";
import { adminClient, getTestUserId } from "./setup";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@/lib/supabase/server");
const mockCreateClient = createClient as jest.Mock;

let userId: string;
const realFetch = global.fetch;

beforeAll(async () => {
  userId = await getTestUserId();

  // Hybrid mock: auth is mocked, from() goes through the real adminClient (service role)
  mockCreateClient.mockImplementation(() =>
    Promise.resolve({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }),
        getSession: jest.fn().mockResolvedValue({
          data: { session: { access_token: "mock-token-for-integration" } },
        }),
      },
      from: (table: string) => adminClient.from(table as never),
    })
  );
});

afterEach(() => {
  // Only restore fetch spies — leave the createClient mock intact
  jest.restoreAllMocks();
});

function makePost(body: object, flavorId = "5") {
  return new Request(`http://localhost/api/flavors/${flavorId}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Route fetch through to real network for Supabase; mock only the caption API endpoint. */
function mockCaptionApi(response: Response) {
  jest.spyOn(global, "fetch").mockImplementation((url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).includes("almostcrackd.ai")) return Promise.resolve(response);
    return realFetch(url as RequestInfo, init);
  });
}

describe("Test route integration — auth guard against real profiles", () => {
  it("returns 400 when image_id is missing (profile check passes via real DB)", async () => {
    const res = await POST(makePost({}), { params: Promise.resolve({ id: "5" }) });
    // Profile for userId IS a superadmin in the real DB → passes auth → hits 400
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/image_id/i);
  });

  it("returns 200 when the external API responds successfully", async () => {
    const mockCaptions = [{ id: 1, content: "Hilarious caption" }];
    mockCaptionApi(new Response(JSON.stringify(mockCaptions), { status: 200 }));

    const res = await POST(makePost({ image_id: 1 }), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockCaptions);
  });

  it("returns 500 when the external API throws a network error", async () => {
    jest
      .spyOn(global, "fetch")
      .mockImplementation((url: RequestInfo | URL, init?: RequestInit) => {
        if (String(url).includes("almostcrackd.ai")) return Promise.reject(new Error("ECONNREFUSED"));
        return realFetch(url as RequestInfo, init);
      });

    const res = await POST(makePost({ image_id: 1 }), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/ECONNREFUSED/);
  });
});
