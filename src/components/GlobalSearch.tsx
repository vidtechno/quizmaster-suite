import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { useLocale } from "@/lib/locale";
import { FileText, Users, User } from "lucide-react";

type SearchResult = {
  tests: { id: string; title: string }[];
  groups: { id: string; name: string }[];
  users: { id: string; full_name: string; username: string }[];
};

const Ctx = createContext<{ open: () => void }>({ open: () => {} });

export function useGlobalSearch() {
  return useContext(Ctx);
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult>({ tests: [], groups: [], users: [] });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { tr } = useLocale();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!isOpen || !user) return;
    const term = q.trim();
    const handle = setTimeout(async () => {
      const [tests, groups, users] = await Promise.all([
        supabase.from("tests").select("id,title").ilike("title", `%${term}%`).limit(8),
        supabase.from("groups").select("id,name").ilike("name", `%${term}%`).limit(8),
        isAdmin
          ? supabase.rpc("admin_search_users", { _q: term, _limit: 8 })
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);
      setResults({
        tests: (tests.data as any) || [],
        groups: (groups.data as any) || [],
        users: ((users.data as any) || []).map((u: any) => ({ id: u.id, full_name: u.full_name, username: u.username })),
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [q, isOpen, user, isAdmin]);

  const go = (path: string) => {
    setIsOpen(false);
    navigate({ to: path as any });
  };

  return (
    <Ctx.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput placeholder={tr.searchPh} value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>{tr.searchEmpty}</CommandEmpty>
          {results.tests.length > 0 && (
            <CommandGroup heading={tr.searchTests}>
              {results.tests.map((t) => (
                <CommandItem key={t.id} value={`test-${t.id}-${t.title}`} onSelect={() => go(`/quiz/${t.id}`)}>
                  <FileText className="mr-2 h-4 w-4" /> {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.groups.length > 0 && (
            <CommandGroup heading={tr.searchGroups}>
              {results.groups.map((g) => (
                <CommandItem key={g.id} value={`group-${g.id}-${g.name}`} onSelect={() => go(`/groups/${g.id}`)}>
                  <Users className="mr-2 h-4 w-4" /> {g.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.users.length > 0 && (
            <CommandGroup heading={tr.searchUsers}>
              {results.users.map((u) => (
                <CommandItem key={u.id} value={`user-${u.id}-${u.username}`} onSelect={() => go(`/admin`)}>
                  <User className="mr-2 h-4 w-4" /> {u.full_name} <span className="ml-2 text-muted-foreground">@{u.username}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </Ctx.Provider>
  );
}
