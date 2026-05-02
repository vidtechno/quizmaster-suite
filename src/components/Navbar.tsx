import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useAuthModal } from "@/components/AuthModal";
import { useIsAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Sparkles, LayoutDashboard, Users, User, Shield } from "lucide-react";
import { t } from "@/lib/i18n";

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { open: openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  // When logged-in: logo goes to dashboard. When logged-out: logo goes to landing.
  const logoHref = user ? "/dashboard" : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link to={logoHref} className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow transition-transform group-hover:scale-105">
            <Sparkles className="h-4.5 w-4.5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">{t.brand}</span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {user ? (
            <>
              <NavItem to="/dashboard" icon={LayoutDashboard} label={t.nav.dashboard} />
              <NavItem to="/groups" icon={Users} label={t.dashboard.tabGroups} hideOnMobile />
              <NavItem to="/profile" icon={User} label={t.nav.profile} hideOnMobile />
              <Button variant="ghost" size="icon" onClick={toggle} aria-label={t.nav.toggleTheme} className="rounded-full">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {profile?.username && (
                <span className="hidden text-sm font-medium text-muted-foreground md:inline">@{profile.username}</span>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-full">
                {t.nav.signOut}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={toggle} aria-label={t.nav.toggleTheme} className="rounded-full">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={openAuthModal} className="rounded-full bg-gradient-hero shadow-glow hover:opacity-90">
                {t.nav.enter}
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  hideOnMobile,
}: {
  to: "/dashboard" | "/groups" | "/profile";
  icon: React.ElementType;
  label: string;
  hideOnMobile?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground sm:px-3 ${
        hideOnMobile ? "hidden sm:inline-flex" : ""
      }`}
      activeProps={{ className: "bg-muted text-foreground" }}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
