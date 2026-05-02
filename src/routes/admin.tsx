import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  FileText,
  Layers,
  Activity,
  Search,
  Trash2,
  Shield,
  ShieldOff,
  TrendingUp,
  Award,
  Sparkles,
  Crown,
  ArrowLeft,
  RefreshCw,
  Calendar,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin panel — MegaPanel.uz" }] }),
  component: AdminPage,
});

type Stats = {
  users: number;
  tests: number;
  groups: number;
  questions: number;
  attempts: number;
  completed_attempts: number;
  group_members: number;
  test_groups: number;
  users_today: number;
  users_7d: number;
  tests_7d: number;
  attempts_7d: number;
  avg_score: number;
  admins: number;
};

type UserRow = {
  id: string;
  full_name: string;
  username: string;
  phone: string;
  created_at: string;
  is_admin: boolean;
  test_count: number;
  attempt_count: number;
};

type TestRow = {
  id: string;
  title: string;
  test_code: string;
  creator_id: string;
  creator_name: string | null;
  created_at: string;
  question_count: number;
  attempt_count: number;
};

type GroupRow = {
  id: string;
  name: string;
  access_code: string;
  creator_id: string;
  creator_name: string | null;
  created_at: string;
  member_count: number;
  test_count: number;
};

type ActivityRow = { kind: string; title: string; subtitle: string; at: string };

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "user" | "test" | "group"; id: string; label: string }
  >(null);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate({ to: "/login" });
      else if (!isAdmin) navigate({ to: "/dashboard" });
    }
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  async function refreshAll() {
    setBusy(true);
    try {
      const [s, a] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("admin_recent_activity", { _limit: 30 }),
      ]);
      if (s.data) setStats(s.data as unknown as Stats);
      if (a.data) setActivity(a.data as unknown as ActivityRow[]);
      await loadTab(tab, q);
    } finally {
      setBusy(false);
    }
  }

  async function loadTab(which: string, query: string) {
    if (which === "users") {
      const { data } = await supabase.rpc("admin_search_users", { _q: query, _limit: 100 });
      if (data) setUsers(data as unknown as UserRow[]);
    } else if (which === "tests") {
      const { data } = await supabase.rpc("admin_list_tests", { _q: query, _limit: 100 });
      if (data) setTests(data as unknown as TestRow[]);
    } else if (which === "groups") {
      const { data } = await supabase.rpc("admin_list_groups", { _q: query, _limit: 100 });
      if (data) setGroups(data as unknown as GroupRow[]);
    }
  }

  useEffect(() => {
    if (isAdmin) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const id = setTimeout(() => loadTab(tab, q), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, isAdmin]);

  async function toggleAdmin(uid: string) {
    const { data, error } = await supabase.rpc("admin_toggle_admin", { _user_id: uid });
    if (error) return toast.error("Xatolik: " + error.message);
    toast.success((data as any)?.is_admin ? "Admin qilindi" : "Admin huquqi olib tashlandi");
    loadTab("users", q);
  }

  async function doDelete() {
    if (!confirm) return;
    const fn =
      confirm.kind === "user" ? "admin_delete_user" : confirm.kind === "test" ? "admin_delete_test" : "admin_delete_group";
    const arg =
      confirm.kind === "user" ? { _user_id: confirm.id } : confirm.kind === "test" ? { _test_id: confirm.id } : { _group_id: confirm.id };
    const { error } = await supabase.rpc(fn as any, arg as any);
    if (error) toast.error("Xatolik: " + error.message);
    else {
      toast.success("O'chirildi");
      refreshAll();
    }
    setConfirm(null);
  }

  const completionRate = useMemo(() => {
    if (!stats || stats.attempts === 0) return 0;
    return Math.round((stats.completed_attempts / stats.attempts) * 100);
  }, [stats]);

  if (authLoading || adminLoading || !user || !isAdmin) {
    return <div className="mx-auto max-w-6xl px-4 py-12">Yuklanmoqda…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Boshqaruv
          </Link>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={refreshAll} disabled={busy}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Yangilash
        </Button>
      </div>

      <div className="mb-6 rounded-3xl border bg-gradient-mesh p-5 shadow-card sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin panel</p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Boshqaruv markazi</h1>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 grid w-full grid-cols-4 rounded-full">
          <TabsTrigger value="overview" className="rounded-full">Umumiy</TabsTrigger>
          <TabsTrigger value="users" className="rounded-full">Foydalanuvchilar</TabsTrigger>
          <TabsTrigger value="tests" className="rounded-full">Testlar</TabsTrigger>
          <TabsTrigger value="groups" className="rounded-full">Guruhlar</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Users} label="Foydalanuvchilar" value={stats?.users ?? 0} hint={`+${stats?.users_today ?? 0} bugun`} accent="primary" />
            <StatCard icon={FileText} label="Testlar" value={stats?.tests ?? 0} hint={`+${stats?.tests_7d ?? 0} 7 kunda`} accent="accent" />
            <StatCard icon={Layers} label="Guruhlar" value={stats?.groups ?? 0} hint={`${stats?.group_members ?? 0} a'zo`} accent="success" />
            <StatCard icon={Activity} label="Urinishlar" value={stats?.attempts ?? 0} hint={`+${stats?.attempts_7d ?? 0} 7 kunda`} accent="primary" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={HelpCircle} label="Savollar" value={stats?.questions ?? 0} accent="accent" />
            <StatCard icon={Award} label="Tugallangan" value={`${completionRate}%`} hint={`${stats?.completed_attempts ?? 0} ta`} accent="success" />
            <StatCard icon={TrendingUp} label="O'rtacha natija" value={`${stats?.avg_score ?? 0}%`} accent="primary" />
            <StatCard icon={Crown} label="Adminlar" value={stats?.admins ?? 0} accent="accent" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Sparkles} label="Yangi (7 kun)" value={stats?.users_7d ?? 0} accent="primary" />
            <StatCard icon={Calendar} label="Test↔guruh ulanish" value={stats?.test_groups ?? 0} accent="accent" />
            <StatCard
              icon={Activity}
              label="O'rt. urinish/test"
              value={stats && stats.tests > 0 ? Math.round(stats.attempts / stats.tests) : 0}
              accent="success"
            />
            <StatCard
              icon={Users}
              label="O'rt. a'zo/guruh"
              value={stats && stats.groups > 0 ? Math.round(stats.group_members / stats.groups) : 0}
              accent="primary"
            />
          </div>

          <div className="rounded-3xl border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-display text-lg font-semibold">So'nggi faollik</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Hozircha bo'sh.</p>
            ) : (
              <ul className="space-y-2">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border bg-background/50 p-3 text-sm">
                    <ActivityIcon kind={a.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {a.at ? new Date(a.at).toLocaleString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users" className="space-y-4">
          <SearchBar value={q} onChange={setQ} placeholder="Ism, username yoki telefon bo'yicha qidirish…" />
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Foydalanuvchi</th>
                  <th className="px-3 py-2">Telefon</th>
                  <th className="px-3 py-2 text-center">Testlar</th>
                  <th className="px-3 py-2 text-center">Urinishlar</th>
                  <th className="px-3 py-2">Sana</th>
                  <th className="px-3 py-2 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium flex items-center gap-2">
                        {u.full_name}
                        {u.is_admin && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{u.phone}</td>
                    <td className="px-3 py-2 text-center">{u.test_count}</td>
                    <td className="px-3 py-2 text-center">{u.attempt_count}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => toggleAdmin(u.id)}>
                          {u.is_admin ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                        </Button>
                        {u.id !== user.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full h-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirm({ kind: "user", id: u.id, label: u.full_name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      Hech narsa topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TESTS */}
        <TabsContent value="tests" className="space-y-4">
          <SearchBar value={q} onChange={setQ} placeholder="Sarlavha yoki test kodi bo'yicha qidirish…" />
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Test</th>
                  <th className="px-3 py-2">Yaratuvchi</th>
                  <th className="px-3 py-2 text-center">Savollar</th>
                  <th className="px-3 py-2 text-center">Urinishlar</th>
                  <th className="px-3 py-2">Sana</th>
                  <th className="px-3 py-2 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link to="/quiz/$id" params={{ id: t.id }} className="font-medium hover:text-primary">
                        {t.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">{t.test_code}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{t.creator_name ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{t.question_count}</td>
                    <td className="px-3 py-2 text-center">{t.attempt_count}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full h-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirm({ kind: "test", id: t.id, label: t.title })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {tests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      Hech narsa topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* GROUPS */}
        <TabsContent value="groups" className="space-y-4">
          <SearchBar value={q} onChange={setQ} placeholder="Guruh nomi yoki kodi bo'yicha qidirish…" />
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Guruh</th>
                  <th className="px-3 py-2">Yaratuvchi</th>
                  <th className="px-3 py-2 text-center">A'zolar</th>
                  <th className="px-3 py-2 text-center">Testlar</th>
                  <th className="px-3 py-2">Sana</th>
                  <th className="px-3 py-2 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link to="/groups/$id" params={{ id: g.id }} className="font-medium hover:text-primary">
                        {g.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{g.access_code}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{g.creator_name ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{g.member_count}</td>
                    <td className="px-3 py-2 text-center">{g.test_count}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full h-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirm({ kind: "group", id: g.id, label: g.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      Hech narsa topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O'chirishni tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirm?.label}" {confirm?.kind === "user" ? "foydalanuvchisi" : confirm?.kind === "test" ? "testi" : "guruhi"} butunlay
              o'chiriladi. Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive hover:bg-destructive/90">
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "primary" | "accent" | "success";
}) {
  const tone =
    accent === "primary" ? "bg-primary/10 text-primary" : accent === "accent" ? "bg-accent/15 text-accent" : "bg-success/15 text-success";
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-xl font-bold sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9 rounded-full" />
    </div>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const map: Record<string, { icon: any; cls: string }> = {
    user: { icon: Users, cls: "bg-primary/15 text-primary" },
    test: { icon: FileText, cls: "bg-accent/15 text-accent" },
    group: { icon: Layers, cls: "bg-success/15 text-success" },
    attempt: { icon: Award, cls: "bg-primary/10 text-primary" },
  };
  const v = map[kind] ?? map.user;
  const Icon = v.icon;
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${v.cls}`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}
