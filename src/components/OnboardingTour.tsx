import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, FilePlus2, Users, Share2, ArrowRight } from "lucide-react";
import { t } from "@/lib/i18n";

const ICONS = [FilePlus2, Users, Share2];
const STORAGE_KEY = "megapanel.onboarded.v1";

export function OnboardingTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const id = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(id);
      }
    } catch {}
  }, [user]);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="font-display text-2xl">{t.onboarding.title}</DialogTitle>
          <DialogDescription>{t.onboarding.subtitle}</DialogDescription>
        </DialogHeader>
        <ol className="mt-2 space-y-3">
          {t.onboarding.steps.map((s, i) => {
            const Icon = ICONS[i] ?? FilePlus2;
            return (
              <li key={i} className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">
                    {i + 1}. {s.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex justify-between gap-2">
          <Button variant="ghost" onClick={dismiss}>
            {t.onboarding.skip}
          </Button>
          <Button onClick={dismiss} className="rounded-full bg-gradient-hero shadow-glow">
            {t.onboarding.gotIt} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
