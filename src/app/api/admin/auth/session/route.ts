import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    return NextResponse.json({
      ok: true,
      role: admin.role,
    });
  } catch (error) {
    return adminAuthErrorResponse(error) || NextResponse.json({ ok: false }, { status: 500 });
  }
}
