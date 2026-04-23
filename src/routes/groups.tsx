import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { safeMutation, safeQuery } from "@/lib/safe-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Users, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { HelpHint } from "@/components/HelpHint";

export const Route = createFileRoute("/groups")({
  head: () => ({ meta: [{ title: t.groups.metaTitle }] }),
  component: GroupsPage,
});

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  testCount: number;
  activeTest: { id: string; title: string; access_code: string | null } | null;
};

function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [nameErr, setNameErr] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const data = await safeQuery(
      () =>
        supabase
          .from("groups")
          .select("id, name, description, created_at, tests(id, title, access_code, is_public)")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false }),
      { fallback: [] as any[] },
    );
    const rows: GroupRow[] = (data ?? []).map((g: any) => {
      const tests = Array.isArray(g.tests) ? g.tests : [];
      const active = tests.find((tt: any) => tt.is_public === false) ?? null;
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        created_at: g.created_at,
        testCount: tests.length,
        activeTest: active ? { id: active.id, title: active.title, access_code: active.access_code } : null,
      };
    });
    setGroups(rows);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function create() {
    if (!user) return;
    if (!name.trim()) {
      setNameErr(true);
      return;
    }
    setCreating(true);
    const ok = await safeMutation(() =>
      supabase.from("groups").insert({ creator_id: user.id, name: name.trim(), description: desc.trim() || null }),
    );
    setCreating(false);
    if (!ok) return;
    toast.success(t.groups.created);
    setName("");
    setDesc("");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
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

  if (authLoading || !user) {
    return <div className="mx-auto max-w-6xl px-4 py-12">{t.loading}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t.groups.title}</h1>
            <HelpHint text={t.groups.helpWhy} />
          </div>
          <p className="mt-2 text-muted-foreground">{t.groups.subtitle}</p>
        </div>
        <NewGroupDialog
          open={open}
          setOpen={setOpen}
          name={name}
          setName={(v) => {
            setName(v);
            if (v.trim()) setNameErr(false);
          }}
          nameErr={nameErr}
          desc={desc}
          setDesc={setDesc}
          creating={creating}
          onCreate={create}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl font-semibold">{t.groups.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t.groups.emptyDesc}</p>
          <Button className="mt-6" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t.groups.emptyCta}
          </Button>
        </div>
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
                  onClick={() => remove(g.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={t.delete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {t.groups.cardTests(g.testCount)}
                </span>
              </div>
              {g.activeTest ? (
                <div className="mt-4 rounded-xl border bg-muted/30 p-3">
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
                <p className="mt-4 text-xs text-muted-foreground">{t.groups.noActiveTest}</p>
              )}
              <div className="mt-4">
                <Link to="/quiz/new">
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    {t.dashboard.newQuiz}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewGroupDialog({
  open,
  setOpen,
  name,
  setName,
  nameErr,
  desc,
  setDesc,
  creating,
  onCreate,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  name: string;
  setName: (v: string) => void;
  nameErr: boolean;
  desc: string;
  setDesc: (v: string) => void;
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t.groups.newGroup}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.groups.newGroup}</DialogTitle>
          <DialogDescription>{t.groups.helpWhy}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="group-name">{t.groups.nameLabel}</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.groups.namePh}
              className={nameErr ? "border-destructive ring-1 ring-destructive/40" : ""}
              autoFocus
            />
            {nameErr && <p className="mt-1 text-xs text-destructive">{t.validate.fieldRequired}</p>}
          </div>
          <div>
            <Label htmlFor="group-desc">{t.groups.descLabel}</Label>
            <Textarea id="group-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t.groups.descPh} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
          <Button onClick={onCreate} disabled={creating}>
            {creating ? t.groups.creating : t.groups.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
