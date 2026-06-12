import { NextRequest, NextResponse } from "next/server";
import { adminSessionCookie, verifyAdminSessionCookie } from "@/lib/security/admin-session";

export async function GET(request: NextRequest) {
  const session = await verifyAdminSessionCookie(
    request.cookies.get(adminSessionCookie)?.value
  );

  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    role: session.role,
    expiresAt: session.expiresAt,
  });
}
