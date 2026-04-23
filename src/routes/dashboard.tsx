import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Users, Globe, Lock, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: t.dashboard.metaTitle }] }),
  component: DashboardPage,
});

type MyTest = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  random_enabled: boolean;
  max_attempts: number;
  time_limit: number;
  created_at: string;
  question_count: number;
  attempt_count: number;
};

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<MyTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  async function load() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, description, is_public, random_enabled, max_attempts, time_limit, created_at, questions(count), results(count)")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(t.err.loadFailed);
        setLoading(false);
        return;
      }
      const mapped: MyTest[] = (data ?? []).map((tt: any) => ({
        id: tt.id,
        title: tt.title,
        description: tt.description,
        is_public: tt.is_public,
        random_enabled: tt.random_enabled,
        max_attempts: tt.max_attempts,
        time_limit: tt.time_limit,
        created_at: tt.created_at,
        question_count: tt.questions?.[0]?.count ?? 0,
        attempt_count: tt.results?.[0]?.count ?? 0,
      }));
      setTests(mapped);
    } catch {
      toast.error(t.err.network);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function deleteTest(id: string) {
    if (!confirm(t.dashboard.confirmDelete)) return;
    try {
      const { error } = await supabase.from("tests").delete().eq("id", id);
      if (error) return toast.error(t.err.saveFailed);
      toast.success(t.dashboard.deleted);
      setTests((ts) => ts.filter((x) => x.id !== id));
    } catch {
      toast.error(t.err.network);
    }
  }

  if (authLoading || !user) {
    return <div className="mx-auto max-w-6xl px-4 py-12">{t.loading}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t.dashboard.title}</h1>
          <p className="mt-2 text-muted-foreground">{t.dashboard.subtitle}</p>
        </div>
        <Link to="/quiz/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t.dashboard.newQuiz}
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <h2 className="font-display text-2xl font-semibold">{t.dashboard.emptyTitle}</h2>
          <p className="mt-2 text-muted-foreground">{t.dashboard.emptyDesc}</p>
          <Link to="/quiz/new">
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              {t.dashboard.emptyCta}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tests.map((tt) => (
            <div key={tt.id} className="rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-semibold leading-snug sm:text-xl">{tt.title}</h3>
                  {tt.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tt.description}</p>}
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    tt.is_public ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tt.is_public ? (
                    <>
                      <Globe className="h-3 w-3" /> {t.dashboard.public}
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" /> {t.dashboard.private}
                    </>
                  )}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{t.dashboard.questions(tt.question_count)}</span>
                <span>·</span>
                <span>{t.dashboard.minutes(Math.round(tt.time_limit / 60))}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {t.dashboard.attempts(tt.attempt_count)}
                </span>
                <span>·</span>
                <span>{t.dashboard.maxPerUser(tt.max_attempts)}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/quiz/$id/edit" params={{ id: tt.id }}>
                  <Button size="sm" variant="outline">
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    {t.edit}
                  </Button>
                </Link>
                <Link to="/quiz/$id/results" params={{ id: tt.id }}>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="mr-2 h-3.5 w-3.5" />
                    {t.dashboard.results}
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => deleteTest(tt.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {t.delete}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
