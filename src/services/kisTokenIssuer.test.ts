import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("kisTokenIssuer", () => {
  beforeEach(() => {
    process.env.KIS_APP_KEY = "test-app-key";
    process.env.KIS_APP_SECRET = "test-app-secret";
    process.env.KIS_BASE_URL = "https://kis.example.com";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("issues token and returns expiry metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "issued-token",
          expires_in: 86400,
        }),
        { status: 200 }
      )
    );

    const { issueKisAccessToken } = await import("./kisTokenIssuer");
    const result = await issueKisAccessToken();

    expect(result.accessToken).toBe("issued-token");
    expect(result.expiresInSeconds).toBe(86400);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(
      new Date(result.issuedAt).getTime()
    );
  });

  it("throws when KIS credentials are missing", async () => {
    delete process.env.KIS_APP_KEY;
    delete process.env.KIS_APP_SECRET;

    const { issueKisAccessToken } = await import("./kisTokenIssuer");
    await expect(issueKisAccessToken()).rejects.toThrow(
      "KIS_APP_KEY 또는 KIS_APP_SECRET이 없습니다."
    );
  });

  it("throws when token endpoint fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("failed", { status: 500 })
    );

    const { issueKisAccessToken } = await import("./kisTokenIssuer");
    await expect(issueKisAccessToken()).rejects.toThrow("oauth2/tokenP");
  });
});
