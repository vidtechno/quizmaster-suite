import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/quiz/$id/results")({
  head: () => ({ meta: [{ title: t.results.metaTitle }] }),
  component: ResultsPage,
});

type ResultRow = {
  id: string;
  score: number;
  total_questions: number;
  time_spent: number;
  completed_at: string;
  answers_log: any;
  profiles: { username: string; full_name: string; phone: string } | null;
};

function ResultsPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<{ title: string; creator_id: string } | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  async function load() {
    if (!user) return;
    try {
      const { data: tt, error } = await supabase.from("tests").select("title, creator_id").eq("id", id).maybeSingle();
      if (error || !tt) {
        toast.error(t.editQuiz.notFound);
        return navigate({ to: "/dashboard" });
      }
      if (tt.creator_id !== user.id) {
        toast.error(t.results.onlyCreator);
        return navigate({ to: "/dashboard" });
      }
      setTest(tt);
      const { data: r, error: rErr } = await supabase
        .from("results")
        .select(
          "id, score, total_questions, time_spent, completed_at, answers_log, profiles!results_user_id_fkey(username, full_name, phone)",
        )
        .eq("test_id", id)
        .order("completed_at", { ascending: false });
      if (rErr) {
        toast.error(t.err.loadFailed);
      } else {
        setResults((r as any) ?? []);
      }
    } catch {
      toast.error(t.err.network);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();

    // realtime: new attempts come in live
    const channel = supabase
      .channel(`results:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "results", filter: `test_id=eq.${id}` },
        () => {
          load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  if (authLoading || loading || !test) return <div className="mx-auto max-w-5xl px-4 py-12">{t.loading}</div>;

  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + (r.score / r.total_questions) * 100, 0) / results.length)
    : 0;
  const avgTime = results.length ? Math.round(results.reduce((s, r) => s + r.time_spent, 0) / results.length) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.results.backToDashboard}
      </Link>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">{test.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.results.subtitle}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t.results.statAttempts} value={results.length.toString()} />
        <Stat label={t.results.statUnique} value={new Set(results.map((r) => r.profiles?.phone)).size.toString()} />
        <Stat label={t.results.statAvg} value={`${avgScore}%`} />
        <Stat label={t.results.statAvgTime} value={`${Math.floor(avgTime / 60)}m ${avgTime % 60}s`} />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-card">
        {results.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">{t.results.none}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">{t.results.user}</th>
                  <th className="hidden px-4 py-3 text-left sm:table-cell">{t.results.phone}</th>
                  <th className="px-4 py-3 text-right">{t.results.score}</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">{t.results.time}</th>
                  <th className="hidden px-4 py-3 text-right md:table-cell">{t.results.submitted}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {results.flatMap((r) => {
                  const pct = Math.round((r.score / r.total_questions) * 100);
                  const open = openId === r.id;
                  const log: any[] = Array.isArray(r.answers_log) ? r.answers_log : [];
                  const rows = [
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.profiles?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">@{r.profiles?.username}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{r.profiles?.phone}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${pct >= 70 ? "text-success" : pct >= 50 ? "" : "text-destructive"}`}>
                          {r.score}/{r.total_questions}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">({pct}%)</span>
                      </td>
                      <td className="hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">
                        {Math.floor(r.time_spent / 60)}m {r.time_spent % 60}s
                      </td>
                      <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground md:table-cell">
                        {new Date(r.completed_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setOpenId(open ? null : r.id)}>
                          {open ? t.hide : t.details}
                        </Button>
                      </td>
                    </tr>,
                  ];
                  if (open) {
                    rows.push(
                      <tr key={`${r.id}-detail`} className="border-t bg-muted/20">
                        <td colSpan={6} className="p-4">
                          <div className="space-y-2">
                            {log.map((a: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 rounded-lg bg-background p-3">
                                {a.is_correct ? (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                                ) : (
                                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                )}
                                <div className="min-w-0 flex-1 text-sm">
                                  <p className="font-medium">
                                    {i + 1}. {a.question_text}
                                  </p>
                                  <p className="mt-0.5 text-muted-foreground">
                                    {t.results.chose}: {a.chosen_text ?? <em>—</em>}
                                  </p>
                                  {!a.is_correct && (
                                    <p className="text-success">
                                      {t.results.correct}: {a.correct_text}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>,
                    );
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold sm:text-2xl">{value}</div>
    </div>
  );
}
