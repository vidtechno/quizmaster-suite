import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Megaphone, BarChart3, Send, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

type Msg = { id: string; user_id: string; content: string; created_at: string; author?: string };
type Ann = { id: string; title: string; body: string; created_at: string; creator_id: string };

export function GroupFeatures({ groupId, isCreator }: { groupId: string; isCreator: boolean }) {
  const [tab, setTab] = useState<"chat" | "ann" | "stats">("chat");
  const { tr } = useLocale();
  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap gap-2">
        <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageCircle}>
          {tr.chat}
        </TabBtn>
        <TabBtn active={tab === "ann"} onClick={() => setTab("ann")} icon={Megaphone}>
          {tr.announcements}
        </TabBtn>
        <TabBtn active={tab === "stats"} onClick={() => setTab("stats")} icon={BarChart3}>
          {tr.groupStats}
        </TabBtn>
      </div>
      {tab === "chat" && <ChatPanel groupId={groupId} />}
      {tab === "ann" && <AnnouncementsPanel groupId={groupId} isCreator={isCreator} />}
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

function ChatPanel({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { tr } = useLocale();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("group_messages")
      .select("id,user_id,content,created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(200);
    const list = (data || []) as Msg[];
    setMsgs(list);
    const ids = Array.from(new Set(list.map((m) => m.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,username").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => (map[p.id] = p.full_name || p.username));
      setAuthors(map);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`group-chat-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` }, () => load())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [groupId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const send = async () => {
    const v = text.trim();
    if (!v || !user) return;
    setText("");
    const { error } = await supabase.from("group_messages").insert({ group_id: groupId, user_id: user.id, content: v });
    if (error) toast.error(error.message);
  };

  const del = async (id: string) => {
    await supabase.from("group_messages").delete().eq("id", id);
  };

  return (
    <Card className="flex h-[480px] flex-col overflow-hidden">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="text-center text-sm text-muted-foreground">{tr.noMessages}</p>}
        {msgs.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`group max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {!mine && <div className="mb-0.5 text-[11px] font-semibold opacity-70">{authors[m.user_id] || "…"}</div>}
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
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tr.messagePh}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
        />
        <Button onClick={send} className="rounded-full bg-gradient-hero shadow-glow">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function AnnouncementsPanel({ groupId, isCreator }: { groupId: string; isCreator: boolean }) {
  const { user } = useAuth();
  const { tr } = useLocale();
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
    toast.success("E'lon joylandi");
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
              <Plus className="mr-2 h-4 w-4" /> {tr.newAnnouncement}
            </Button>
          ) : (
            <div className="space-y-2">
              <Input placeholder={tr.title} value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder={tr.body} value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button onClick={post} className="rounded-full">{tr.post}</Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{tr.noAnnouncements}</Card>
      ) : (
        items.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-lg font-semibold">{a.title}</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
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

function StatsPanel({ groupId }: { groupId: string }) {
  const { tr } = useLocale();
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
        <StatBox label={tr.attempts} value={stats.attempts} />
        <StatBox label={tr.avg} value={`${stats.avg_score}%`} />
      </div>
      <Card className="p-4">
        <h4 className="mb-3 text-sm font-semibold">{tr.attemptsByDay} (14 kun)</h4>
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
