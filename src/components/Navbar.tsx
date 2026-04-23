import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useAuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { Moon, Sun, GraduationCap } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight sm:text-xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span>Quizly</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/explore"
            className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3"
            activeProps={{ className: "text-foreground" }}
          >
            {t.nav.explore}
          </Link>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3"
                activeProps={{ className: "text-foreground" }}
              >
                {t.nav.dashboard}
              </Link>
              <Link
                to="/groups"
                className="hidden rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline sm:px-3"
                activeProps={{ className: "text-foreground" }}
              >
                {t.dashboard.tabGroups}
              </Link>
              <Button variant="ghost" size="icon" onClick={toggle} aria-label={t.nav.toggleTheme}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {profile?.username && (
                <span className="hidden text-sm text-muted-foreground md:inline">@{profile.username}</span>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                {t.nav.signOut}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={toggle} aria-label={t.nav.toggleTheme}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={openAuthModal} className="shadow-sm">
                {t.nav.enter}
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
