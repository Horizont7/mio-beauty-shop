"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GuardState = "checking" | "allowed" | "denied";

const adminRoles = ["owner", "admin", "manager", "operator"];

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

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        if (active) {
          setState("denied");
          document.cookie = "mio-admin-auth=; path=/admin; max-age=0; samesite=lax";
          router.replace("/admin/login");
        }
        return;
      }

      const { data, error } = await supabase
        .from("admin_users")
        .select("id,role,active")
        .eq("auth_user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      const allowed =
        !error && data && adminRoles.includes(String(data.role || ""));

      if (!active) return;

      if (!allowed) {
        setState("denied");
        await supabase.auth.signOut();
        document.cookie = "mio-admin-auth=; path=/admin; max-age=0; samesite=lax";
        router.replace("/admin/login");
        return;
      }

      setState("allowed");
    }

    void verifyAdmin();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void verifyAdmin();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
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
