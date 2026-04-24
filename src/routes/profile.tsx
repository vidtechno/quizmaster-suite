import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/safe-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, ArrowLeft, Trophy, Clock, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: t.profile.metaTitle }] }),
  component: ProfilePage,
});

type AttemptRow = {
  id: string;
  test_id: string;
  test_title: string;
  attempt_number: number;
  score: number;
  total_questions: number;
  time_spent: number;
  submitted_at: string;
  status: string;
  answers_log: any;
};

function ProfilePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRow, setOpenRow] = useState<AttemptRow | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const data = await safeQuery(
        () =>
          supabase
            .from("test_attempts")
            .select("id, test_id, attempt_number, score, total_questions, time_spent, submitted_at, status, answers_log, tests(title)")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("submitted_at", { ascending: false }),
        { fallback: [] as any[] },
      );
      setRows(
        (data ?? []).map((r: any) => ({
          id: r.id,
          test_id: r.test_id,
          test_title: r.tests?.title ?? "—",
          attempt_number: r.attempt_number,
          score: r.score,
          total_questions: r.total_questions,
          time_spent: r.time_spent,
          submitted_at: r.submitted_at,
          status: r.status,
          answers_log: r.answers_log,
        })),
      );
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const total = rows.length;
    const avg = total ? Math.round(rows.reduce((s, r) => s + (r.score / Math.max(1, r.total_questions)) * 100, 0) / total) : 0;
    const best = rows.reduce((m, r) => Math.max(m, Math.round((r.score / Math.max(1, r.total_questions)) * 100)), 0);
    return { total, avg, best };
  }, [rows]);

  if (authLoading || !user) return <div className="mx-auto max-w-5xl px-4 py-12">{t.loading}</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      {/* Header card */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border bg-gradient-mesh p-6 shadow-card sm:p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-hero text-2xl font-bold text-primary-foreground shadow-glow">
            {(profile?.full_name?.[0] ?? profile?.username?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.profile.title}</p>
            <h1 className="mt-1 truncate font-display text-2xl font-bold sm:text-3xl">{profile?.full_name ?? "—"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">@{profile?.username} · {profile?.phone}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat icon={Trophy} label={t.profile.myAttempts} value={stats.total} accent="primary" />
          <Stat icon={Sparkles} label={t.results.statAvg} value={`${stats.avg}%`} accent="accent" />
          <Stat icon={Trophy} label="Eng yaxshi" value={`${stats.best}%`} accent="success" />
        </div>
      </div>

      <h2 className="mb-4 font-display text-xl font-semibold sm:text-2xl">{t.profile.myAttempts}</h2>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border bg-card p-12 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Trophy className="h-6 w-6" />
          </div>
          <p className="mt-4 text-muted-foreground">{t.profile.noAttempts}</p>
          <Link to="/explore">
            <Button className="mt-6 rounded-full bg-gradient-hero shadow-glow">{t.profile.exploreCta}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const pct = Math.round((r.score / Math.max(1, r.total_questions)) * 100);
            const tone = pct >= 70 ? "text-success" : pct >= 50 ? "text-accent" : "text-destructive";
            return (
              <div
                key={r.id}
                className="group flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant sm:p-5"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted font-bold ${tone}`}>
                  {pct}%
                </div>
                <div className="min-w-0 flex-1">
                  <Link to="/quiz/$id" params={{ id: r.test_id }} className="block truncate font-display font-semibold hover:text-primary">
                    {r.test_title}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {r.score}/{r.total_questions}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(r.time_spent / 60)}m {r.time_spent % 60}s
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                      {t.results.attemptN(r.attempt_number)}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpenRow(r)}>
                  {t.profile.review}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {openRow && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{openRow.test_title}</DialogTitle>
                <DialogDescription>
                  {t.results.attemptN(openRow.attempt_number)} · {openRow.score}/{openRow.total_questions} ·{" "}
                  {Math.floor(openRow.time_spent / 60)}m {openRow.time_spent % 60}s
                </DialogDescription>
              </DialogHeader>
              <ReviewList log={Array.isArray(openRow.answers_log) ? openRow.answers_log : []} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewList({ log }: { log: any[] }) {
  if (!log.length) return <p className="text-sm text-muted-foreground">—</p>;
  const correct = log.filter((a) => a.is_correct).length;
  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs">
        <span className="rounded-full bg-success/15 px-2.5 py-1 font-medium text-success">
          {correct} {t.profile.correctAnswers}
        </span>
        <span className="rounded-full bg-destructive/15 px-2.5 py-1 font-medium text-destructive">
          {log.length - correct} {t.profile.wrongAnswers}
        </span>
      </div>
      {log.map((a: any, i: number) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            {a.is_correct ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium leading-snug">
                {i + 1}. {a.question_text}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t.results.chose}: <span className="font-medium text-foreground">{a.chosen_text ?? "—"}</span>
              </p>
              {!a.is_correct && (
                <p className="text-success">
                  {t.results.correct}: {a.correct_text}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: "primary" | "accent" | "success";
}) {
  const tone =
    accent === "primary" ? "bg-primary/10 text-primary" : accent === "accent" ? "bg-accent/15 text-accent" : "bg-success/15 text-success";
  return (
    <div className="rounded-2xl border bg-background/70 p-3 backdrop-blur sm:p-4">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-xl font-bold sm:text-2xl">{value}</p>
    </div>
  );
}

export { ArrowLeft as _ }; // dead import guard for tree-shaking warning silence
