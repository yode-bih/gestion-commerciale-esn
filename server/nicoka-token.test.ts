import { describe, expect, it } from "vitest";

describe("Nicoka API Token validation", () => {
  it("should have NICOKA_API_TOKEN set", () => {
    const token = process.env.NICOKA_API_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(10);
  });

  it("should have NICOKA_SUBDOMAIN set", () => {
    const subdomain = process.env.NICOKA_SUBDOMAIN;
    expect(subdomain).toBe("rubix-consulting");
  });

  it("should successfully call Nicoka API with the token", async () => {
    const token = process.env.NICOKA_API_TOKEN;
    const subdomain = process.env.NICOKA_SUBDOMAIN;
    if (!token || !subdomain) {
      throw new Error("Missing NICOKA_API_TOKEN or NICOKA_SUBDOMAIN");
    }

    const baseUrl = `https://${subdomain}.nicoka.com/api`;
    const response = await fetch(`${baseUrl}/quotations?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
  }, 15000);
});
