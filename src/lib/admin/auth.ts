import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  AdminRole,
  adminSessionCookie,
  verifyAdminSessionCookie,
} from "@/lib/security/admin-session";
import { getClientIp } from "@/lib/security/rate-limit";

const allowedRoles = new Set<AdminRole>(["owner", "admin"]);

export class AdminAuthError extends Error {
  status: number;

  constructor(message = "Admin access required.", status = 401) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

export async function requireAdmin(request: NextRequest) {
  const session = await verifyAdminSessionCookie(
    request.cookies.get(adminSessionCookie)?.value
  );

  if (!session || !allowedRoles.has(session.role)) {
    throw new AdminAuthError();
  }

  const supabase = createSupabaseAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(
    session.accessToken
  );

  if (userError || userData.user?.id !== session.userId) {
    await auditAdminEvent(request, "failed_admin_api_access", {
      reason: "invalid_supabase_session",
    });
    throw new AdminAuthError();
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("id,role,active")
    .eq("id", session.adminUserId)
    .eq("auth_user_id", session.userId)
    .eq("active", true)
    .maybeSingle();

  const role = String(adminUser?.role || "") as AdminRole;

  if (adminError || !adminUser || !allowedRoles.has(role)) {
    await auditAdminEvent(request, "failed_admin_api_access", {
      reason: adminError?.message || "inactive_or_unauthorized_admin",
    });
    throw new AdminAuthError();
  }

  return {
    userId: session.userId,
    adminUserId: adminUser.id as number | string,
    role,
    supabase,
  };
}

export async function auditAdminEvent(
  request: NextRequest,
  eventType: string,
  metadata: Record<string, unknown> = {}
) {
  const session = await verifyAdminSessionCookie(
    request.cookies.get(adminSessionCookie)?.value
  );
  const supabase = createSupabaseAdminClient();

  await supabase.from("security_audit_logs").insert({
    event_type: eventType,
    actor_user_id: session?.userId || null,
    actor_admin_user_id: session?.adminUserId || null,
    ip_address: getClientIp(request.headers),
    user_agent: request.headers.get("user-agent"),
    metadata,
  });
}

export function adminAuthErrorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: error.status }
    );
  }

  return null;
}
