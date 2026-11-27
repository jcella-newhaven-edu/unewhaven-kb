import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection, NextResponse, type NextRequest } from "next/server";
import * as oidc from "openid-client";
import { queryRows } from "@/lib/postgres";

export type AdminSession = {
  id: string;
  displayName: string;
  email: string | null;
  role: "admin" | "editor";
};

type AdminAuthSettings = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  issuer: URL;
  origin: string;
  callbackUrl: string;
  secure: boolean;
};

type SignInTransaction = {
  nonce: string;
  codeVerifier: string;
};

const idPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const transactionLifetime = 10 * 60;
const sessionLifetime = 60 * 60;
const responseHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

function readSettings(): AdminAuthSettings | null {
  const tenantId = process.env.ENTRA_TENANT_ID?.trim().toLowerCase();
  const clientId = process.env.ENTRA_CLIENT_ID?.trim().toLowerCase();
  const clientSecret = process.env.ENTRA_CLIENT_SECRET;
  const configuredOrigin = process.env.ADMIN_ORIGIN?.trim();
  if (!tenantId || !clientId || !clientSecret?.trim() || !configuredOrigin) return null;
  if (!idPattern.test(tenantId) || !idPattern.test(clientId)) return null;

  let url: URL;
  try {
    url = new URL(configuredOrigin);
  } catch {
    return null;
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
  const secure = url.protocol === "https:";
  const loopback = url.hostname === "localhost" || url.hostname === "[::1]" || /^127\.\d+\.\d+\.\d+$/.test(url.hostname);
  if (!secure && (url.protocol !== "http:" || !loopback)) return null;

  return {
    tenantId,
    clientId,
    clientSecret,
    issuer: new URL(`https://login.microsoftonline.com/${tenantId}/v2.0`),
    origin: url.origin,
    callbackUrl: new URL("/api/admin/auth/callback", url.origin).href,
    secure,
  };
}

export function isAdminAuthConfigured(): boolean {
  return readSettings() !== null;
}

export function isAdminOrigin(request: Request): boolean {
  return request.headers.get("origin") === readSettings()?.origin;
}

function cookieName(settings: AdminAuthSettings, kind: "session" | "sign-in"): string {
  return `${settings.secure ? "__Host-" : ""}kb-admin-${kind}`;
}

function cookieOptions(settings: AdminAuthSettings) {
  return { httpOnly: true, secure: settings.secure, sameSite: "lax" as const, path: "/" };
}

function digest(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

function validCookie(token: string | undefined): token is string {
  return token !== undefined && tokenPattern.test(token);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const settings = readSettings();
  if (!settings) return null;
  const token = cookieStore.get(cookieName(settings, "session"))?.value;
  if (!validCookie(token)) return null;

  const [session] = await queryRows<AdminSession>(
    `SELECT a.id, a.display_name AS "displayName", a.email, a.role
       FROM admin_sessions s
       JOIN admin_accounts a ON a.id = s.account_id
      WHERE s.token_hash = $1 AND a.tenant_id = $2 AND s.role = a.role AND s.expires_at > NOW()`,
    [digest(token), settings.tenantId],
  );
  return session ?? null;
}

let providerPromise: Promise<oidc.Configuration> | undefined;

function getProvider(settings: AdminAuthSettings): Promise<oidc.Configuration> {
  if (!providerPromise) {
    providerPromise = oidc.discovery(settings.issuer, settings.clientId, settings.clientSecret)
      .then((configuration) => {
        oidc.enableNonRepudiationChecks(configuration);
        return configuration;
      })
      .catch((error: unknown) => {
        providerPromise = undefined;
        throw error;
      });
  }
  return providerPromise;
}

function redirect(location: string): NextResponse {
  return new NextResponse(null, {
    status: 303,
    headers: { ...responseHeaders, Location: location },
  });
}

function signInRedirect(error?: "sign-in" | "access-denied"): NextResponse {
  return redirect(error ? `/admin?error=${error}` : "/admin");
}

function clearCookie(
  response: NextResponse,
  settings: AdminAuthSettings,
  kind: "session" | "sign-in",
): void {
  response.cookies.set(cookieName(settings, kind), "", { ...cookieOptions(settings), maxAge: 0 });
}

export async function startAdminSignIn(): Promise<NextResponse> {
  // Standalone images can be built before Entra environment variables are supplied.
  await connection();
  const settings = readSettings();
  if (!settings) return signInRedirect("sign-in");

  try {
    const provider = await getProvider(settings);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const challenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const destination = oidc.buildAuthorizationUrl(provider, {
      redirect_uri: settings.callbackUrl,
      response_type: "code",
      response_mode: "query",
      scope: "openid profile email",
      code_challenge: challenge,
      code_challenge_method: "S256",
      nonce,
      state,
    });

    await queryRows(
      `WITH expired AS (DELETE FROM admin_oidc_transactions WHERE expires_at <= NOW())
       INSERT INTO admin_oidc_transactions (state_hash, nonce, code_verifier, expires_at)
       VALUES ($1, $2, $3, NOW() + $4 * INTERVAL '1 second')`,
      [digest(state), nonce, codeVerifier, transactionLifetime],
    );

    const response = redirect(destination.href);
    response.cookies.set(cookieName(settings, "sign-in"), state, {
      ...cookieOptions(settings),
      maxAge: transactionLifetime,
    });
    return response;
  } catch {
    console.warn("Could not start admin sign-in.");
    return signInRedirect("sign-in");
  }
}

function grantRole(roles: unknown): AdminSession["role"] | null {
  if (!Array.isArray(roles)) return null;
  if (roles.includes("KB.Admin")) return "admin";
  if (roles.includes("KB.Editor")) return "editor";
  return null;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function revokeAccountSessions(tenantId: string, objectId: string): Promise<void> {
  await queryRows(
    `DELETE FROM admin_sessions s USING admin_accounts a
      WHERE s.account_id = a.id AND a.tenant_id = $1 AND a.object_id = $2`,
    [tenantId, objectId],
  );
}

export async function finishAdminSignIn(request: NextRequest): Promise<NextResponse> {
  await connection();
  const settings = readSettings();
  if (!settings) return signInRedirect("sign-in");

  // Use the registered callback URI even when the app is behind a reverse proxy.
  const callback = new URL(settings.callbackUrl);
  callback.search = request.nextUrl.search;
  const state = request.cookies.get(cookieName(settings, "sign-in"))?.value;
  if (!validCookie(state) || callback.searchParams.get("state") !== state) return signInRedirect("sign-in");

  let response: NextResponse;
  try {
    const [transaction] = await queryRows<SignInTransaction>(
      `DELETE FROM admin_oidc_transactions
        WHERE state_hash = $1 AND expires_at > NOW()
        RETURNING nonce, code_verifier AS "codeVerifier"`,
      [digest(state)],
    );
    response = transaction
      ? await grantAdminSession(request, settings, callback, state, transaction)
      : signInRedirect("sign-in");
  } catch {
    console.warn("Could not finish admin sign-in.");
    response = signInRedirect("sign-in");
  }
  clearCookie(response, settings, "sign-in");
  return response;
}

async function grantAdminSession(
  request: NextRequest,
  settings: AdminAuthSettings,
  callback: URL,
  state: string,
  transaction: SignInTransaction,
): Promise<NextResponse> {
  const provider = await getProvider(settings);
  const tokens = await oidc.authorizationCodeGrant(provider, callback, {
    pkceCodeVerifier: transaction.codeVerifier,
    expectedNonce: transaction.nonce,
    expectedState: state,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (
    !claims ||
    claims.iss !== settings.issuer.href ||
    claims.aud !== settings.clientId ||
    claims.tid !== settings.tenantId ||
    typeof claims.oid !== "string" ||
    !idPattern.test(claims.oid)
  ) {
    return signInRedirect("sign-in");
  }

  const now = Date.now();
  const expiresAt = new Date(Math.min(now + sessionLifetime * 1000, claims.exp * 1000));
  const maxAge = Math.floor((expiresAt.getTime() - now) / 1000);
  if (!Number.isSafeInteger(claims.exp) || !Number.isFinite(maxAge) || maxAge <= 0) return signInRedirect("sign-in");

  const role = grantRole(claims.roles);
  if (!role) {
    await revokeAccountSessions(settings.tenantId, claims.oid);
    return signInRedirect("access-denied");
  }

  const email = optionalText(claims.email) ?? optionalText(claims.preferred_username);
  const displayName = optionalText(claims.name) ?? email ?? "Knowledge base editor";
  const token = randomBytes(32).toString("base64url");
  const previousToken = request.cookies.get(cookieName(settings, "session"))?.value;

  await queryRows(
    `WITH account AS (
       INSERT INTO admin_accounts (tenant_id, object_id, display_name, email, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, object_id) DO UPDATE SET
         display_name = EXCLUDED.display_name, email = EXCLUDED.email, role = EXCLUDED.role, last_login_at = NOW()
       RETURNING id
     ), old_sessions AS (
       DELETE FROM admin_sessions
       WHERE expires_at <= NOW()
          OR token_hash = $7
          OR (account_id = (SELECT id FROM account) AND role <> $5)
     )
     INSERT INTO admin_sessions (token_hash, account_id, role, expires_at)
     SELECT $6, id, $5, $8 FROM account`,
    [
      settings.tenantId,
      claims.oid,
      displayName,
      email,
      role,
      digest(token),
      validCookie(previousToken) ? digest(previousToken) : null,
      expiresAt,
    ],
  );

  const response = signInRedirect();
  response.cookies.set(cookieName(settings, "session"), token, {
    ...cookieOptions(settings),
    expires: expiresAt,
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
  return response;
}

export async function signOutAdmin(request: NextRequest): Promise<NextResponse> {
  const settings = readSettings();
  if (!settings || request.headers.get("origin") !== settings.origin) {
    return new NextResponse(null, { status: 403, headers: responseHeaders });
  }

  const token = request.cookies.get(cookieName(settings, "session"))?.value;
  if (validCookie(token)) {
    await queryRows("DELETE FROM admin_sessions WHERE token_hash = $1", [digest(token)]);
  }

  const response = signInRedirect();
  clearCookie(response, settings, "session");
  return response;
}
