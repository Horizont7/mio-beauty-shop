"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type GuardState = "checking" | "allowed" | "denied";

export default function AdminAuthGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [state, setState] = useState<GuardState>(() =>
    isLoginPage ? "allowed" : "checking"
  );

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let active = true;

    async function verifyAdmin() {
      setState("checking");

      const response = await fetch("/api/admin/auth/session", {
        cache: "no-store",
      });
      const allowed = response.ok;

      if (!active) return;

      if (!allowed) {
        setState("denied");
        router.replace("/admin/login");
        return;
      }

      setState("allowed");
    }

    void verifyAdmin();

    return () => {
      active = false;
    };
  }, [isLoginPage, router]);

  if (isLoginPage || state === "allowed") {
    return children;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4f2] p-6">
      <div className="max-w-md rounded-[28px] bg-white p-8 text-center shadow-[0_24px_90px_rgba(45,45,45,0.08)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B96C5C]">
          MIO Beauty admin
        </p>
        <h1 className="mt-3 text-2xl font-bold text-gray-950">
          {state === "checking" ? "Checking access..." : "Admin access required"}
        </h1>
        {state === "denied" && (
          <Link
            href="/admin/login"
            className="mt-5 inline-flex rounded-full bg-[#EEA391] px-5 py-3 text-sm font-bold text-white"
          >
            Go to login
          </Link>
        )}
      </div>
    </main>
  );
}
