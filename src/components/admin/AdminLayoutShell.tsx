"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/products/import-images", label: "Import Images" },
  { href: "/admin/video-highlights", label: "Video Highlights" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/order-items", label: "Order Items" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/delivery-settings", label: "Delivery" },
  { href: "/admin/payment-settings", label: "Payments" },
  { href: "/admin/site-settings", label: "Site settings" },
  { href: "/admin/users", label: "Admin users" },
];

export default function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function signOut() {
    await supabase.auth.signOut();
    document.cookie = "mio-admin-auth=; path=/admin; max-age=0; samesite=lax";
    window.location.href = "/admin/login";
  }

  return (
    <div className="min-h-screen bg-[#f7f4f2] lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-[#1f1d1c] text-white shadow-2xl lg:flex lg:flex-col">
        <div className="border-b border-white/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#EEA391]">
            MIO Beauty
          </p>
          <h1 className="mt-2 text-2xl font-bold">Admin panel</h1>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/75 transition hover:border-[#EEA391] hover:text-white"
          >
            Sign out
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === item.href
                : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-[#EEA391] text-white shadow-lg shadow-[#EEA391]/20"
                    : "text-white/75 hover:bg-[#EEA391] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mb-5 rounded-[24px] border border-white bg-white px-5 py-4 shadow-sm lg:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B96C5C]">
            MIO Beauty admin
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Use desktop width for the full sidebar navigation.
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
