import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogIn, UserPlus } from "lucide-react";
import { t } from "@/lib/i18n";

type AuthModalCtx = {
  open: () => void;
  close: () => void;
};

const Ctx = createContext<AuthModalCtx | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const goto = (to: "/login" | "/signup") => {
    setIsOpen(false);
    // small timeout so the dialog close animation doesn't race the route change
    setTimeout(() => navigate({ to }), 50);
  };

  return (
    <Ctx.Provider value={{ open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t.authModal.title}</DialogTitle>
            <DialogDescription>{t.authModal.subtitle}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => goto("/login")}
              className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-elegant focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <LogIn className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">{t.authModal.loginCard.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t.authModal.loginCard.desc}</p>
              </div>
              <span className="mt-auto text-xs font-medium text-primary">{t.authModal.loginCard.cta} →</span>
            </button>
            <button
              onClick={() => goto("/signup")}
              className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-elegant focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground group-hover:bg-accent">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">{t.authModal.registerCard.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t.authModal.registerCard.desc}</p>
              </div>
              <span className="mt-auto text-xs font-medium text-accent-foreground">{t.authModal.registerCard.cta} →</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useAuthModal() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuthModal must be inside AuthModalProvider");
  return c;
}
