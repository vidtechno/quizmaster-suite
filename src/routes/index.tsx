import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/AuthModal";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Brain, Trophy, Shuffle, Lock, BarChart3, Users } from "lucide-react";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quizly — Aqlli testlar, yaxshi natijalar" },
      { name: "description", content: "Testlar tuzing, jonli imtihonlar o'tkazing va reytingda yuqorilang. O'qituvchilar uchun chuqur tahlil." },
    ],
  }),
  component: Landing,
});

const featureIcons = [Brain, Shuffle, Lock, Trophy, BarChart3, Users];

function Landing() {
  const { open: openAuthModal } = useAuthModal();
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 grid-paper opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 md:py-36">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {t.landing.badge}
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] sm:text-6xl md:text-7xl">
              {t.landing.h1a}
              <span className="text-accent">{t.landing.h1Highlight}</span>
              {t.landing.h1b}
            </h1>
            <p className="mt-6 max-w-xl text-base text-primary-foreground/80 sm:text-lg">{t.landing.sub}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {t.nav.dashboard} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  onClick={openAuthModal}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {t.landing.ctaPrimary} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {!user && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={openAuthModal}
                  className="border-white/20 bg-white/5 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                >
                  {t.landing.ctaSecondary}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t.landing.featuresTitle}</h2>
          <p className="mt-3 text-muted-foreground">{t.landing.featuresSub}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.landing.features.map((f, i) => {
            const Icon = featureIcons[i];
            return (
              <div
                key={f.title}
                className="rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t.landing.ctaTitle}</h2>
          <p className="mt-3 text-muted-foreground">{t.landing.ctaSub}</p>
          {user ? (
            <Link to="/quiz/new">
              <Button size="lg" className="mt-8">
                {t.dashboard.newQuiz} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button size="lg" className="mt-8" onClick={openAuthModal}>
              {t.landing.ctaButton} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        {t.landing.footer(new Date().getFullYear())}
      </footer>
    </div>
  );
}
