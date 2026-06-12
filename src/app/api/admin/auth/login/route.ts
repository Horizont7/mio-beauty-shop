import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  AdminRole,
  adminSessionCookie,
  adminSessionMaxAgeSeconds,
  createAdminSession,
  sealAdminSession,
} from "@/lib/security/admin-session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const allowedRoles = new Set<AdminRole>(["owner", "admin"]);

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = checkRateLimit({
    key: `admin-login:${ip}`,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts." },
      { status: 429 }
    );
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "JSON body required." }, { status: 415 });
  }

  const body = (await request.json().catch(() => null)) as {
    accessToken?: unknown;
  } | null;
  const accessToken =
    typeof body?.accessToken === "string" ? body.accessToken.trim() : "";

  if (!accessToken) {
    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("id,role,active")
    .eq("auth_user_id", userData.user.id)
    .eq("active", true)
    .maybeSingle();

  const role = String(adminUser?.role || "") as AdminRole;

  if (adminError || !adminUser || !allowedRoles.has(role)) {
    await supabase.from("security_audit_logs").insert({
      event_type: "admin_login_denied",
      actor_user_id: userData.user.id,
      ip_address: ip,
      user_agent: request.headers.get("user-agent"),
      metadata: { reason: adminError?.message || "not_admin" },
    });

    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 403 });
  }

  const token = await sealAdminSession(
    createAdminSession({
      userId: userData.user.id,
      adminUserId: adminUser.id,
      role,
      accessToken,
    })
  );
  const response = NextResponse.json({ ok: true, role });

  response.cookies.set(adminSessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionMaxAgeSeconds(),
  });
  response.cookies.set(adminSessionCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 0,
  });

  await supabase.from("security_audit_logs").insert({
    event_type: "admin_login",
    actor_user_id: userData.user.id,
    actor_admin_user_id: adminUser.id,
    ip_address: ip,
    user_agent: request.headers.get("user-agent"),
    metadata: { role },
  });

  return response;
}
