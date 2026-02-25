import { describe, expect, it } from "vitest";
import { isAutoApproved, generateMagicToken, buildMagicLinkUrl, buildMagicLinkEmailHtml } from "./emailAuth";

describe("isAutoApproved", () => {
  it("approves rubix-consulting.com emails", () => {
    expect(isAutoApproved("jean.dupont@rubix-consulting.com")).toBe(true);
    expect(isAutoApproved("ADMIN@RUBIX-CONSULTING.COM")).toBe(true);
    expect(isAutoApproved("  test@rubix-consulting.com  ")).toBe(true);
  });

  it("rejects non-rubix-consulting emails", () => {
    expect(isAutoApproved("jean@gmail.com")).toBe(false);
    expect(isAutoApproved("test@rubix.com")).toBe(false);
    expect(isAutoApproved("test@other-consulting.com")).toBe(false);
    expect(isAutoApproved("test@rubix-consulting.fr")).toBe(false);
  });
});

describe("generateMagicToken", () => {
  it("generates a non-empty hex string", () => {
    const token = generateMagicToken();
    expect(token).toBeTruthy();
    expect(token.length).toBe(96); // 48 bytes = 96 hex chars
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("generates unique tokens", () => {
    const token1 = generateMagicToken();
    const token2 = generateMagicToken();
    expect(token1).not.toBe(token2);
  });
});

describe("buildMagicLinkUrl", () => {
  it("builds URL from request origin", () => {
    const req = {
      headers: { origin: "https://funnel.rubix-consulting.com" },
      protocol: "https",
    } as any;
    const url = buildMagicLinkUrl(req, "abc123");
    expect(url).toBe("https://funnel.rubix-consulting.com/auth/verify?token=abc123");
  });

  it("falls back to referer origin", () => {
    const req = {
      headers: { referer: "https://app.example.com/login" },
      protocol: "https",
    } as any;
    const url = buildMagicLinkUrl(req, "token456");
    expect(url).toBe("https://app.example.com/auth/verify?token=token456");
  });

  it("falls back to protocol + host", () => {
    const req = {
      headers: { host: "localhost:3000" },
      protocol: "http",
    } as any;
    const url = buildMagicLinkUrl(req, "token789");
    expect(url).toBe("http://localhost:3000/auth/verify?token=token789");
  });
});

describe("buildMagicLinkEmailHtml", () => {
  it("generates HTML with the magic link URL", () => {
    const html = buildMagicLinkEmailHtml("https://app.example.com/auth/verify?token=abc");
    expect(html).toContain("https://app.example.com/auth/verify?token=abc");
    expect(html).toContain("Se connecter");
    expect(html).toContain("15 minutes");
  });
});
