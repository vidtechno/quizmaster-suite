import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useAuthModal } from "@/components/AuthModal";
import { useIsAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import {
  Moon,
  Sun,
  Sparkles,
  LayoutDashboard,
  Users,
  User,
  Shield,
  Trophy,
  Search,
  HelpCircle,
  LogOut,
  Languages,
  Check,
} from "lucide-react";
import { useGlobalSearch } from "@/components/GlobalSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t, setActiveLang, currentLang, type Lang } from "@/lib/i18n";

const langLabels: Record<Lang, string> = { uz: "O'zbekcha", ru: "Русский", en: "English" };
const langFlags: Record<Lang, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

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

  const logoHref = user ? "/dashboard" : "/";
  const initials = (profile?.full_name || profile?.username || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className={`sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 ${
        user ? "hidden sm:block" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link to={logoHref} className="group flex items-center gap-2.5 shrink-0">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow transition-transform group-hover:scale-105">
            <Sparkles className="h-4.5 w-4.5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight lg:text-xl">{t.brand}</span>
        </Link>

        <nav className="flex items-center gap-1 min-w-0">
          {user ? (
            <>
              <NavItem to="/dashboard" icon={LayoutDashboard} label={t.nav.dashboard} />
              <NavItem to="/groups" icon={Users} label={t.nav.groups} />
              <NavItem to="/leaderboard" icon={Trophy} label={t.nav.leaderboard} />

              <Button
                variant="ghost"
                size="icon"
                onClick={openSearch}
                aria-label={t.nav.search}
                className="rounded-full"
              >
                <Search className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={t.nav.menu}
                    className="ml-1 rounded-full ring-1 ring-border/60 transition hover:ring-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Avatar className="h-9 w-9">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                      <AvatarFallback className="bg-gradient-hero text-xs font-semibold text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{profile?.full_name || "—"}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      @{profile?.username}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" /> {t.nav.profileFull}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" /> {t.nav.admin}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/help" className="cursor-pointer">
                      <HelpCircle className="mr-2 h-4 w-4" /> {t.nav.help}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Languages className="mr-2 h-4 w-4" /> {t.nav.language}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {(Object.keys(langLabels) as Lang[]).map((l) => (
                        <DropdownMenuItem key={l} onClick={() => setActiveLang(l)}>
                          <span className="mr-2">{langFlags[l]}</span>
                          <span className="flex-1">{langLabels[l]}</span>
                          {currentLang === l && <Check className="h-3.5 w-3.5 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={toggle}>
                    {theme === "dark" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    {t.nav.toggleTheme}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> {t.nav.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label={t.nav.language}>
                    <Languages className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  {(Object.keys(langLabels) as Lang[]).map((l) => (
                    <DropdownMenuItem key={l} onClick={() => setActiveLang(l)}>
                      <span className="mr-2">{langFlags[l]}</span>
                      <span className="flex-1">{langLabels[l]}</span>
                      {currentLang === l && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label={t.nav.toggleTheme}
                className="rounded-full"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                onClick={openAuthModal}
                className="rounded-full bg-gradient-hero shadow-glow hover:opacity-90"
              >
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
}: {
  to: "/dashboard" | "/groups" | "/profile" | "/admin" | "/leaderboard" | "/help";
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-muted text-foreground" }}
      title={label}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}
