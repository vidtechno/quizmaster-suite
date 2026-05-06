// Lang state lives in src/lib/i18n.ts. This provider hydrates the stored
// language AFTER mount (avoiding SSR/CSR mismatch — React error #418) and
// re-renders the whole subtree by changing a `key`, so every component
// re-evaluates the i18n proxy in the new language.
import { ReactNode, useEffect, useState } from "react";
import {
  t,
  currentLang,
  setActiveLang,
  subscribeLang,
  readStoredLang,
  type Lang,
} from "@/lib/i18n";

export type { Lang };

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(currentLang);

  // After hydration: load stored lang and subscribe to changes.
  useEffect(() => {
    const stored = readStoredLang();
    if (stored !== currentLang) setActiveLang(stored);
    setLang(currentLang);
    return subscribeLang(() => setLang(currentLang));
  }, []);

  return <div key={lang} lang={lang} className="contents">{children}</div>;
}

export function useLocale() {
  const [lang, setLang] = useState<Lang>(currentLang);
  useEffect(() => subscribeLang(() => setLang(currentLang)), []);
  return {
    lang,
    setLang: (l: Lang) => setActiveLang(l),
    tr: t as any,
  };
}
