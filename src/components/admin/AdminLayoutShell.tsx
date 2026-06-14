"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminLink = {
  href: string;
  label: string;
};

type TopNavItem = {
  label: string;
  href?: string;
  links?: AdminLink[];
};

const topNavItems: TopNavItem[] = [
  { label: "Главная", href: "/admin" },
  {
    label: "Продажи",
    links: [
      { href: "/admin/orders", label: "Заказы" },
      { href: "/admin/order-items", label: "Позиции заказов" },
    ],
  },
  {
    label: "Склад",
    links: [
      { href: "/admin/products", label: "Товары" },
      { href: "/admin/categories", label: "Категории" },
      { href: "/admin/brands", label: "Бренды" },
      { href: "/admin/products/import-images", label: "Импорт изображений" },
    ],
  },
  {
    label: "Финансы",
    links: [
      { href: "/admin/payment-settings", label: "Платежи" },
      { href: "/admin/delivery-settings", label: "Доставка" },
    ],
  },
  {
    label: "Клиенты",
    links: [
      { href: "/admin/customers", label: "Клиенты" },
      { href: "/admin/reviews", label: "Отзывы" },
    ],
  },
  {
    label: "Маркетинг",
    links: [
      { href: "/admin/promotions", label: "Акции" },
      { href: "/admin/banners", label: "Баннеры" },
      { href: "/admin/video-highlights", label: "Видео" },
    ],
  },
  {
    label: "Контент",
    links: [
      { href: "/admin/banners", label: "Баннеры" },
      { href: "/admin/video-highlights", label: "Видео-подборки" },
    ],
  },
  {
    label: "Справочники",
    links: [{ href: "/admin/site-settings", label: "Настройки сайта" }],
  },
  {
    label: "Настройки",
    links: [
      { href: "/admin/users", label: "Администраторы" },
      { href: "/admin/security", label: "Безопасность" },
    ],
  },
];

const searchableLinks: AdminLink[] = Array.from(
  new Map(
    [
      { href: "/admin", label: "Главная" },
      ...topNavItems.flatMap((item) => item.links ?? []),
    ].map((link) => [link.href, link]),
  ).values(),
);

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 20c.7-3.6 3.1-5.5 7-5.5s6.3 1.9 7 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function signOut() {
    await fetch("/api/admin/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  }

  function isRouteActive(href: string) {
    return href === "/admin" ? pathname === href : pathname.startsWith(href);
  }

  function isGroupActive(item: TopNavItem) {
    return item.href
      ? isRouteActive(item.href)
      : item.links?.some((link) => isRouteActive(link.href));
  }

  function closeNavigation() {
    setOpenMenu(null);
    setSearchOpen(false);
    setSearchQuery("");
  }

  const filteredSearchLinks = searchQuery.trim()
    ? searchableLinks.filter((link) =>
        link.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : searchableLinks;

  return (
    <div ref={shellRef} className="min-h-screen bg-[#f7f4f2] pt-[68px]">
      <header className="fixed inset-x-0 top-0 z-50 h-[68px] border-b border-white/10 bg-[#211e1d] text-white shadow-[0_8px_30px_rgba(40,24,20,0.16)]">
        <div className="flex h-full items-center px-4 lg:px-5">
          <Link href="/admin" className="group flex shrink-0 items-center gap-3 pr-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEA391] text-sm font-black tracking-tight text-[#211e1d] shadow-lg shadow-[#EEA391]/15 transition group-hover:bg-[#f5b09f]">
              M
            </span>
            <span className="hidden leading-none xl:block">
              <span className="block text-[13px] font-extrabold tracking-[0.18em]">MIO BEAUTY</span>
              <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.24em] text-white/45">
                Admin ERP
              </span>
            </span>
          </Link>

          <nav className="hidden h-full min-w-0 flex-1 items-center gap-0.5 overflow-visible lg:flex" aria-label="Основная навигация">
            {topNavItems.map((item) => {
              const active = isGroupActive(item);

              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeNavigation}
                    className={`flex h-full shrink-0 items-center border-b-2 px-2.5 text-[13px] font-semibold transition 2xl:px-3.5 ${
                      active
                        ? "border-[#EEA391] bg-white/[0.06] text-white"
                        : "border-transparent text-white/68 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }

              const menuOpen = openMenu === item.label;
              return (
                <div key={item.label} className="relative h-full shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(menuOpen ? null : item.label)}
                    className={`flex h-full items-center gap-1 border-b-2 px-2.5 text-[13px] font-semibold transition 2xl:px-3.5 ${
                      active || menuOpen
                        ? "border-[#EEA391] bg-white/[0.06] text-white"
                        : "border-transparent text-white/68 hover:bg-white/[0.05] hover:text-white"
                    }`}
                    aria-expanded={menuOpen}
                  >
                    {item.label}
                    <ChevronDownIcon />
                  </button>
                  {menuOpen && (
                    <div className="absolute left-0 top-[calc(100%+8px)] min-w-56 overflow-hidden rounded-2xl border border-[#eadbd6] bg-white p-2 text-[#302827] shadow-[0_18px_50px_rgba(44,29,25,0.22)]">
                      {item.links?.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={closeNavigation}
                          className={`block rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                            isRouteActive(link.href)
                              ? "bg-[#fff0eb] text-[#a85343]"
                              : "text-[#554b48] hover:bg-[#fff4f0] hover:text-[#a85343]"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setOpenMenu(null);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Поиск"
                aria-expanded={searchOpen}
              >
                <SearchIcon />
              </button>
              {searchOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-80 rounded-2xl border border-[#eadbd6] bg-white p-3 text-[#302827] shadow-[0_18px_50px_rgba(44,29,25,0.22)]">
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && filteredSearchLinks[0]) {
                        router.push(filteredSearchLinks[0].href);
                      }
                    }}
                    placeholder="Найти раздел..."
                    className="w-full rounded-xl border border-[#eadbd6] bg-[#fbf8f7] px-4 py-2.5 text-sm outline-none transition placeholder:text-[#9b8e89] focus:border-[#EEA391] focus:ring-2 focus:ring-[#EEA391]/20"
                  />
                  <div className="mt-2 max-h-72 overflow-y-auto">
                    {filteredSearchLinks.slice(0, 8).map((link) => (
                      <Link
                        key={`${link.href}-${link.label}`}
                        href={link.href}
                        onClick={closeNavigation}
                        className="block rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#554b48] transition hover:bg-[#fff4f0] hover:text-[#a85343]"
                      >
                        {link.label}
                      </Link>
                    ))}
                    {filteredSearchLinks.length === 0 && (
                      <p className="px-3 py-5 text-center text-sm text-[#8d817c]">Раздел не найден</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(openMenu === "notifications" ? null : "notifications");
                  setSearchOpen(false);
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Уведомления"
              >
                <BellIcon />
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#EEA391] ring-2 ring-[#211e1d]" />
              </button>
              {openMenu === "notifications" && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-72 rounded-2xl border border-[#eadbd6] bg-white p-4 text-[#302827] shadow-[0_18px_50px_rgba(44,29,25,0.22)]">
                  <p className="text-sm font-bold">Уведомления</p>
                  <p className="mt-3 rounded-xl bg-[#fbf8f7] px-4 py-5 text-center text-sm text-[#8d817c]">
                    Новых уведомлений нет
                  </p>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(openMenu === "profile" ? null : "profile");
                  setSearchOpen(false);
                }}
                className="flex h-10 items-center gap-2 rounded-xl px-2 text-white/75 transition hover:bg-white/10 hover:text-white"
                aria-label="Профиль администратора"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEA391]/18 text-[#f5b09f]">
                  <UserIcon />
                </span>
                <span className="hidden text-left 2xl:block">
                  <span className="block text-xs font-bold">Администратор</span>
                  <span className="mt-0.5 block text-[10px] text-white/45">MIO Beauty</span>
                </span>
                <span className="hidden 2xl:block"><ChevronDownIcon /></span>
              </button>
              {openMenu === "profile" && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-56 overflow-hidden rounded-2xl border border-[#eadbd6] bg-white p-2 text-[#302827] shadow-[0_18px_50px_rgba(44,29,25,0.22)]">
                  <div className="border-b border-[#eee4e0] px-3.5 py-3">
                    <p className="text-sm font-bold">Администратор</p>
                    <p className="mt-0.5 text-xs text-[#8d817c]">Панель управления</p>
                  </div>
                  <Link href="/admin/users" onClick={closeNavigation} className="mt-2 block rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#554b48] transition hover:bg-[#fff4f0] hover:text-[#a85343]">
                    Мой профиль
                  </Link>
                  <Link href="/admin/security" onClick={closeNavigation} className="block rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#554b48] transition hover:bg-[#fff4f0] hover:text-[#a85343]">
                    Настройки
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="mt-1 w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-[#b24f3e] transition hover:bg-[#fff0eb]"
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-68px)] p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
