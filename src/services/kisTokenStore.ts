import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { issueKisAccessToken } from "@/services/kisTokenIssuer";

const KIS_PROVIDER = "kis";
const LOCK_TIMEOUT_MS = 30 * 1000;
const POLL_INTERVAL_MS = 400;
const POLL_RETRY_COUNT = 10;
const TOKEN_SKEW_MS = 5 * 1000;
const RELEASED_LOCK_AT = "1970-01-01T00:00:00.000Z";

type KisTokenRow = {
  provider: string;
  access_token: string | null;
  issued_at: string | null;
  expires_at: string | null;
  lock_until: string;
};

type MemoryTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let supabaseAdminClient: SupabaseClient | null = null;
let requestInFlight: Promise<string> | null = null;
let memoryTokenCache: MemoryTokenCache | null = null;

const hasSupabaseConfig = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const getSupabaseAdminClient = () => {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다."
    );
  }

  supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return supabaseAdminClient;
};

const ensureTokenRow = async (client: SupabaseClient) => {
  const { error } = await client.from("kis_tokens").upsert(
    {
      provider: KIS_PROVIDER,
      lock_until: RELEASED_LOCK_AT,
    },
    {
      onConflict: "provider",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw new Error(`kis_tokens 초기화 실패: ${error.message}`);
  }
};

const readValidToken = async (client: SupabaseClient) => {
  const { data, error } = await client
    .from("kis_tokens")
    .select("provider, access_token, issued_at, expires_at, lock_until")
    .eq("provider", KIS_PROVIDER)
    .maybeSingle<KisTokenRow>();

  if (error) {
    throw new Error(`kis_tokens 조회 실패: ${error.message}`);
  }

  if (!data?.access_token || !data.expires_at) {
    return null;
  }

  const expiresAt = new Date(data.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + TOKEN_SKEW_MS) {
    return null;
  }

  return data.access_token;
};

const acquireRefreshLock = async (client: SupabaseClient) => {
  const nowIso = new Date().toISOString();
  const lockUntil = new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString();

  const { data, error } = await client
    .from("kis_tokens")
    .update({
      lock_until: lockUntil,
      updated_at: nowIso,
    })
    .eq("provider", KIS_PROVIDER)
    .lt("lock_until", nowIso)
    .select("provider")
    .maybeSingle<{ provider: string }>();

  if (error) {
    throw new Error(`kis_tokens 락 획득 실패: ${error.message}`);
  }

  return Boolean(data?.provider);
};

const releaseRefreshLock = async (client: SupabaseClient) => {
  const { error } = await client
    .from("kis_tokens")
    .update({
      lock_until: RELEASED_LOCK_AT,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", KIS_PROVIDER);

  if (error) {
    throw new Error(`kis_tokens 락 해제 실패: ${error.message}`);
  }
};

const storeIssuedToken = async (
  client: SupabaseClient,
  token: { accessToken: string; issuedAt: string; expiresAt: string }
) => {
  const { error } = await client
    .from("kis_tokens")
    .update({
      access_token: token.accessToken,
      issued_at: token.issuedAt,
      expires_at: token.expiresAt,
      lock_until: RELEASED_LOCK_AT,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", KIS_PROVIDER);

  if (error) {
    throw new Error(`kis_tokens 저장 실패: ${error.message}`);
  }
};

const waitUntilAnotherWorkerStoresToken = async (client: SupabaseClient) => {
  for (let i = 0; i < POLL_RETRY_COUNT; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const token = await readValidToken(client);
    if (token) {
      return token;
    }
  }
  return null;
};

const getAccessTokenFromMemoryFallback = async () => {
  if (memoryTokenCache && memoryTokenCache.expiresAt > Date.now()) {
    return memoryTokenCache.accessToken;
  }

  const issued = await issueKisAccessToken();
  memoryTokenCache = {
    accessToken: issued.accessToken,
    expiresAt: new Date(issued.expiresAt).getTime(),
  };
  return issued.accessToken;
};

const getAccessTokenFromSupabase = async () => {
  const client = getSupabaseAdminClient();
  await ensureTokenRow(client);

  const existingToken = await readValidToken(client);
  if (existingToken) {
    return existingToken;
  }

  const lockAcquired = await acquireRefreshLock(client);
  if (!lockAcquired) {
    const tokenFromAnotherWorker = await waitUntilAnotherWorkerStoresToken(
      client
    );
    if (tokenFromAnotherWorker) {
      return tokenFromAnotherWorker;
    }
    throw new Error("다른 서버에서 토큰 갱신 중이지만 완료되지 않았습니다.");
  }

  try {
    const issuedToken = await issueKisAccessToken();
    await storeIssuedToken(client, issuedToken);
    return issuedToken.accessToken;
  } finally {
    await releaseRefreshLock(client).catch(() => {
      // Best-effort unlock to avoid leaving stale lock state.
    });
  }
};

export const getKisAccessToken = async () => {
  if (requestInFlight) {
    return requestInFlight;
  }

  requestInFlight = (async () => {
    if (!hasSupabaseConfig()) {
      return getAccessTokenFromMemoryFallback();
    }
    return getAccessTokenFromSupabase();
  })();

  try {
    return await requestInFlight;
  } finally {
    requestInFlight = null;
  }
};
