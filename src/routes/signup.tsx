import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: t.signup.metaTitle }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", username: "", phone: "", password: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.username.length < 3) return toast.error(t.signup.errUsernameShort);
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return toast.error(t.signup.errUsernameChars);
    if (form.password.length < 6) return toast.error(t.signup.errPasswordShort);
    if (!/^[+0-9\s-]{6,}$/.test(form.phone)) return toast.error(t.signup.errPhoneInvalid);

    setLoading(true);
    try {
      const { error } = await signUp(form);
      if (error) {
        // Map common Supabase errors to Uzbek
        if (/username/i.test(error)) toast.error(t.signup.errUsernameTaken);
        else toast.error(error);
        return;
      }
      toast.success(t.signup.success);
      navigate({ to: "/dashboard" });
    } catch {
      toast.error(t.err.network);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold">{t.signup.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.signup.subtitle}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
        <div>
          <Label htmlFor="fullName">{t.signup.fullName}</Label>
          <Input id="fullName" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="username">{t.signup.username}</Label>
          <Input id="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder={t.signup.usernameHint} />
        </div>
        <div>
          <Label htmlFor="phone">{t.signup.phone}</Label>
          <Input id="phone" required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t.signup.phoneHint} />
        </div>
        <div>
          <Label htmlFor="password">{t.signup.password}</Label>
          <Input id="password" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t.signup.submitting : t.signup.submit}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t.signup.haveAccount}{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t.signup.login}
          </Link>
        </p>
      </form>
    </div>
  );
}
