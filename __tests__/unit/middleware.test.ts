import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createServerClient } = require("@supabase/ssr");
const mockCreateServerClient = createServerClient as jest.Mock;

function mockUser(user: object | null) {
  mockCreateServerClient.mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
  });
}

function redirectLocation(res: Response) {
  return res.headers.get("location") ?? "";
}

describe("middleware", () => {
  it("redirects unauthenticated users to /login when accessing a protected route", async () => {
    mockUser(null);
    const req = new NextRequest("http://localhost/dashboard");
    const res = await middleware(req);
    expect(redirectLocation(res)).toMatch(/\/login$/);
  });

  it("redirects authenticated users away from /login to /dashboard", async () => {
    mockUser({ id: "user-123" });
    const req = new NextRequest("http://localhost/login");
    const res = await middleware(req);
    expect(redirectLocation(res)).toMatch(/\/dashboard$/);
  });

  it("passes through authenticated requests to protected routes", async () => {
    mockUser({ id: "user-123" });
    const req = new NextRequest("http://localhost/dashboard");
    const res = await middleware(req);
    // No redirect — status is 200 (NextResponse.next)
    expect(res.status).toBe(200);
    expect(redirectLocation(res)).toBe("");
  });

  it("passes through unauthenticated requests to /login", async () => {
    mockUser(null);
    const req = new NextRequest("http://localhost/login");
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(redirectLocation(res)).toBe("");
  });
});
