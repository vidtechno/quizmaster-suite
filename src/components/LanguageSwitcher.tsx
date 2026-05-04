import { Button } from "@/components/ui/button";
import { useLocale, type Lang } from "@/lib/locale";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const labels: Record<Lang, string> = { uz: "O'zbekcha", ru: "Русский", en: "English" };

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className="rounded-full" aria-label="Til">
          {compact ? <Languages className="h-4 w-4" /> : (
            <span className="flex items-center gap-1.5"><Languages className="h-4 w-4" />{lang.toUpperCase()}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(labels) as Lang[]).map((l) => (
          <DropdownMenuItem key={l} onClick={() => setLang(l)} className={lang === l ? "font-semibold" : ""}>
            {labels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
