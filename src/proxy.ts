import { NextResponse, type NextRequest } from "next/server";
import {
  AdminSession,
  adminSessionCookie,
  verifyAdminSessionCookie,
} from "@/lib/security/admin-session";

const allowedRoles = new Set(["owner", "admin"]);

async function auditFailedAdminAccess(request: NextRequest, reason: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return;

  await fetch(`${supabaseUrl}/rest/v1/security_audit_logs`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      event_type: "failed_admin_access",
      resource_type: "admin_route",
      resource_id: request.nextUrl.pathname,
      ip_address:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        request.headers.get("cf-connecting-ip"),
      user_agent: request.headers.get("user-agent"),
      metadata: { reason },
    }),
  }).catch(() => undefined);
}

async function verifyLiveAdminAccess(session: AdminSession) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey || !allowedRoles.has(session.role)) {
    return false;
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!userResponse?.ok) return false;

  const user = (await userResponse.json().catch(() => null)) as {
    id?: string;
  } | null;

  if (user?.id !== session.userId) return false;

  const adminUrl = new URL(`${supabaseUrl}/rest/v1/admin_users`);
  adminUrl.searchParams.set("select", "id,role,active");
  adminUrl.searchParams.set("auth_user_id", `eq.${session.userId}`);
  adminUrl.searchParams.set("active", "eq.true");
  adminUrl.searchParams.set("limit", "1");

  const adminResponse = await fetch(adminUrl, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!adminResponse?.ok) return false;

  const rows = (await adminResponse.json().catch(() => [])) as Array<{
    id?: number | string;
    role?: string;
    active?: boolean;
  }>;
  const admin = rows[0];

  return Boolean(
    admin &&
      String(admin.id) === String(session.adminUserId) &&
      admin.active === true &&
      allowedRoles.has(String(admin.role))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const session = await verifyAdminSessionCookie(
    request.cookies.get(adminSessionCookie)?.value
  );

  if (session && (await verifyLiveAdminAccess(session))) {
    return NextResponse.next();
  }

  await auditFailedAdminAccess(request, session ? "admin_verification_failed" : "missing_session");

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
