import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Users, BarChart3, FileText, Copy, KeyRound, Hash } from "lucide-react";
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
  test_code: string;
  random_enabled: boolean;
  max_attempts: number;
  time_limit: number;
  created_at: string;
  question_count: number;
  attempt_count: number;
  group_count: number;
};

type MyGroup = {
  id: string;
  name: string;
  description: string | null;
  access_code: string;
  testCount: number;
  memberCount: number;
};

function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<MyTest[]>([]);
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tests" | "groups">("tests");
  const [testsPage, setTestsPage] = useState(1);
  const [groupsPage, setGroupsPage] = useState(1);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleJoinByCode() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      toast.error(t.groups.joinNotFound);
      return;
    }
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc("join_group_by_code", { _code: code });
      if (error) {
        toast.error(t.err.generic);
        return;
      }
      const res = data as any;
      if (!res?.ok) {
        const map: Record<string, string> = {
          not_found: t.groups.joinNotFound,
          group_full: t.groups.joinFull,
          unauthorized: t.err.generic,
        };
        toast.error(map[res?.error] ?? t.err.generic);
        return;
      }
      if (res.already) toast.success(t.groups.joinAlready);
      else toast.success(t.groups.joinSuccess);
      setJoinOpen(false);
      setJoinCode("");
      if (res.group_id) navigate({ to: "/groups/$id", params: { id: res.group_id } });
    } catch {
      toast.error(t.err.network);
    } finally {
      setJoining(false);
    }
  }

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
          "id, title, description, test_code, random_enabled, max_attempts, time_limit, created_at, questions(count), test_attempts(count), test_groups(count)",
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
            test_code: tt.test_code,
            random_enabled: tt.random_enabled,
            max_attempts: tt.max_attempts,
            time_limit: tt.time_limit,
            created_at: tt.created_at,
            question_count: tt.questions?.[0]?.count ?? 0,
            attempt_count: tt.test_attempts?.[0]?.count ?? 0,
            group_count: tt.test_groups?.[0]?.count ?? 0,
          })),
        );
      }

      const gData = await safeQuery(
        () =>
          supabase
            .from("groups")
            .select("id, name, description, access_code, test_groups(count), group_members(count)")
            .eq("creator_id", user.id)
            .order("created_at", { ascending: false }),
        { fallback: [] as any[] },
      );
      setGroups(
        (gData ?? []).map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          access_code: g.access_code,
          testCount: g.test_groups?.[0]?.count ?? 0,
          memberCount: g.group_members?.[0]?.count ?? 0,
        })),
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

  function copyCode(code: string, label: string) {
    navigator.clipboard?.writeText(code).then(
      () => toast.success(label),
      () => toast.error(t.err.generic),
    );
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setJoinOpen(true)} className="rounded-full">
            <KeyRound className="mr-2 h-4 w-4" />
            {t.groups.joinByCode}
          </Button>
          <Link to="/groups">
            <Button variant="secondary" className="rounded-full">
              <Users className="mr-2 h-4 w-4" />
              {t.groups.newGroup}
            </Button>
          </Link>
          <Button onClick={() => navigate({ to: "/quiz/new" })}>
            <Plus className="mr-2 h-4 w-4" />
            {t.dashboard.newQuiz}
          </Button>
        </div>
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
              onClick={() => navigate({ to: "/quiz/new" })}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {tests.slice((testsPage - 1) * PAGE_SIZE, testsPage * PAGE_SIZE).map((tt) => (
                  <div
                    key={tt.id}
                    className="rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-semibold leading-snug sm:text-xl">{tt.title}</h3>
                        {tt.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tt.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Test code */}
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t.dashboard.testCode}
                        </span>
                        <span className="font-mono text-base font-bold tracking-widest text-primary">
                          {tt.test_code}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => copyCode(tt.test_code, t.dashboard.copyTestCode)}
                        aria-label={t.copy}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{t.dashboard.questions(tt.question_count)}</span>
                      <span>·</span>
                      <span>{t.dashboard.minutes(Math.round(tt.time_limit / 60))}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {t.dashboard.attempts(tt.attempt_count)}
                      </span>
                      <span>·</span>
                      <span>{t.dashboard.forGroups(tt.group_count)}</span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link to="/quiz/$id/edit" params={{ id: tt.id }}>
                        <Button size="sm" variant="outline">
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          {t.edit}
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
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.slice((groupsPage - 1) * PAGE_SIZE, groupsPage * PAGE_SIZE).map((g) => (
                  <Link
                    key={g.id}
                    to="/groups/$id"
                    params={{ id: g.id }}
                    className="block rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-semibold leading-snug sm:text-xl">{g.name}</h3>
                        {g.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          deleteGroup(g.id);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={t.delete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Group access code */}
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 shrink-0 text-accent" />
                        <span className="font-mono text-sm font-bold tracking-widest text-accent">
                          {g.access_code}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.preventDefault();
                          copyCode(g.access_code, t.groups.codeCopied);
                        }}
                        aria-label={t.copy}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{t.groups.cardTests(g.testCount)}</span>
                      <span>·</span>
                      <span>{t.groups.cardMembers(g.memberCount)}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <PaginationBar page={groupsPage} pageSize={PAGE_SIZE} total={groups.length} onChange={setGroupsPage} />
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {t.groups.joinByCode}
            </DialogTitle>
            <DialogDescription>{t.groups.joinByCodeDesc}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="join-code">{t.groups.code}</Label>
            <Input
              id="join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t.groups.joinCodePh}
              autoFocus
              maxLength={12}
              className="font-mono tracking-widest text-base"
              onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)} className="rounded-full">
              {t.cancel}
            </Button>
            <Button onClick={handleJoinByCode} disabled={joining} className="rounded-full">
              {joining ? t.groups.joining : t.groups.joinSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
