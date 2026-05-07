import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Check, AlertCircle, Info, ImagePlus, X as XIcon } from "lucide-react";
import { HelpHint } from "@/components/HelpHint";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { getDifficulty, difficultyLabel, difficultyToneClass } from "@/lib/difficulty";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { validateImageFile, SAFE_IMAGE_ACCEPT } from "@/lib/upload-safety";

export type QuestionDraft = {
  id?: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation?: string | null;
  attempts_count?: number;
  error_rate?: number;
  time_seconds?: number | null;
  image_url?: string | null;
};

export type TestDraft = {
  title: string;
  description: string;
  time_limit_min: number;
  random_enabled: boolean;
  max_attempts: number;
  questions_per_attempt: number | null;
  one_way_mode: boolean;
};

type Props = {
  initialTest: TestDraft;
  initialQuestions: QuestionDraft[];
  submitLabel: string;
  /** Set when editing an existing test — shown as a copyable badge. */
  testCode?: string | null;
  onSubmit: (test: TestDraft, questions: QuestionDraft[]) => Promise<void>;
};

type FieldErrors = {
  title?: boolean;
  questions: Array<{ text?: boolean; options?: boolean[] }>;
};

const errBorder = "border-destructive ring-1 ring-destructive/40 focus-visible:ring-destructive";

export function QuizEditor({ initialTest, initialQuestions, submitLabel, testCode, onSubmit }: Props) {
  const [test, setTest] = useState<TestDraft>(initialTest);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialQuestions.length
      ? initialQuestions
      : [{ question_text: "", options: ["", "", "", ""], correct_answer_index: 0, explanation: "" }],
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
    setQuestions((qs) => [
      ...qs,
      { question_text: "", options: ["", "", "", ""], correct_answer_index: 0, explanation: "" },
    ]);
  }
  function removeQ(idx: number) {
    if (questions.length === 1) return;
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
    setErrors((e) => ({ ...e, questions: e.questions.filter((_, i) => i !== idx) }));
  }

  function validate(): boolean {
    const newErrs: FieldErrors = { questions: questions.map(() => ({})) };
    let firstInvalidId: string | null = null;

    if (!test.title.trim()) {
      newErrs.title = true;
      firstInvalidId = "title";
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
    const hasError = newErrs.title || newErrs.questions.some((q) => q.text || q.options?.some(Boolean));
    if (hasError) {
      if (newErrs.title) toast.error(t.validate.needTitle);
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

  function copyCode() {
    if (!testCode) return;
    navigator.clipboard?.writeText(testCode).then(
      () => toast.success(t.dashboard.copyTestCode),
      () => toast.error(t.err.generic),
    );
  }

  return (
    <div className="space-y-8">
      {/* ---- Test code badge (only when editing) ---- */}
      {testCode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-glow">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.editor.testCodeBadge}
              </p>
              <p className="font-mono text-2xl font-bold tracking-widest text-primary">{testCode}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.dashboard.attachToGroupHint}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full" onClick={copyCode}>
            {t.copy}
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p>{t.editor.testCodeAfterCreate}</p>
        </div>
      )}

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

          <div className="md:col-span-2 flex items-start justify-between gap-3 rounded-lg border p-3">
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

          <div className="md:col-span-2 flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label className="cursor-pointer">One-way rejim (orqaga qaytib bo'lmaydi)</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Yoqilsa, o'quvchi keyingi savolga o'tgach oldingi savolga qayta olmaydi. Default: o'chiq.
              </p>
            </div>
            <Switch
              checked={test.one_way_mode}
              onCheckedChange={(v) => setTest({ ...test, one_way_mode: v })}
            />
          </div>
        </div>
      </section>

      {/* ---- Questions ---- */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold">{t.editor.questionsTitle(questions.length)}</h2>
        </div>
        <div className="space-y-4">
          {questions.map((q, qi) => {
            const qErr = errors.questions[qi] ?? {};
            const diff = getDifficulty(q.attempts_count ?? 0, q.error_rate ?? 0);
            return (
              <div key={qi} className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {t.editor.questionN(qi + 1)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyToneClass(diff)}`}
                    >
                      {difficultyLabel(diff)}
                    </span>
                    <HelpHint text={t.editor.help.difficulty} />
                  </div>
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

                <QuestionImage
                  imageUrl={q.image_url ?? null}
                  onChange={(url) => updateQ(qi, { image_url: url })}
                />

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

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <Label htmlFor={`q-${qi}-exp`} className="text-xs font-medium">
                        {t.editor.explanationLabel}
                      </Label>
                      <HelpHint text={t.editor.help.explanation} />
                    </div>
                    <Textarea
                      id={`q-${qi}-exp`}
                      value={q.explanation ?? ""}
                      onChange={(e) => updateQ(qi, { explanation: e.target.value })}
                      placeholder={t.editor.explanationPh}
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <Label htmlFor={`q-${qi}-time`} className="text-xs font-medium">
                        {t.editor.questionTimeLabel}
                      </Label>
                      <HelpHint text={t.editor.questionTimeHint} />
                    </div>
                    <Input
                      id={`q-${qi}-time`}
                      type="number"
                      min={5}
                      max={3600}
                      value={q.time_seconds ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateQ(qi, { time_seconds: v ? Math.max(5, parseInt(v) || 5) : null });
                      }}
                      placeholder="—"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={addQ} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            {t.editor.addQuestion}
          </Button>
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
