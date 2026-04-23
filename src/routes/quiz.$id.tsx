import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Trophy, Shuffle, Lock, Globe, ArrowRight, Medal, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/quiz/$id")({
  head: () => ({ meta: [{ title: t.player.metaTitle }] }),
  component: QuizPage,
});

type Test = {
  id: string;
  title: string;
  description: string | null;
  time_limit: number;
  random_enabled: boolean;
  is_public: boolean;
  access_code: string | null;
  max_attempts: number;
  creator_id: string;
};
type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  position: number;
};

type Mode = "intro" | "code-gate" | "running" | "submitted";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuizPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("intro");
  const [codeInput, setCodeInput] = useState("");
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ score: number; time_spent: number; total_questions: number; profiles: { username: string } | null }>
  >([]);
  const [, setResultId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ score: number; total: number; time: number } | null>(null);

  // running state
  const [runQuestions, setRunQuestions] = useState<
    Array<Question & { _displayOptions: { text: string; originalIndex: number }[] }>
  >([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: tt, error } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
        if (error || !tt) {
          toast.error(t.player.notFound);
          return navigate({ to: "/explore" });
        }
        setTest(tt as Test);

        const { data: qs } = await supabase.from("questions").select("*").eq("test_id", id).order("position");
        setQuestions(
          (qs ?? []).map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            options: Array.isArray(q.options) ? q.options : [],
            correct_answer_index: q.correct_answer_index,
            position: q.position,
          })),
        );

        // Leaderboard if public
        if ((tt as Test).is_public) {
          const { data: lb } = await supabase
            .from("results")
            .select("score, time_spent, total_questions, profiles!results_user_id_fkey(username)")
            .eq("test_id", id)
            .order("score", { ascending: false })
            .order("time_spent", { ascending: true })
            .limit(20);
          setLeaderboard((lb as any) ?? []);
        }

        if (user) {
          const { count } = await supabase
            .from("results")
            .select("id", { count: "exact", head: true })
            .eq("test_id", id)
            .eq("user_id", user.id);
          setAttemptsUsed(count ?? 0);
        }
      } catch {
        toast.error(t.err.network);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, navigate]);

  // Timer
  useEffect(() => {
    if (mode !== "running") return;
    const tick = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          submit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function startAttempt() {
    if (!user) {
      toast.error(t.player.needLogin);
      return navigate({ to: "/login" });
    }
    if (!test) return;
    if (attemptsUsed >= test.max_attempts) {
      return toast.error(t.player.noAttemptsLeft(test.max_attempts));
    }
    if (!test.is_public) {
      setMode("code-gate");
      return;
    }
    beginRunning();
  }

  function submitCode() {
    if (!test) return;
    if (codeInput.trim() !== (test.access_code ?? "")) {
      return toast.error(t.player.wrongCode);
    }
    beginRunning();
  }

  function beginRunning() {
    if (!test || questions.length === 0) return toast.error(t.player.noQuestions);
    const baseQs = test.random_enabled ? shuffle(questions) : questions;
    const prepared = baseQs.map((q) => {
      const indices = q.options.map((_, i) => i);
      const order = test.random_enabled ? shuffle(indices) : indices;
      return {
        ...q,
        _displayOptions: order.map((origIdx) => ({ text: q.options[origIdx], originalIndex: origIdx })),
      };
    });
    setRunQuestions(prepared);
    setAnswers({});
    setCurrent(0);
    setTimeLeft(test.time_limit);
    startedAt.current = Date.now();
    setMode("running");
  }

  async function submit() {
    if (!user || !test) return;
    const timeSpent = Math.min(test.time_limit, Math.round((Date.now() - startedAt.current) / 1000));
    let score = 0;
    const log = runQuestions.map((q) => {
      const chosenOriginal = answers[q.id];
      const correct = chosenOriginal === q.correct_answer_index;
      if (correct) score++;
      return {
        question_id: q.id,
        question_text: q.question_text,
        chosen_index: chosenOriginal ?? null,
        correct_index: q.correct_answer_index,
        chosen_text: chosenOriginal != null ? q.options[chosenOriginal] : null,
        correct_text: q.options[q.correct_answer_index],
        is_correct: correct,
      };
    });

    try {
      const { data, error } = await supabase
        .from("results")
        .insert({
          user_id: user.id,
          test_id: test.id,
          score,
          total_questions: runQuestions.length,
          time_spent: timeSpent,
          answers_log: log,
        })
        .select("id")
        .single();
      if (error) {
        toast.error(t.err.saveFailed);
        return;
      }
      setResultId(data.id);
      setLastResult({ score, total: runQuestions.length, time: timeSpent });
      setMode("submitted");
    } catch {
      toast.error(t.err.network);
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = useMemo(
    () => (runQuestions.length ? ((current + 1) / runQuestions.length) * 100 : 0),
    [current, runQuestions.length],
  );

  if (loading || !test) return <div className="mx-auto max-w-3xl px-4 py-12">{t.loading}</div>;

  // ---------- INTRO ----------
  if (mode === "intro") {
    const canTake = !user || attemptsUsed < test.max_attempts;
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                test.is_public ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              }`}
            >
              {test.is_public ? (
                <>
                  <Globe className="h-3 w-3" /> {t.player.publicTag}
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" /> {t.player.privateTag}
                </>
              )}
            </span>
            {test.random_enabled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 font-medium text-accent-foreground">
                <Shuffle className="h-3 w-3" /> {t.player.randomTag}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{test.title}</h1>
          {test.description && <p className="mt-3 text-muted-foreground">{test.description}</p>}
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <Stat icon={Trophy} label={t.player.questionsStat} value={questions.length.toString()} />
            <Stat icon={Clock} label={t.player.timeLimitStat} value={t.player.badgeMin(Math.round(test.time_limit / 60))} />
            <Stat
              icon={Medal}
              label={t.player.attemptsStat}
              value={user ? `${attemptsUsed} / ${test.max_attempts}` : `${test.max_attempts}`}
            />
          </div>
          <div className="mt-8">
            <Button size="lg" onClick={startAttempt} disabled={!canTake}>
              {canTake ? (
                <>
                  {t.player.start} <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                t.player.noAttempts
              )}
            </Button>
          </div>
        </div>

        {test.is_public && (
          <div className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold">
              <Trophy className="h-5 w-5 text-accent" /> {t.player.leaderboard}
            </h2>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.player.noAttemptsYet}</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">{t.player.rank}</th>
                      <th className="px-4 py-3 text-left">{t.player.user}</th>
                      <th className="px-4 py-3 text-right">{t.player.score}</th>
                      <th className="px-4 py-3 text-right">{t.player.time}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2.5 font-medium">{i + 1}</td>
                        <td className="px-4 py-2.5">@{r.profiles?.username ?? "anonymous"}</td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {r.score}/{r.total_questions}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {Math.floor(r.time_spent / 60)}m {r.time_spent % 60}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---------- CODE GATE ----------
  if (mode === "code-gate") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:py-20">
        <div className="rounded-2xl border bg-card p-6 text-center shadow-card sm:p-8">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl font-semibold">{t.player.privateTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.player.privateDesc}</p>
          <div className="mt-6 text-left">
            <Label htmlFor="code">{t.player.accessCode}</Label>
            <Input id="code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} autoFocus />
          </div>
          <Button className="mt-6 w-full" onClick={submitCode}>
            {t.continue}
          </Button>
        </div>
      </div>
    );
  }

  // ---------- RUNNING ----------
  if (mode === "running") {
    const q = runQuestions[current];
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-medium">{t.player.questionOf(current + 1, runQuestions.length)}</span>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono font-semibold ${
              timeLeft < 30 ? "bg-destructive/15 text-destructive" : "bg-muted text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-card sm:p-8">
          <h2 className="font-display text-xl font-semibold leading-snug sm:text-2xl">{q.question_text}</h2>
          <div className="mt-6 space-y-2">
            {q._displayOptions.map((opt, i) => {
              const selected = answers[q.id] === opt.originalIndex;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [q.id]: opt.originalIndex })}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                    selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-input hover:bg-muted/50"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            {t.player.previous}
          </Button>
          {current < runQuestions.length - 1 ? (
            <Button onClick={() => setCurrent((c) => c + 1)}>
              {t.player.next} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit}>{t.player.submit}</Button>
          )}
        </div>
      </div>
    );
  }

  // ---------- SUBMITTED ----------
  if (mode === "submitted" && lastResult) {
    const pct = Math.round((lastResult.score / lastResult.total) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
        <div className="rounded-2xl border bg-card p-6 text-center shadow-card sm:p-8">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              pct >= 70
                ? "bg-success/15 text-success"
                : pct >= 50
                  ? "bg-accent/20 text-accent-foreground"
                  : "bg-destructive/15 text-destructive"
            }`}
          >
            <Trophy className="h-9 w-9" />
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold">{pct}%</h2>
          <p className="mt-2 text-muted-foreground">
            {lastResult.score} / {lastResult.total} · {Math.floor(lastResult.time / 60)}m {lastResult.time % 60}s
          </p>
        </div>
        <div className="mt-8 space-y-3">
          <h3 className="font-display text-xl font-semibold">{t.player.review}</h3>
          {runQuestions.map((q, i) => {
            const chosen = answers[q.id];
            const isCorrect = chosen === q.correct_answer_index;
            return (
              <div key={q.id} className="rounded-xl border bg-card p-5 shadow-card">
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {i + 1}. {q.question_text}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t.player.yourAnswer}: {chosen != null ? q.options[chosen] : <em>{t.player.notAnswered}</em>}
                    </p>
                    {!isCorrect && (
                      <p className="mt-0.5 text-sm text-success">
                        {t.player.correctIs}: {q.options[q.correct_answer_index]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/explore">
            <Button variant="outline">{t.player.backToExplore}</Button>
          </Link>
          {user?.id === test.creator_id && (
            <Link to="/quiz/$id/results" params={{ id: test.id }}>
              <Button>{t.player.viewAllResults}</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/50 p-3 sm:p-4">
      <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-base font-semibold sm:text-lg">{value}</div>
    </div>
  );
}
