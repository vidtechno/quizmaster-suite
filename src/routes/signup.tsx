import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — Quizly" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", username: "", phone: "", password: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.username.length < 3) return toast.error("Username must be at least 3 characters");
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return toast.error("Username can only contain letters, numbers, _");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (!/^[+0-9\s-]{6,}$/.test(form.phone)) return toast.error("Enter a valid phone number");

    setLoading(true);
    const { error } = await signUp(form);
    setLoading(false);
    if (error) return toast.error(error);
    toast.success("Welcome to Quizly!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Start building and taking quizzes in seconds.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="e.g. ada_lovelace" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0100" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
