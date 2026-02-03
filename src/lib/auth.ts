function base64UrlEncode(bytes: ArrayBuffer) {
  const str = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string) {
  const enc = new TextEncoder();
  return crypto.subtle.digest("SHA-256", enc.encode(input));
}

function randomString(len = 64) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
  let out = "";
  const arr = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

const DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI;
const LOGOUT_URI = import.meta.env.VITE_COGNITO_LOGOUT_URI;

const TOKEN_KEY = "pa_tokens";
const PKCE_KEY = "pkce_verifier";
const CODE_USED_KEY = "pa_code_used";

export type Tokens = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number; // seconds
  obtained_at: number; // ms epoch
};

type TokenError = {
  error?: string;
  error_description?: string;
};

const AUTH_CHANGED_EVENT = "pa-auth-changed";

function emitAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getTokens(): Tokens | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    return null;
  }
}

export function setTokens(t: Tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
  emitAuthChanged();
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  emitAuthChanged();
}

export function isLoggedIn() {
  return Boolean(getValidTokens());
}

export function getValidTokens(bufferSeconds = 30): Tokens | null {
  const t = getTokens();
  if (!t) return null;

  const expiresAt = t.obtained_at + t.expires_in * 1000;
  const now = Date.now();
  if (now >= expiresAt - bufferSeconds * 1000) return null;

  return t;
}

export async function login() {
  if (!DOMAIN || !CLIENT_ID || !REDIRECT_URI) {
    throw new Error("Missing Cognito env vars (DOMAIN/CLIENT_ID/REDIRECT_URI)");
  }

  sessionStorage.removeItem(CODE_USED_KEY);

  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  localStorage.setItem(PKCE_KEY, verifier);

  const qs = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid email profile",
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  window.location.href = `${DOMAIN}/oauth2/authorize?${qs.toString()}`;
}

export async function handleAuthCallback(code: string) {
  if (!DOMAIN || !CLIENT_ID || !REDIRECT_URI) {
    throw new Error("Missing Cognito env vars (DOMAIN/CLIENT_ID/REDIRECT_URI)");
  }

  if (sessionStorage.getItem(CODE_USED_KEY) === "1") {
    return;
  }

  if (getTokens()) {
    sessionStorage.setItem(CODE_USED_KEY, "1");
    localStorage.removeItem(PKCE_KEY);
    return;
  }

  const verifier = localStorage.getItem(PKCE_KEY);
  if (!verifier) throw new Error("Missing PKCE verifier");

  sessionStorage.setItem(CODE_USED_KEY, "1");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch(`${DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    let extra = "";
    try {
      const errJson = (await res.json()) as TokenError;
      extra = errJson?.error_description
        ? ` - ${errJson.error}: ${errJson.error_description}`
        : errJson?.error
        ? ` - ${errJson.error}`
        : "";
    } catch {
      // ignore
    }

    sessionStorage.removeItem(CODE_USED_KEY);
    throw new Error(`Token exchange failed: ${res.status}${extra}`);
  }

  const json = await res.json();

  setTokens({
    ...json,
    obtained_at: Date.now(),
  });

  localStorage.removeItem(PKCE_KEY);
}

export function logout() {
  clearTokens();

  localStorage.removeItem(PKCE_KEY);
  sessionStorage.removeItem(CODE_USED_KEY);

  if (!DOMAIN || !CLIENT_ID || !LOGOUT_URI) {
    return;
  }

  const qs = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: LOGOUT_URI,
  });

  window.location.href = `${DOMAIN}/logout?${qs.toString()}`;
}

function base64UrlDecode(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

export function getUserSub(): string | null {
  const t = getTokens();
  const jwt = t?.id_token || t?.access_token;
  if (!jwt) return null;

  try {
    const payload = jwt.split(".")[1];
    const json = JSON.parse(base64UrlDecode(payload));
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

export const AUTH_CHANGED = AUTH_CHANGED_EVENT;
