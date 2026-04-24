import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { TestDraft, QuestionDraft, GroupOption } from "@/components/QuizEditor";
import { EditorSkeleton } from "@/components/EditorSkeleton";
import { safeMutation, safeQuery } from "@/lib/safe-query";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

const QuizEditor = lazy(() => import("@/components/QuizEditor").then((m) => ({ default: m.QuizEditor })));

export const Route = createFileRoute("/quiz/$id/edit")({
  head: () => ({ meta: [{ title: t.editQuiz.metaTitle }] }),
  component: EditQuizPage,
});

function EditQuizPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<TestDraft | null>(null);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: tt, error } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
        if (error || !tt) {
          toast.error(t.editQuiz.notFound);
          return navigate({ to: "/dashboard" });
        }
        if (tt.creator_id !== user.id) {
          toast.error(t.editQuiz.notYours);
          return navigate({ to: "/dashboard" });
        }

        // Load attached groups via test_groups; fall back to legacy group_id.
        const { data: tgs } = await supabase.from("test_groups").select("group_id").eq("test_id", id);
        let groupIds = (tgs ?? []).map((r: any) => r.group_id);
        if (groupIds.length === 0 && tt.group_id) groupIds = [tt.group_id];

        setTest({
          title: tt.title,
          description: tt.description ?? "",
          time_limit_min: Math.round(tt.time_limit / 60),
          random_enabled: tt.random_enabled,
          is_public: tt.is_public,
          access_code: tt.access_code ?? "",
          max_attempts: tt.max_attempts,
          group_ids: groupIds,
          questions_per_attempt: (tt as any).questions_per_attempt ?? null,
        });

        const { data: qs } = await supabase.from("questions").select("*").eq("test_id", id).order("position");
        setQuestions(
          (qs ?? []).map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            options: Array.isArray(q.options) ? q.options : [],
            correct_answer_index: q.correct_answer_index,
            explanation: q.explanation ?? "",
            attempts_count: q.attempts_count ?? 0,
            error_rate: Number(q.error_rate ?? 0),
          })),
        );
        const gs = await safeQuery(
          () => supabase.from("groups").select("id, name").eq("creator_id", user.id).order("created_at", { ascending: false }),
          { fallback: [] as GroupOption[] },
        );
        setGroups(gs ?? []);
      } catch {
        toast.error(t.err.loadFailed);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, navigate]);

  async function handleSubmit(td: TestDraft, qs: QuestionDraft[]) {
    if (!user) return;
    try {
      let accessCode: string | null = td.access_code || null;
      if (!td.is_public && !accessCode) {
        const { data: codeData, error: codeErr } = await supabase.rpc("generate_access_code");
        if (codeErr || !codeData) {
          toast.error(t.err.saveFailed);
          return;
        }
        accessCode = codeData as string;
      }

      const { error: updErr } = await supabase
        .from("tests")
        .update({
          title: td.title.trim(),
          description: td.description.trim() || null,
          time_limit: Math.max(60, td.time_limit_min * 60),
          random_enabled: td.random_enabled,
          is_public: td.is_public,
          access_code: td.is_public ? null : accessCode,
          group_id: null, // legacy: rely on test_groups
          max_attempts: td.max_attempts,
          questions_per_attempt: td.questions_per_attempt,
        })
        .eq("id", id);
      if (updErr) {
        toast.error(t.err.saveFailed);
        return;
      }

      // Sync test_groups: remove all then re-insert chosen ones (small set).
      await safeMutation(() => supabase.from("test_groups").delete().eq("test_id", id));
      if (!td.is_public && td.group_ids.length > 0) {
        const rows = td.group_ids.map((gid) => ({ test_id: id, group_id: gid }));
        const ok = await safeMutation(() => supabase.from("test_groups").insert(rows));
        if (!ok) return;
      }

      // Replace questions: delete + insert (simple, reliable)
      await safeMutation(() => supabase.from("questions").delete().eq("test_id", id));
      const rows = qs.map((q, idx) => ({
        test_id: id,
        question_text: q.question_text.trim(),
        options: q.options.map((o) => o.trim()),
        correct_answer_index: q.correct_answer_index,
        explanation: (q.explanation ?? "").trim() || null,
        position: idx,
      }));
      const ok2 = await safeMutation(() => supabase.from("questions").insert(rows));
      if (!ok2) return;
      toast.success(t.editQuiz.success);
      navigate({ to: "/dashboard" });
    } catch {
      toast.error(t.err.network);
    }
  }

  if (authLoading || loading || !test) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EditorSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 font-display text-3xl font-semibold sm:text-4xl">{t.editQuiz.title}</h1>
      <Suspense fallback={<EditorSkeleton />}>
        <QuizEditor
          initialTest={test}
          initialQuestions={questions}
          submitLabel={t.editQuiz.submit}
          groups={groups}
          onSubmit={handleSubmit}
        />
      </Suspense>
    </div>
  );
}
