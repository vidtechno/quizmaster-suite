import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { safeMutation, safeQuery } from "@/lib/safe-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, UserPlus, Users, Trash2, Copy, Settings, Trophy, BarChart3, Pencil, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/groups/$id")({
  head: () => ({ meta: [{ title: t.groups.metaTitle }] }),
  component: GroupDetailPage,
});

type Member = {
  id: string;
  user_id: string;
  attempts_limit: number;
  joined_via: string;
  joined_at: string;
  username: string;
  full_name: string;
  phone: string;
  attemptsUsed: number;
};

type Attempt = {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  attempt_number: number;
  score: number;
  total_questions: number;
  time_spent: number;
  submitted_at: string;
  answers_log: any;
};

function GroupDetailPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<{ id: string; name: string; description: string | null; member_limit: number | null } | null>(null);
  const [activeTest, setActiveTest] = useState<{ id: string; title: string; access_code: string | null } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [adding, setAdding] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLimit, setEditLimit] = useState<string>("");

  const [limitMember, setLimitMember] = useState<Member | null>(null);
  const [limitVal, setLimitVal] = useState<number>(1);

  const [openAttempt, setOpenAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const { data: g, error: gErr } = await supabase
        .from("groups")
        .select("id, name, description, member_limit, creator_id")
        .eq("id", id)
        .maybeSingle();
      if (gErr || !g || g.creator_id !== user.id) {
        toast.error(t.editQuiz.notYours);
        navigate({ to: "/groups" });
        return;
      }
      setGroup({ id: g.id, name: g.name, description: g.description, member_limit: g.member_limit });
      setEditName(g.name);
      setEditDesc(g.description ?? "");
      setEditLimit(g.member_limit?.toString() ?? "");

      // active test
      const { data: ts } = await supabase
        .from("tests")
        .select("id, title, access_code, is_public")
        .eq("group_id", id)
        .eq("is_public", false)
        .maybeSingle();
      if (ts) setActiveTest({ id: ts.id, title: ts.title, access_code: ts.access_code });
      else setActiveTest(null);

      // members
      const { data: ms } = await supabase
        .from("group_members")
        .select("id, user_id, attempts_limit, joined_via, joined_at")
        .eq("group_id", id)
        .order("joined_at", { ascending: false });
      const memberRows = ms ?? [];
      const userIds = memberRows.map((m: any) => m.user_id);
      let pmap: Record<string, { username: string; full_name: string; phone: string }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, full_name, phone")
          .in("id", userIds);
        (profs ?? []).forEach((p: any) => {
          pmap[p.id] = { username: p.username, full_name: p.full_name, phone: p.phone };
        });
      }

      // attempts (only if there's an active test)
      let attemptsByUser: Record<string, Attempt[]> = {};
      let allAttempts: Attempt[] = [];
      if (ts?.id) {
        const { data: as_ } = await supabase
          .from("test_attempts")
          .select("id, user_id, attempt_number, score, total_questions, time_spent, submitted_at, status, answers_log")
          .eq("test_id", ts.id)
          .eq("status", "completed")
          .order("submitted_at", { ascending: false });
        (as_ ?? []).forEach((a: any) => {
          const row: Attempt = {
            id: a.id,
            user_id: a.user_id,
            username: pmap[a.user_id]?.username ?? "—",
            full_name: pmap[a.user_id]?.full_name ?? "—",
            attempt_number: a.attempt_number,
            score: a.score,
            total_questions: a.total_questions,
            time_spent: a.time_spent,
            submitted_at: a.submitted_at,
            answers_log: a.answers_log,
          };
          if (!attemptsByUser[a.user_id]) attemptsByUser[a.user_id] = [];
          attemptsByUser[a.user_id].push(row);
          allAttempts.push(row);
        });
      }
      setAttempts(allAttempts);

      setMembers(
        memberRows.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          attempts_limit: m.attempts_limit,
          joined_via: m.joined_via,
          joined_at: m.joined_at,
          username: pmap[m.user_id]?.username ?? "—",
          full_name: pmap[m.user_id]?.full_name ?? "—",
          phone: pmap[m.user_id]?.phone ?? "—",
          attemptsUsed: attemptsByUser[m.user_id]?.length ?? 0,
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
  }, [user, id]);

  async function addMember() {
    if (!addUsername.trim()) return;
    setAdding(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", addUsername.trim().replace(/^@/, ""))
      .maybeSingle();
    if (!prof) {
      setAdding(false);
      toast.error(t.groups.userNotFound);
      return;
    }
    if (group?.member_limit && members.length >= group.member_limit) {
      setAdding(false);
      toast.error(t.dashboard.groupFull);
      return;
    }
    const ok = await safeMutation(() =>
      supabase.from("group_members").insert({ group_id: id, user_id: prof.id, joined_via: "manual" }),
    );
    setAdding(false);
    if (!ok) return;
    toast.success(t.groups.memberAdded);
    setAddUsername("");
    setAddOpen(false);
    load();
  }

  async function removeMember(m: Member) {
    if (!confirm(t.groups.confirmRemove)) return;
    const ok = await safeMutation(() => supabase.from("group_members").delete().eq("id", m.id));
    if (!ok) return;
    toast.success(t.groups.memberRemoved);
    setMembers((ms) => ms.filter((x) => x.id !== m.id));
  }

  async function saveLimit() {
    if (!limitMember) return;
    const ok = await safeMutation(() =>
      supabase.from("group_members").update({ attempts_limit: limitVal }).eq("id", limitMember.id),
    );
    if (!ok) return;
    toast.success(t.groups.limitUpdated);
    setMembers((ms) => ms.map((x) => (x.id === limitMember.id ? { ...x, attempts_limit: limitVal } : x)));
    setLimitMember(null);
  }

  async function saveGroup() {
    if (!editName.trim()) {
      toast.error(t.validate.fieldRequired);
      return;
    }
    const lim = editLimit.trim() ? Math.max(1, parseInt(editLimit) || 1) : null;
    const ok = await safeMutation(() =>
      supabase
        .from("groups")
        .update({ name: editName.trim(), description: editDesc.trim() || null, member_limit: lim })
        .eq("id", id),
    );
    if (!ok) return;
    toast.success(t.groups.updated);
    setEditOpen(false);
    load();
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code).then(
      () => toast.success(t.groups.codeCopied),
      () => toast.error(t.err.generic),
    );
  }

  const stats = useMemo(() => {
    const total = attempts.length;
    const avg = total
      ? Math.round(attempts.reduce((s, a) => s + (a.score / Math.max(1, a.total_questions)) * 100, 0) / total)
      : 0;
    const unique = new Set(attempts.map((a) => a.user_id)).size;
    return { total, avg, unique };
  }, [attempts]);

  if (authLoading || loading || !group) {
    return <div className="mx-auto max-w-5xl px-4 py-12">{t.loading}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <Link to="/groups" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.groups.backToGroups}
      </Link>

      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border bg-gradient-mesh p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.dashboard.tabGroups}</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{group.name}</h1>
            {group.description && <p className="mt-2 max-w-2xl text-muted-foreground">{group.description}</p>}
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> {t.edit}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat
            label={t.dashboard.statMembers}
            value={`${members.length}${group.member_limit ? `/${group.member_limit}` : ""}`}
            icon={Users}
          />
          <MiniStat label={t.results.statAttempts} value={stats.total} icon={Trophy} />
          <MiniStat label="Test ishlaganlar" value={stats.unique} icon={Users} />
          <MiniStat label={t.results.statAvg} value={`${stats.avg}%`} icon={BarChart3} />
        </div>

        {activeTest && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-card/80 p-4 backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.groups.activeTest}</p>
              <p className="mt-0.5 truncate font-display font-semibold">{activeTest.title}</p>
            </div>
            {activeTest.access_code && (
              <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
                <span className="font-mono text-sm font-bold tracking-widest">{activeTest.access_code}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyCode(activeTest.access_code!)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <Link to="/quiz/$id/edit" params={{ id: activeTest.id }}>
              <Button size="sm" variant="outline" className="rounded-full">
                <Settings className="mr-2 h-3.5 w-3.5" /> {t.edit}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{t.groups.members}</h2>
          <Button onClick={() => setAddOpen(true)} className="rounded-full bg-gradient-hero shadow-glow">
            <UserPlus className="mr-2 h-4 w-4" /> {t.groups.addMember}
          </Button>
        </div>

        {members.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center text-muted-foreground shadow-card">
            <Users className="mx-auto mb-3 h-8 w-8 opacity-60" />
            {t.groups.noMembers}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">{t.results.user}</th>
                    <th className="hidden px-4 py-3 text-left sm:table-cell">{t.results.phone}</th>
                    <th className="px-4 py-3 text-right">{t.groups.attemptsUsedCol}</th>
                    <th className="hidden px-4 py-3 text-right md:table-cell">{t.groups.joinedCol}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.full_name}</div>
                        <div className="text-xs text-muted-foreground">@{m.username}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{m.phone}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold">{m.attemptsUsed}</span>
                        <span className="text-muted-foreground"> / {m.attempts_limit}</span>
                      </td>
                      <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground md:table-cell">
                        {new Date(m.joined_at).toLocaleDateString()} · {m.joined_via === "code" ? t.groups.joinedViaCode : t.groups.joinedViaManual}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => {
                            setLimitVal(m.attempts_limit);
                            setLimitMember(m);
                          }}
                        >
                          {t.groups.setLimit}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="ml-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember(m)}
                          aria-label={t.remove}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Activity */}
      <div>
        <h2 className="mb-4 font-display text-xl font-semibold sm:text-2xl">{t.groups.activity}</h2>
        {attempts.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center text-muted-foreground shadow-card">
            {t.groups.noActivity}
          </div>
        ) : (
          <div className="space-y-2">
            {attempts.slice(0, 50).map((a) => {
              const pct = Math.round((a.score / Math.max(1, a.total_questions)) * 100);
              const tone = pct >= 70 ? "text-success" : pct >= 50 ? "text-accent" : "text-destructive";
              return (
                <button
                  key={a.id}
                  onClick={() => setOpenAttempt(a)}
                  className="flex w-full flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant sm:p-4"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold ${tone}`}>
                    {pct}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.full_name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      <span>@{a.username}</span>
                      <span>·</span>
                      <span>{t.results.attemptN(a.attempt_number)}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.floor(a.time_spent / 60)}m {a.time_spent % 60}s
                      </span>
                      <span>·</span>
                      <span>{new Date(a.submitted_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-primary">{t.details}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.groups.addMember}</DialogTitle>
            <DialogDescription>{t.groups.addMemberByUsername}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="add-username">{t.signup.username}</Label>
            <Input
              id="add-username"
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              placeholder={t.groups.addMemberPh}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addMember()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-full">
              {t.cancel}
            </Button>
            <Button onClick={addMember} disabled={adding} className="rounded-full bg-gradient-hero">
              {adding ? t.groups.adding : t.groups.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set limit dialog */}
      <Dialog open={!!limitMember} onOpenChange={(o) => !o && setLimitMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.groups.setLimit}</DialogTitle>
            <DialogDescription>
              {limitMember?.full_name} (@{limitMember?.username})
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="lim">{t.groups.attemptsLimitCol}</Label>
            <Input
              id="lim"
              type="number"
              min={1}
              max={100}
              value={limitVal}
              onChange={(e) => setLimitVal(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitMember(null)} className="rounded-full">
              {t.cancel}
            </Button>
            <Button onClick={saveLimit} className="rounded-full bg-gradient-hero">
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit group dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="g-name">{t.groups.nameLabel}</Label>
              <Input id="g-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="g-desc">{t.groups.descLabel}</Label>
              <Input id="g-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="g-lim">{t.groups.memberLimitLabel}</Label>
              <Input
                id="g-lim"
                type="number"
                min={1}
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value)}
                placeholder={t.groups.memberLimitPh}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t.groups.memberLimitHint}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-full">
              {t.cancel}
            </Button>
            <Button onClick={saveGroup} className="rounded-full bg-gradient-hero">
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attempt review dialog */}
      <Dialog open={!!openAttempt} onOpenChange={(o) => !o && setOpenAttempt(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {openAttempt && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{openAttempt.full_name}</DialogTitle>
                <DialogDescription>
                  @{openAttempt.username} · {t.results.attemptN(openAttempt.attempt_number)} · {openAttempt.score}/
                  {openAttempt.total_questions} · {Math.floor(openAttempt.time_spent / 60)}m {openAttempt.time_spent % 60}s
                </DialogDescription>
              </DialogHeader>
              <AttemptReview log={Array.isArray(openAttempt.answers_log) ? openAttempt.answers_log : []} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttemptReview({ log }: { log: any[] }) {
  if (!log.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div className="space-y-3">
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

function MiniStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3 backdrop-blur sm:p-4">
      <div className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold sm:text-xl">{value}</p>
    </div>
  );
}
