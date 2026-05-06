import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, User, Shield, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { t } from "@/lib/i18n";

export function MobileBottomNav() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return null;

  const items: { to: any; label: string; icon: any; match: (p: string) => boolean }[] = [
    { to: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, match: (p) => p === "/dashboard" || p === "/" },
    { to: "/groups", label: t.nav.groups, icon: Users, match: (p) => p.startsWith("/groups") },
    { to: "/leaderboard", label: t.nav.leaderboard, icon: Trophy, match: (p) => p.startsWith("/leaderboard") },
    { to: "/profile", label: t.nav.profile, icon: User, match: (p) => p.startsWith("/profile") },
  ];
  if (isAdmin) {
    items.push({ to: "/admin", label: t.nav.admin, icon: Shield, match: (p) => p.startsWith("/admin") });
  }

  return (
    <>
      {/* spacer so content isn't covered */}
      <div className="h-16 sm:hidden" aria-hidden />
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl shadow-elegant sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around">
          {items.map((it) => {
            const active = it.match(pathname);
            const Icon = it.icon;
            return (
              <li key={it.label} className="flex-1">
                <Link
                  to={it.to}
                  className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition-all ${
                      active ? "bg-primary/15" : ""
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={active ? 2.5 : 2} />
                  </span>
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
