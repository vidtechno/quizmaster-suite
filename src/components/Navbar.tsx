import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useAuthModal } from "@/components/AuthModal";
import { useIsAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Sparkles, LayoutDashboard, Users, User, Shield, Trophy, Search } from "lucide-react";
import { useGlobalSearch } from "@/components/GlobalSearch";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { t } from "@/lib/i18n";

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { open: openAuthModal } = useAuthModal();
  const { isAdmin } = useIsAdmin();
  const { open: openSearch } = useGlobalSearch();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  // When logged-in: logo goes to dashboard. When logged-out: logo goes to landing.
  const logoHref = user ? "/dashboard" : "/";

  return (
    <header className={`sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 ${user ? "hidden sm:block" : ""}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link to={logoHref} className="group flex items-center gap-2.5 shrink-0">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow transition-transform group-hover:scale-105">
            <Sparkles className="h-4.5 w-4.5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight lg:text-xl">{t.brand}</span>
        </Link>
        <nav className="flex items-center gap-0.5 min-w-0">
          {user ? (
            <>
              <NavItem to="/dashboard" icon={LayoutDashboard} label={t.nav.dashboard} />
              <NavItem to="/groups" icon={Users} label={t.nav.groups} />
              <NavItem to="/leaderboard" icon={Trophy} label={t.nav.leaderboard} />
              <NavItem to="/profile" icon={User} label={t.nav.profile} />
              {isAdmin && <NavItem to="/admin" icon={Shield} label={t.nav.admin} />}
              <span className="mx-1 h-6 w-px bg-border/60" />
              <Button variant="ghost" size="icon" onClick={openSearch} aria-label={t.nav.search} className="rounded-full">
                <Search className="h-4 w-4" />
              </Button>
              <LanguageSwitcher compact />
              <Button variant="ghost" size="icon" onClick={toggle} aria-label={t.nav.toggleTheme} className="rounded-full">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-full ml-1">
                {t.nav.signOut}
              </Button>
            </>
          ) : (
            <>
              <LanguageSwitcher compact />
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
  to: "/dashboard" | "/groups" | "/profile" | "/admin" | "/leaderboard";
  icon: React.ElementType;
  label: string;
  hideOnMobile?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-muted text-foreground" }}
      title={label}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}
