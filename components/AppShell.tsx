"use client";

// Dashboard shell (docs/design.md §3, Agriculture): 1024+ px left sidebar
// 240 px; 640–1023 top bar; under 640 top bar + bottom nav with 4 items
// (Dashboard, Ponds, Market, Weather — Settings lives in the top bar, so the
// phone nav never exceeds four). Active item = accent colour + aria-current.
// Footer line from docs/00-global.md §1: "Decision-support tool. You decide."

import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  CloudIcon,
  FishIcon,
  GearIcon,
  HomeIcon,
  LogoutIcon,
  TrendIcon,
  WavesIcon,
} from "./icons";
import { logout } from "@/lib/actions/auth";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

/// The five destinations. The phone bottom nav shows the first four; the
/// desktop sidebar shows all five.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/ponds", label: "Ponds", icon: WavesIcon },
  { href: "/market", label: "Market", icon: TrendIcon },
  { href: "/weather", label: "Weather", icon: CloudIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

const BOTTOM_NAV = NAV_ITEMS.slice(0, 4);

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavItemLink({ item, pathname, variant }: { item: NavItem; pathname: string; variant: "sidebar" | "top" | "bottom" }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  if (variant === "bottom") {
    return (
      <a
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${
          active ? "text-accent" : "text-muted"
        }`}
      >
        <Icon className="h-6 w-6" />
        {item.label}
      </a>
    );
  }
  return (
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-input px-3 py-2.5 font-medium ${
        active ? "bg-accent text-white" : "text-text hover:bg-bg"
      }`}
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </a>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop: left sidebar, 240 px (design.md §3). */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-2 px-4 py-5">
          <FishIcon className="h-6 w-6 text-accent" />
          <span className="text-lg font-semibold">PondScale</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavItemLink key={item.href} item={item} pathname={pathname} variant="sidebar" />
          ))}
        </nav>
        <form action={logout} className="border-t border-border p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-input px-3 py-2.5 font-medium text-muted hover:bg-bg"
          >
            <LogoutIcon className="h-5 w-5" />
            Log out
          </button>
        </form>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Phone + tablet: top bar (design.md §3). */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <a href="/" className="flex items-center gap-2">
            <FishIcon className="h-6 w-6 text-accent" />
            <span className="text-lg font-semibold">PondScale</span>
          </a>
          <div className="flex items-center gap-1">
            <a
              href="/settings"
              aria-current={isActive(pathname, "/settings") ? "page" : undefined}
              className={`flex h-12 items-center gap-2 rounded-input px-3 font-medium ${
                isActive(pathname, "/settings") ? "bg-accent text-white" : "text-muted"
              }`}
            >
              <GearIcon className="h-5 w-5" />
              Settings
            </a>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Log out"
                className="flex h-12 w-12 items-center justify-center rounded-input text-muted hover:bg-bg"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
        </header>

        {/* Content: max width 1280, 12-column grid on desktop. */}
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 pb-24 sm:px-6 lg:py-8 lg:pb-8">
          {children}
        </main>

        <footer className="border-t border-border px-4 py-4 text-center text-sm text-muted lg:pb-4">
          Decision-support tool. You decide.
        </footer>

        {/* Phone only: bottom nav, 4 items (design.md §3). */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {BOTTOM_NAV.map((item) => (
            <NavItemLink key={item.href} item={item} pathname={pathname} variant="bottom" />
          ))}
        </nav>
      </div>
    </div>
  );
}
