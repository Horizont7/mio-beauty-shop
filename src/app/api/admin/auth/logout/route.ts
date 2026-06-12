import { NextRequest, NextResponse } from "next/server";
import { adminSessionCookie, verifyAdminSessionCookie } from "@/lib/security/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getClientIp } from "@/lib/security/rate-limit";
import { requireAdmin } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    // Logout must still clear stale HttpOnly admin cookies.
  }

  const session = await verifyAdminSessionCookie(request.cookies.get(adminSessionCookie)?.value);
  const response = NextResponse.json({ ok: true });

  response.cookies.set(adminSessionCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(adminSessionCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 0,
  });

  if (session) {
    const supabase = createSupabaseAdminClient();
    await supabase.from("security_audit_logs").insert({
      event_type: "admin_logout",
      actor_user_id: session.userId,
      actor_admin_user_id: session.adminUserId,
      ip_address: getClientIp(request.headers),
      user_agent: request.headers.get("user-agent"),
      metadata: { role: session.role },
    });
  }

  return response;
}
