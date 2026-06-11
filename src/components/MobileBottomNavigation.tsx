"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCommerce } from "@/lib/commerce";
import { useLanguage } from "@/lib/language";

const navItems = [
  { href: "/", key: "home" as const, mark: "H" },
  { href: "/catalog/categories", key: "catalog" as const, mark: "C" },
  { href: "/catalog/products", key: "search" as const, mark: "S" },
  { href: "/cart", key: "cart" as const, mark: "B" },
  { href: "/profile", key: "profile" as const, mark: "P" },
];

export default function MobileBottomNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { cartCount, favoritesCount } = useCommerce();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#f3cfc4] bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-18px_45px_rgba(180,118,103,0.14)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition ${
                active
                  ? "bg-[#fff0eb] text-[#b97667]"
                  : "text-[var(--brand-muted)] hover:bg-[#fff0eb] hover:text-[#b97667]"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
                  active
                    ? "bg-[#EEA391] text-white"
                    : "bg-[#ffe7de] text-[#b97667]"
                }`}
              >
                {item.mark}
              </span>
              <span>{t(item.key)}</span>
              {active && (
                <span className="absolute left-1/2 top-1 h-1 w-5 -translate-x-1/2 rounded-full bg-[#EEA391]" />
              )}
              {item.href === "/cart" && cartCount > 0 && (
                <span className="absolute right-4 top-1 h-4 min-w-4 rounded-full bg-[#EEA391] px-1 text-center text-[9px] leading-4 text-white">
                  {cartCount}
                </span>
              )}
              {item.href === "/profile" && favoritesCount > 0 && (
                <span className="absolute right-4 top-1 h-4 min-w-4 rounded-full bg-[#211f1e] px-1 text-center text-[9px] leading-4 text-white">
                  {favoritesCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
