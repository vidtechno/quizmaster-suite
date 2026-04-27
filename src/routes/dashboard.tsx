import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Users, Globe, Lock, BarChart3, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { safeQuery, safeMutation } from "@/lib/safe-query";
import { PaginationBar } from "@/components/PaginationBar";

const PAGE_SIZE = 20;

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
  group_id: string | null;
  access_code: string | null;
  question_count: number;
  attempt_count: number;
};

type MyGroup = {
  id: string;
  name: string;
  description: string | null;
  testCount: number;
  activeTest: { id: string; title: string; access_code: string | null } | null;
};

function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<MyTest[]>([]);
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tests" | "groups">("tests");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tests")
        .select(
          "id, title, description, is_public, random_enabled, max_attempts, time_limit, created_at, group_id, access_code, questions(count), results(count)",
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(t.err.loadFailed);
      } else {
        setTests(
          (data ?? []).map((tt: any) => ({
            id: tt.id,
            title: tt.title,
            description: tt.description,
            is_public: tt.is_public,
            random_enabled: tt.random_enabled,
            max_attempts: tt.max_attempts,
            time_limit: tt.time_limit,
            created_at: tt.created_at,
            group_id: tt.group_id,
            access_code: tt.access_code,
            question_count: tt.questions?.[0]?.count ?? 0,
            attempt_count: tt.results?.[0]?.count ?? 0,
          })),
        );
      }

      const gData = await safeQuery(
        () =>
          supabase
            .from("groups")
            .select("id, name, description, tests(id, title, access_code, is_public)")
            .eq("creator_id", user.id)
            .order("created_at", { ascending: false }),
        { fallback: [] as any[] },
      );
      setGroups(
        (gData ?? []).map((g: any) => {
          const ts = Array.isArray(g.tests) ? g.tests : [];
          const active = ts.find((tt: any) => tt.is_public === false) ?? null;
          return {
            id: g.id,
            name: g.name,
            description: g.description,
            testCount: ts.length,
            activeTest: active ? { id: active.id, title: active.title, access_code: active.access_code } : null,
          };
        }),
      );
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
    const ok = await safeMutation(() => supabase.from("tests").delete().eq("id", id));
    if (!ok) return;
    toast.success(t.dashboard.deleted);
    setTests((ts) => ts.filter((x) => x.id !== id));
  }

  async function deleteGroup(id: string) {
    if (!confirm(t.groups.confirmDelete)) return;
    const ok = await safeMutation(() => supabase.from("groups").delete().eq("id", id));
    if (!ok) return;
    toast.success(t.groups.deleted);
    setGroups((gs) => gs.filter((g) => g.id !== id));
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code).then(
      () => toast.success(t.groups.codeCopied),
      () => toast.error(t.err.generic),
    );
  }

  function newTestClick() {
    // No requirement to have groups for public tests; user can choose privacy in editor
    navigate({ to: "/quiz/new" });
  }

  if (authLoading || !user) {
    return <div className="mx-auto max-w-6xl px-4 py-12">{t.loading}</div>;
  }

  const totalAttempts = tests.reduce((sum, x) => sum + x.attempt_count, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      {/* Profile summary */}
      <div className="mb-8 rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5 shadow-card sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.dashboard.profileTitle}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
          {profile?.full_name ?? profile?.username ?? "—"}
        </h1>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Stat label={t.dashboard.statGroups} value={groups.length} />
          <Stat label={t.dashboard.statTests} value={tests.length} />
          <Stat label={t.dashboard.statAttempts} value={totalAttempts} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.dashboard.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.subtitle}</p>
        </div>
        {tab === "tests" ? (
          <Button onClick={newTestClick}>
            <Plus className="mr-2 h-4 w-4" />
            {t.dashboard.newQuiz}
          </Button>
        ) : (
          <Link to="/groups">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t.groups.newGroup}
            </Button>
          </Link>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "tests" | "groups")}>
        <TabsList className="mb-6">
          <TabsTrigger value="tests" className="gap-2">
            <FileText className="h-4 w-4" />
            {t.dashboard.tabTests}
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            {t.dashboard.tabGroups}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests">
          {loading ? (
            <SkeletonGrid />
          ) : tests.length === 0 ? (
            <EmptyCard
              title={t.dashboard.emptyTitle}
              desc={t.dashboard.emptyDesc}
              cta={t.dashboard.emptyCta}
              onClick={newTestClick}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {tests.slice((testsPage - 1) * PAGE_SIZE, testsPage * PAGE_SIZE).map((tt) => {
                  const groupName = groups.find((g) => g.id === tt.group_id)?.name;
                  return (
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
                      {!tt.is_public && groupName && (
                        <p className="mt-2 text-xs font-medium text-accent-foreground">{t.dashboard.forGroup(groupName)}</p>
                      )}
                      {!tt.is_public && tt.access_code && (
                        <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
                          <span className="font-mono text-sm tracking-wider">{tt.access_code}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyCode(tt.access_code!)}
                            aria-label={t.groups.copyCode}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
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
                  );
                })}
              </div>
              <PaginationBar page={testsPage} pageSize={PAGE_SIZE} total={tests.length} onChange={setTestsPage} />
            </>
          )}
        </TabsContent>

        <TabsContent value="groups">
          {loading ? (
            <SkeletonGrid />
          ) : groups.length === 0 ? (
            <EmptyCard
              title={t.groups.emptyTitle}
              desc={t.groups.emptyDesc}
              cta={t.groups.emptyCta}
              onClick={() => navigate({ to: "/groups" })}
              icon={<Users className="mx-auto h-10 w-10 text-muted-foreground" />}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((g) => (
                <div key={g.id} className="rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-semibold leading-snug sm:text-xl">{g.name}</h3>
                      {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteGroup(g.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={t.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{t.groups.cardTests(g.testCount)}</p>
                  {g.activeTest ? (
                    <div className="mt-3 rounded-xl border bg-muted/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.groups.activeTest}</p>
                      <p className="mt-1 truncate text-sm font-medium">{g.activeTest.title}</p>
                      {g.activeTest.access_code && (
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-background px-2.5 py-1.5">
                          <span className="font-mono text-sm tracking-wider">{g.activeTest.access_code}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyCode(g.activeTest!.access_code!)}
                            aria-label={t.groups.copyCode}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">{t.groups.noActiveTest}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl border bg-muted/40" />
      ))}
    </div>
  );
}

function EmptyCard({
  title,
  desc,
  cta,
  onClick,
  icon,
}: {
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
      {icon}
      <h2 className={`font-display text-2xl font-semibold ${icon ? "mt-4" : ""}`}>{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">{desc}</p>
      <Button className="mt-6" onClick={onClick}>
        <Plus className="mr-2 h-4 w-4" />
        {cta}
      </Button>
    </div>
  );
}
