import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Check, AlertCircle, Info, Users, X } from "lucide-react";
import { HelpHint } from "@/components/HelpHint";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type QuestionDraft = {
  id?: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
};

export type TestDraft = {
  title: string;
  description: string;
  time_limit_min: number;
  random_enabled: boolean;
  is_public: boolean;
  access_code: string;
  max_attempts: number;
  /** Multi-group attachments (replaces single group_id) */
  group_ids: string[];
  /** When set, only this many random questions are shown per attempt */
  questions_per_attempt: number | null;
};

export type GroupOption = { id: string; name: string };

type Props = {
  initialTest: TestDraft;
  initialQuestions: QuestionDraft[];
  submitLabel: string;
  groups: GroupOption[];
  onSubmit: (test: TestDraft, questions: QuestionDraft[]) => Promise<void>;
};

type FieldErrors = {
  title?: boolean;
  group?: boolean;
  questions: Array<{ text?: boolean; options?: boolean[] }>;
};

const errBorder = "border-destructive ring-1 ring-destructive/40 focus-visible:ring-destructive";

export function QuizEditor({ initialTest, initialQuestions, submitLabel, groups, onSubmit }: Props) {
  const [test, setTest] = useState<TestDraft>(initialTest);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialQuestions.length ? initialQuestions : [{ question_text: "", options: ["", "", "", ""], correct_answer_index: 0 }],
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({ questions: [] });

  function updateQ(idx: number, patch: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
    if (patch.question_text !== undefined) {
      setErrors((e) => {
        const qErrs = [...e.questions];
        if (qErrs[idx]) qErrs[idx] = { ...qErrs[idx], text: false };
        return { ...e, questions: qErrs };
      });
    }
  }
  function updateOption(qIdx: number, oIdx: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIdx ? { ...q, options: q.options.map((o, oi) => (oi === oIdx ? value : o)) } : q)),
    );
    setErrors((e) => {
      const qErrs = [...e.questions];
      if (qErrs[qIdx]?.options) {
        const opts = [...(qErrs[qIdx].options ?? [])];
        opts[oIdx] = false;
        qErrs[qIdx] = { ...qErrs[qIdx], options: opts };
      }
      return { ...e, questions: qErrs };
    });
  }
  function addQ() {
    setQuestions((qs) => [...qs, { question_text: "", options: ["", "", "", ""], correct_answer_index: 0 }]);
  }
  function removeQ(idx: number) {
    if (questions.length === 1) return;
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
    setErrors((e) => ({ ...e, questions: e.questions.filter((_, i) => i !== idx) }));
  }

  function toggleGroup(id: string) {
    setTest((tt) => {
      const next = tt.group_ids.includes(id) ? tt.group_ids.filter((x) => x !== id) : [...tt.group_ids, id];
      return { ...tt, group_ids: next };
    });
    setErrors((er) => ({ ...er, group: false }));
  }

  function validate(): boolean {
    const newErrs: FieldErrors = { questions: questions.map(() => ({})) };
    let firstInvalidId: string | null = null;

    if (!test.title.trim()) {
      newErrs.title = true;
      if (!firstInvalidId) firstInvalidId = "title";
    }
    if (!test.is_public && test.group_ids.length === 0) {
      newErrs.group = true;
      if (!firstInvalidId) firstInvalidId = "group-trigger";
    }

    questions.forEach((q, qi) => {
      const qe: { text?: boolean; options?: boolean[] } = {};
      if (!q.question_text.trim()) {
        qe.text = true;
        if (!firstInvalidId) firstInvalidId = `q-${qi}`;
      }
      const optErrs = q.options.map((o) => !o.trim());
      if (optErrs.some(Boolean)) {
        qe.options = optErrs;
        if (!firstInvalidId) {
          const oi = optErrs.findIndex(Boolean);
          firstInvalidId = `q-${qi}-opt-${oi}`;
        }
      }
      newErrs.questions[qi] = qe;
    });

    setErrors(newErrs);

    const hasError =
      newErrs.title ||
      newErrs.group ||
      newErrs.questions.some((q) => q.text || q.options?.some(Boolean));

    if (hasError) {
      if (newErrs.title) toast.error(t.validate.needTitle);
      else if (newErrs.group) toast.error(t.validate.needGroup);
      else toast.error(t.validate.needFields);
      if (firstInvalidId) {
        setTimeout(() => {
          const el = document.getElementById(firstInvalidId!);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            (el as HTMLElement).focus?.();
          }
        }, 50);
      }
    }
    return !hasError;
  }

  async function handleSubmit() {
    if (!validate()) return;
    // Clamp questions_per_attempt at the count of questions
    const qpa = test.questions_per_attempt;
    if (qpa != null && qpa > questions.length) {
      setTest({ ...test, questions_per_attempt: null });
      toast.error("Berilgan miqdor savollar sonidan ko'p — barcha savollar ishlatiladi");
    }
    setSaving(true);
    try {
      await onSubmit(test, questions);
    } finally {
      setSaving(false);
    }
  }

  const selectedGroups = groups.filter((g) => test.group_ids.includes(g.id));

  return (
    <div className="space-y-8">
      {/* ---- Settings ---- */}
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-xl font-semibold">{t.editor.settingsTitle}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="title">{t.editor.titleLabel}</Label>
              <HelpHint text={t.editor.help.title} />
            </div>
            <Input
              id="title"
              value={test.title}
              onChange={(e) => {
                setTest({ ...test, title: e.target.value });
                if (errors.title) setErrors((er) => ({ ...er, title: false }));
              }}
              placeholder={t.editor.titlePh}
              className={errors.title ? errBorder : ""}
              aria-invalid={!!errors.title}
            />
            {errors.title && <FieldError>{t.validate.fieldRequired}</FieldError>}
          </div>

          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="desc">{t.editor.descLabel}</Label>
              <HelpHint text={t.editor.help.desc} />
            </div>
            <Textarea
              id="desc"
              value={test.description}
              onChange={(e) => setTest({ ...test, description: e.target.value })}
              placeholder={t.editor.descPh}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="time">{t.editor.timeLabel}</Label>
              <HelpHint text={t.editor.help.time} />
            </div>
            <Input
              id="time"
              type="number"
              min={1}
              max={240}
              value={test.time_limit_min}
              onChange={(e) => setTest({ ...test, time_limit_min: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="attempts">{t.editor.attemptsLabel}</Label>
              <HelpHint text={t.editor.help.attempts} />
            </div>
            <Input
              id="attempts"
              type="number"
              min={1}
              max={50}
              value={test.max_attempts}
              onChange={(e) => setTest({ ...test, max_attempts: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="qpa">{t.editor.questionsPerAttemptLabel}</Label>
              <HelpHint text={t.editor.questionsPerAttemptHint} />
            </div>
            <Input
              id="qpa"
              type="number"
              min={1}
              max={500}
              value={test.questions_per_attempt ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                setTest({ ...test, questions_per_attempt: v ? Math.max(1, parseInt(v) || 1) : null });
              }}
              placeholder={t.editor.questionsPerAttemptPh}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t.editor.questionsPerAttemptHint}</p>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Label className="cursor-pointer">{t.editor.randomLabel}</Label>
                <HelpHint text={t.editor.help.random} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.editor.randomDesc}</p>
            </div>
            <Switch
              checked={test.random_enabled}
              onCheckedChange={(v) => setTest({ ...test, random_enabled: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Label className="cursor-pointer">{t.editor.publicLabel}</Label>
                <HelpHint text={t.editor.help.public} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.editor.publicDesc}</p>
            </div>
            <Switch
              checked={test.is_public}
              onCheckedChange={(v) => {
                setTest({ ...test, is_public: v });
                if (v) setErrors((er) => ({ ...er, group: false }));
              }}
            />
          </div>

          {!test.is_public && (
            <div className="md:col-span-2 space-y-3">
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Label htmlFor="group-trigger">{t.editor.groupLabel}</Label>
                  <HelpHint text={t.editor.help.group} />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      id="group-trigger"
                      type="button"
                      aria-invalid={!!errors.group}
                      className={`flex w-full min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-left text-sm ${
                        errors.group ? errBorder : "border-input"
                      }`}
                    >
                      {selectedGroups.length === 0 ? (
                        <span className="text-muted-foreground">{t.editor.groupPlaceholder}</span>
                      ) : (
                        selectedGroups.map((g) => (
                          <span
                            key={g.id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            <Users className="h-3 w-3" />
                            {g.name}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(g.id);
                              }}
                            />
                          </span>
                        ))
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
                    {groups.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground">{t.groups.emptyTitle}</p>
                    ) : (
                      <div className="max-h-64 overflow-auto">
                        {groups.map((g) => {
                          const checked = test.group_ids.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => toggleGroup(g.id)}
                              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                            >
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded border ${
                                  checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
                                }`}
                              >
                                {checked && <Check className="h-3 w-3" />}
                              </span>
                              {g.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                {errors.group && <FieldError>{t.validate.fieldRequired}</FieldError>}
                <p className="mt-1 text-xs text-muted-foreground">{t.editor.groupsAttachedHint}</p>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p>{t.editor.help.autoCode}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---- Questions ---- */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{t.editor.questionsTitle(questions.length)}</h2>
          <Button variant="outline" size="sm" onClick={addQ}>
            <Plus className="mr-2 h-4 w-4" />
            {t.editor.addQuestion}
          </Button>
        </div>
        <div className="space-y-4">
          {questions.map((q, qi) => {
            const qErr = errors.questions[qi] ?? {};
            return (
              <div key={qi} className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {t.editor.questionN(qi + 1)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeQ(qi)}
                    disabled={questions.length === 1}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  id={`q-${qi}`}
                  value={q.question_text}
                  onChange={(e) => updateQ(qi, { question_text: e.target.value })}
                  placeholder={t.editor.questionPh}
                  className={`mb-1 ${qErr.text ? errBorder : ""}`}
                  aria-invalid={!!qErr.text}
                />
                {qErr.text && <FieldError>{t.validate.fieldRequired}</FieldError>}

                <p className="mb-2 mt-3 text-xs font-medium text-muted-foreground">{t.editor.optionsHint}</p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const optErr = qErr.options?.[oi];
                    return (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQ(qi, { correct_answer_index: oi })}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            q.correct_answer_index === oi
                              ? "border-success bg-success text-success-foreground"
                              : "border-input hover:bg-muted"
                          }`}
                          aria-label={`${oi + 1}-variant to'g'ri deb belgilash`}
                        >
                          {q.correct_answer_index === oi ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="text-xs">{String.fromCharCode(65 + oi)}</span>
                          )}
                        </button>
                        <Input
                          id={`q-${qi}-opt-${oi}`}
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={t.editor.optionPh(String.fromCharCode(65 + oi))}
                          className={optErr ? errBorder : ""}
                          aria-invalid={!!optErr}
                        />
                      </div>
                    );
                  })}
                </div>
                {qErr.options?.some(Boolean) && <FieldError>{t.validate.fieldRequired}</FieldError>}
              </div>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={saving} className="shadow-elegant">
          {saving ? t.editor.saving : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" /> {children}
    </p>
  );
}
