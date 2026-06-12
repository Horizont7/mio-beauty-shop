import { NextResponse, type NextRequest } from "next/server";
import {
  adminSessionCookie,
  verifyAdminSessionCookie,
} from "@/lib/security/admin-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const session = await verifyAdminSessionCookie(
    request.cookies.get(adminSessionCookie)?.value
  );

  if (session) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
