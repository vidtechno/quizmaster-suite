import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sparkles, Moon, Sun, LogOut, Search } from "lucide-react";
import { t } from "@/lib/i18n";
import { useGlobalSearch } from "@/components/GlobalSearch";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function MobileTopBar() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { open } = useGlobalSearch();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl sm:hidden">
      <div className="flex h-14 items-center justify-between px-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-glow">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-base font-bold">{t.brand}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={open} className="rounded-full" aria-label="Qidirish">
            <Search className="h-4 w-4" />
          </Button>
          <LanguageSwitcher compact />
          <Button variant="ghost" size="icon" onClick={toggle} className="rounded-full" aria-label="Mavzu">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Chiqish"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
