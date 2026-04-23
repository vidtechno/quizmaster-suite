import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Trophy, Shuffle, Lock, BarChart3, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quizly — Smarter tests, better learning" },
      { name: "description", content: "Build quizzes, run live tests, and climb the leaderboard. Deep analytics for teachers, frictionless taking for students." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 grid-paper opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 md:py-36">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Quiz platform for teachers & learners
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] sm:text-6xl md:text-7xl">
              Tests that <span className="text-accent">teach</span>,<br />
              results that matter.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/80">
              Build randomized quizzes in minutes. Share with a code or open them to the world.
              Watch students compete on live leaderboards.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Get started free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/explore">
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                  Explore public quizzes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Everything you need to run great tests</h2>
          <p className="mt-3 text-muted-foreground">From simple practice quizzes to high-stakes assessments, Quizly handles the details so you can focus on the learning.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to make your first quiz?</h2>
          <p className="mt-3 text-muted-foreground">Sign up takes 30 seconds. No email confirmation needed.</p>
          <Link to="/signup">
            <Button size="lg" className="mt-8">
              Create your account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Built with care · Quizly © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

const features = [
  { icon: Brain, title: "Smart question builder", desc: "Multiple choice with one correct answer. Reorder, edit, and refine on the fly." },
  { icon: Shuffle, title: "Randomization", desc: "Shuffle questions and options for every attempt to discourage cheating." },
  { icon: Lock, title: "Public or private", desc: "Open quizzes to everyone, or gate them with an access code for your class." },
  { icon: Trophy, title: "Live leaderboards", desc: "Top 20 scores per quiz, ranked by score and tiebroken by speed." },
  { icon: BarChart3, title: "Deep analytics", desc: "Per-student breakdowns: every answer, every second, fully logged." },
  { icon: Users, title: "Attempt limits", desc: "Decide how many tries each student gets — change anytime." },
];
