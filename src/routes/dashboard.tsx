import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Users, Globe, Lock, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Quizly" }] }),
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
    const { data } = await supabase
      .from("tests")
      .select("id, title, description, is_public, random_enabled, max_attempts, time_limit, created_at, questions(count), results(count)")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    const mapped: MyTest[] = (data ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      is_public: t.is_public,
      random_enabled: t.random_enabled,
      max_attempts: t.max_attempts,
      time_limit: t.time_limit,
      created_at: t.created_at,
      question_count: t.questions?.[0]?.count ?? 0,
      attempt_count: t.results?.[0]?.count ?? 0,
    }));
    setTests(mapped);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function deleteTest(id: string) {
    if (!confirm("Delete this quiz and all its results? This can't be undone.")) return;
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Quiz deleted");
    setTests((ts) => ts.filter((t) => t.id !== id));
  }

  if (authLoading || !user) {
    return <div className="mx-auto max-w-6xl px-4 py-12">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Your quizzes</h1>
          <p className="mt-2 text-muted-foreground">Create, edit, and review attempts on your quizzes.</p>
        </div>
        <Link to="/quiz/new">
          <Button><Plus className="mr-2 h-4 w-4" />New quiz</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <h2 className="font-display text-2xl font-semibold">No quizzes yet</h2>
          <p className="mt-2 text-muted-foreground">Create your first quiz to start collecting results.</p>
          <Link to="/quiz/new"><Button className="mt-6"><Plus className="mr-2 h-4 w-4" />Create your first quiz</Button></Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((t) => (
            <div key={t.id} className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-semibold leading-snug">{t.title}</h3>
                  {t.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${t.is_public ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {t.is_public ? <><Globe className="h-3 w-3" /> Public</> : <><Lock className="h-3 w-3" /> Private</>}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{t.question_count} questions</span>
                <span>·</span>
                <span>{Math.round(t.time_limit / 60)} min</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{t.attempt_count} attempts</span>
                <span>·</span>
                <span>Max {t.max_attempts} per user</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/quiz/$id/edit" params={{ id: t.id }}><Button size="sm" variant="outline"><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button></Link>
                <Link to="/quiz/$id/results" params={{ id: t.id }}><Button size="sm" variant="outline"><BarChart3 className="mr-2 h-3.5 w-3.5" />Results</Button></Link>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteTest(t.id)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
