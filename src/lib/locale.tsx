// Back-compat shim. The active language now lives in src/lib/i18n.ts.
// Components that previously called useLocale().tr still work — `tr` reads
// from the same Proxy as `t`. setLang() forwards to setActiveLang() which
// reloads the page so every component re-renders in the new language.
import { ReactNode } from "react";
import { t, currentLang, setActiveLang, type Lang } from "@/lib/i18n";

export type { Lang };

export function LocaleProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useLocale() {
  return {
    lang: currentLang,
    setLang: (l: Lang) => setActiveLang(l),
    tr: t as any,
  };
}
