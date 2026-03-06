import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  issueKisAccessToken: vi.fn(),
}));

vi.mock("@/services/kisTokenIssuer", () => ({
  issueKisAccessToken: mocks.issueKisAccessToken,
}));

describe("kisTokenStore (memory fallback)", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    mocks.issueKisAccessToken.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("deduplicates concurrent token requests", async () => {
    mocks.issueKisAccessToken.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return {
        accessToken: "token-1",
        issuedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
        expiresInSeconds: 86400,
      };
    });

    const { getKisAccessToken } = await import("./kisTokenStore");
    const [a, b] = await Promise.all([getKisAccessToken(), getKisAccessToken()]);

    expect(a).toBe("token-1");
    expect(b).toBe("token-1");
    expect(mocks.issueKisAccessToken).toHaveBeenCalledTimes(1);
  });

  it("reuses cached token before expiry", async () => {
    mocks.issueKisAccessToken.mockResolvedValue({
      accessToken: "cached-token",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
      expiresInSeconds: 86400,
    });

    const { getKisAccessToken } = await import("./kisTokenStore");
    const first = await getKisAccessToken();
    const second = await getKisAccessToken();

    expect(first).toBe("cached-token");
    expect(second).toBe("cached-token");
    expect(mocks.issueKisAccessToken).toHaveBeenCalledTimes(1);
  });

  it("reissues token when cached token is expired", async () => {
    mocks.issueKisAccessToken
      .mockResolvedValueOnce({
        accessToken: "expired-token",
        issuedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2000-01-01T00:00:00.000Z",
        expiresInSeconds: 0,
      })
      .mockResolvedValueOnce({
        accessToken: "new-token",
        issuedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
        expiresInSeconds: 86400,
      });

    const { getKisAccessToken } = await import("./kisTokenStore");
    const first = await getKisAccessToken();
    const second = await getKisAccessToken();

    expect(first).toBe("expired-token");
    expect(second).toBe("new-token");
    expect(mocks.issueKisAccessToken).toHaveBeenCalledTimes(2);
  });
});
