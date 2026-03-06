import "server-only";

const KIS_BASE_URL =
  process.env.KIS_BASE_URL ?? "https://openapi.koreainvestment.com:9443";

export type IssuedKisToken = {
  accessToken: string;
  issuedAt: string;
  expiresAt: string;
  expiresInSeconds: number;
};

export const issueKisAccessToken = async (): Promise<IssuedKisToken> => {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("KIS_APP_KEY 또는 KIS_APP_SECRET이 없습니다.");
  }

  const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      JSON.stringify({
        status: response.status,
        body: errorBody,
        endpoint: "oauth2/tokenP",
      })
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error("KIS 토큰 발급 응답이 비어 있습니다.");
  }

  const expiresInSeconds = data.expires_in ?? 24 * 60 * 60;
  const issuedAtDate = new Date();
  const expiresAtDate = new Date(
    issuedAtDate.getTime() + expiresInSeconds * 1000
  );

  return {
    accessToken: data.access_token,
    issuedAt: issuedAtDate.toISOString(),
    expiresAt: expiresAtDate.toISOString(),
    expiresInSeconds,
  };
};
