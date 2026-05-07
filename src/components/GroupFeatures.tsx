import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Megaphone,
  BarChart3,
  Send,
  Trash2,
  Plus,
  X,
  ClipboardList,
  Paperclip,
  Download,
  Upload,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

type Msg = { id: string; user_id: string; content: string; created_at: string };
type Ann = { id: string; title: string; body: string; created_at: string; creator_id: string };
type Assignment = {
  id: string;
  title: string;
  description: string | null;
  test_id: string;
  due_at: string | null;
  created_at: string;
  creator_id: string;
};
type GFile = {
  id: string;
  name: string;
  storage_path: string | null;
  url: string | null;
  size_bytes: number | null;
  mime: string | null;
  created_at: string;
  uploader_id: string;
};

type TabKey = "chat" | "ann" | "assignments" | "files" | "stats";

export function GroupFeatures({ groupId, isCreator }: { groupId: string; isCreator: boolean }) {
  const [tab, setTab] = useState<TabKey>("chat");

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap gap-2">
        <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageCircle}>
          {t.groups.tabChat}
        </TabBtn>
        <TabBtn active={tab === "ann"} onClick={() => setTab("ann")} icon={Megaphone}>
          {t.groups.tabAnnouncements}
        </TabBtn>
        <TabBtn active={tab === "assignments"} onClick={() => setTab("assignments")} icon={ClipboardList}>
          {t.groups.tabAssignments}
        </TabBtn>
        <TabBtn active={tab === "files"} onClick={() => setTab("files")} icon={Paperclip}>
          {t.groups.tabFiles}
        </TabBtn>
        <TabBtn active={tab === "stats"} onClick={() => setTab("stats")} icon={BarChart3}>
          {t.groups.tabStats}
        </TabBtn>
      </div>
      {tab === "chat" && <ChatPanel groupId={groupId} />}
      {tab === "ann" && <AnnouncementsPanel groupId={groupId} isCreator={isCreator} />}
      {tab === "assignments" && <AssignmentsPanel groupId={groupId} isCreator={isCreator} />}
      {tab === "files" && <FilesPanel groupId={groupId} isCreator={isCreator} />}
      {tab === "stats" && <StatsPanel groupId={groupId} />}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
        active ? "bg-gradient-hero text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

/* ----------------------------- CHAT ----------------------------- */

function formatDay(d: string, locale: string) {
  const date = new Date(d);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yest)) return "Yesterday";
  return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

function ChatPanel({ groupId }: { groupId: string }) {
  const { user } = useAuth();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [authors, setAuthors] = useState<Record<string, { name: string; avatar?: string | null }>>({});
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("group_messages")
      .select("id,user_id,content,created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(300);
    const list = (data || []) as Msg[];
    setMsgs(list);
    const ids = Array.from(new Set(list.map((m) => m.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,username,avatar_url")
        .in("id", ids);
      const map: Record<string, { name: string; avatar?: string | null }> = {};
      (profs || []).forEach((p: any) => (map[p.id] = { name: p.full_name || p.username, avatar: p.avatar_url }));
      setAuthors(map);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (!authors[m.user_id]) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("id,full_name,username,avatar_url")
              .eq("id", m.user_id)
              .maybeSingle();
            if (prof) {
              setAuthors((a) => ({
                ...a,
                [m.user_id]: { name: (prof as any).full_name || (prof as any).username, avatar: (prof as any).avatar_url },
              }));
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const old = payload.old as { id: string };
          setMsgs((prev) => prev.filter((x) => x.id !== old.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const send = async () => {
    const v = text.trim();
    if (!v || !user) return;
    setText("");
    const { error } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, user_id: user.id, content: v });
    if (error) toast.error(error.message);
  };

  const del = async (id: string) => {
    await supabase.from("group_messages").delete().eq("id", id);
  };

  // Group msgs by day
  const grouped = useMemo(() => {
    const out: Array<{ day: string; items: Msg[] }> = [];
    let last = "";
    for (const m of msgs) {
      const day = new Date(m.created_at).toDateString();
      if (day !== last) {
        out.push({ day: m.created_at, items: [] });
        last = day;
      }
      out[out.length - 1].items.push(m);
    }
    return out;
  }, [msgs]);

  return (
    <Card className="flex h-[520px] flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="text-center text-sm text-muted-foreground">"…"</p>}
        {grouped.map((bucket, i) => (
          <div key={i} className="space-y-2">
            <div className="sticky top-0 z-10 mx-auto w-max rounded-full bg-muted/80 px-3 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
              {formatDay(bucket.day, "uz-UZ")}
            </div>
            {bucket.items.map((m, idx) => {
              const mine = m.user_id === user?.id;
              const prev = bucket.items[idx - 1];
              const sameAuthor = prev && prev.user_id === m.user_id;
              const a = authors[m.user_id];
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && (
                    <div className="h-7 w-7 shrink-0">
                      {!sameAuthor && (
                        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-hero text-[10px] font-semibold text-primary-foreground">
                          {a?.avatar ? (
                            <img src={a.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (a?.name?.[0] || "?").toUpperCase()
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`group max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted"
                    }`}
                  >
                    {!mine && !sameAuthor && (
                      <div className="mb-0.5 text-[11px] font-semibold opacity-70">{a?.name || "…"}</div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] opacity-60">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {mine && (
                        <button onClick={() => del(m.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="..."
          rows={1}
          className="max-h-32 min-h-[40px] resize-none"
        />
        <Button onClick={send} className="rounded-full bg-gradient-hero shadow-glow" disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

/* -------------------------- ANNOUNCEMENTS -------------------------- */

function AnnouncementsPanel({ groupId, isCreator }: { groupId: string; isCreator: boolean }) {
  const { user } = useAuth();

  const [items, setItems] = useState<Ann[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("group_announcements")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    setItems((data as Ann[]) || []);
  };
  useEffect(() => {
    load();
  }, [groupId]);

  const post = async () => {
    if (!title.trim() || !body.trim() || !user) return;
    const { error } = await supabase
      .from("group_announcements")
      .insert({ group_id: groupId, creator_id: user.id, title: title.trim(), body: body.trim() });
    if (error) return toast.error(error.message);
    setTitle("");
    setBody("");
    setOpen(false);
    toast.success("✓");
    load();
  };

  const del = async (id: string) => {
    await supabase.from("group_announcements").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      {isCreator && (
        <Card className="p-4">
          {!open ? (
            <Button onClick={() => setOpen(true)} className="rounded-full bg-gradient-hero shadow-glow">
              <Plus className="mr-2 h-4 w-4" /> {t.groups.newAssignment}
            </Button>
          ) : (
            <div className="space-y-2">
              <Input placeholder={t.groups.assignmentTitle} value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button onClick={post} className="rounded-full">
                  {t.save}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t.groups.noAssignments}</Card>
      ) : (
        items.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-lg font-semibold">{a.title}</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              {(isCreator || a.creator_id === user?.id) && (
                <Button size="icon" variant="ghost" onClick={() => del(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

/* --------------------------- ASSIGNMENTS --------------------------- */

function AssignmentsPanel({ groupId, isCreator }: { groupId: string; isCreator: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [tests, setTests] = useState<{ id: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [testId, setTestId] = useState("");
  const [due, setDue] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("group_assignments")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    setItems((data as Assignment[]) || []);
  };
  const loadTests = async () => {
    const { data } = await supabase
      .from("test_groups")
      .select("test_id, tests(id,title)")
      .eq("group_id", groupId);
    const list = (data || [])
      .map((r: any) => r.tests)
      .filter(Boolean)
      .map((tt: any) => ({ id: tt.id, title: tt.title }));
    setTests(list);
  };
  useEffect(() => {
    load();
    loadTests();
  }, [groupId]);

  const create = async () => {
    if (!title.trim() || !testId || !user) return toast.error("?");
    const { error } = await supabase.from("group_assignments").insert({
      group_id: groupId,
      creator_id: user.id,
      title: title.trim(),
      description: desc.trim() || null,
      test_id: testId,
      due_at: due ? new Date(due).toISOString() : null,
    });
    if (error) return toast.error(error.message);
    setTitle("");
    setDesc("");
    setTestId("");
    setDue("");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    await supabase.from("group_assignments").delete().eq("id", id);
    load();
  };

  const testTitle = (id: string) => tests.find((tt) => tt.id === id)?.title ?? "—";

  return (
    <div className="space-y-4">
      {isCreator && (
        <Card className="p-4">
          {!open ? (
            <Button onClick={() => setOpen(true)} className="rounded-full bg-gradient-hero shadow-glow">
              <Plus className="mr-2 h-4 w-4" /> {t.groups.newAssignment}
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder={t.groups.assignmentTitle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={testId}
                onChange={(e) => setTestId(e.target.value)}
              >
                <option value="">{t.groups.assignmentTest} —</option>
                {tests.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.title}
                  </option>
                ))}
              </select>
              <Input
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                placeholder={t.groups.assignmentDue}
              />
              <Textarea
                placeholder={t.groups.assignmentDesc}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button onClick={create} className="rounded-full">
                  {t.save}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t.groups.noAssignments}</Card>
      ) : (
        items.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-lg font-semibold">{a.title}</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">📝 {testTitle(a.test_id)}</p>
                {a.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.description}</p>
                )}
                {a.due_at && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                    <Calendar className="h-3 w-3" /> {t.groups.due}: {new Date(a.due_at).toLocaleString()}
                  </p>
                )}
              </div>
              {isCreator && (
                <Button size="icon" variant="ghost" onClick={() => del(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

/* ------------------------------ FILES ------------------------------ */

function fmtSize(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function FilesPanel({ groupId, isCreator }: { groupId: string; isCreator: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<GFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("group_files")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    setItems((data as GFile[]) || []);
  };
  useEffect(() => {
    load();
  }, [groupId]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Max 25 MB");
      return;
    }
    if (!isSafeUploadFile(file)) {
      toast.error("Bunday turdagi fayl ruxsat etilmagan");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const path = `${groupId}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("group-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("group_files").insert({
        group_id: groupId,
        uploader_id: user.id,
        name: file.name,
        storage_path: path,
        size_bytes: file.size,
        mime: file.type || null,
      });
      if (dbErr) throw dbErr;
      toast.success("✓");
      load();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const download = async (f: GFile) => {
    if (!f.storage_path) return;
    const { data, error } = await supabase.storage
      .from("group-files")
      .createSignedUrl(f.storage_path, 60 * 5);
    if (error || !data?.signedUrl) return toast.error(error?.message || "?");
    window.open(data.signedUrl, "_blank");
  };

  const del = async (f: GFile) => {
    if (f.storage_path) {
      await supabase.storage.from("group-files").remove([f.storage_path]);
    }
    await supabase.from("group_files").delete().eq("id", f.id);
    load();
  };

  return (
    <div className="space-y-4">
      {isCreator && (
        <Card className="p-4">
          <input ref={inputRef} type="file" hidden onChange={onPick} />
          <Button
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-gradient-hero shadow-glow"
          >
            <Upload className="mr-2 h-4 w-4" /> {uploading ? "…" : t.groups.uploadFile}
          </Button>
        </Card>
      )}
      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t.groups.noFiles}</Card>
      ) : (
        <div className="space-y-2">
          {items.map((f) => (
            <Card key={f.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtSize(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => download(f)}>
                  <Download className="h-4 w-4" />
                </Button>
                {(isCreator || f.uploader_id === user?.id) && (
                  <Button size="icon" variant="ghost" onClick={() => del(f)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ STATS ------------------------------ */

function StatsPanel({ groupId }: { groupId: string }) {

  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    supabase.rpc("get_group_stats", { _group_id: groupId }).then(({ data }) => setStats(data));
  }, [groupId]);
  if (!stats) return <Card className="p-8 text-center text-muted-foreground">…</Card>;
  const days: { day: string; count: number }[] = stats.attempts_by_day || [];
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="A'zolar" value={stats.members} />
        <StatBox label="Testlar" value={stats.tests} />
        <StatBox label={t.groups.allAttempts} value={stats.attempts} />
        <StatBox label={t.groups.avgScore} value={`${stats.avg_score}%`} />
      </div>
      <Card className="p-4">
        <h4 className="mb-3 text-sm font-semibold">{t.groups.activity} (14 kun)</h4>
        {days.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Hali ma'lumot yo'q</p>
        ) : (
          <div className="flex h-40 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
                <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{d.count}</div>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-primary to-primary/50 transition-all"
                  style={{ height: `${(d.count / max) * 100}%`, minHeight: "4px" }}
                />
                <div className="text-[9px] text-muted-foreground">{d.day.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: any }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Card>
  );
}
