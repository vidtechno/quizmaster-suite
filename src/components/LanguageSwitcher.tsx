import { Button } from "@/components/ui/button";
import { setActiveLang, currentLang, type Lang } from "@/lib/i18n";
import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const labels: Record<Lang, string> = { uz: "O'zbekcha", ru: "Русский", en: "English" };
const flags: Record<Lang, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const lang = currentLang;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className="rounded-full" aria-label="Til">
          {compact ? (
            <Languages className="h-4 w-4" />
          ) : (
            <span className="flex items-center gap-1.5">
              <Languages className="h-4 w-4" />
              {lang.toUpperCase()}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {(Object.keys(labels) as Lang[]).map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setActiveLang(l)}
            className={lang === l ? "font-semibold" : ""}
          >
            <span className="mr-2">{flags[l]}</span>
            <span className="flex-1">{labels[l]}</span>
            {lang === l && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
