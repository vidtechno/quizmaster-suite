import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/profile/edit")({
  head: () => ({ meta: [{ title: "Profilni tahrirlash — MegaPanel.uz" }] }),
  component: ProfileEditPage,
});

function ProfileEditPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setBio((profile as any).bio ?? "");
      setAvatarUrl((profile as any).avatar_url ?? null);
    }
  }, [profile]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Rasm hajmi 2MB dan oshmasligi kerak");
      return;
    }
    if (!/^image\/(jpeg|png|webp|jpg)$/i.test(file.type)) {
      toast.error("Faqat JPG, PNG yoki WebP rasm qabul qilinadi");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) {
        toast.error("Rasmni yuklab bo'lmadi");
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success("Rasm yuklandi");
    } catch {
      toast.error(t.err.network);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error(t.validate.fieldRequired);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);
      if (error) {
        toast.error(t.err.saveFailed);
        return;
      }
      toast.success("Profil saqlandi");
      await refreshProfile?.();
      navigate({ to: "/profile" });
    } catch {
      toast.error(t.err.network);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) return <div className="mx-auto max-w-2xl px-4 py-12">{t.loading}</div>;

  const initials = (fullName?.[0] ?? profile?.username?.[0] ?? "?").toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
      <Link to="/profile" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.profile.title}
      </Link>

      <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Profilni tahrirlash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Boshqa foydalanuvchilar va o'qituvchilar sizni shu ma'lumotlar orqali ko'radi.
        </p>

        {/* Avatar */}
        <div className="mt-6 flex items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-20 w-20 rounded-2xl object-cover shadow-glow ring-2 ring-primary/30"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-hero text-2xl font-bold text-primary-foreground shadow-glow">
                {initials}
              </div>
            )}
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Yuklanmoqda…" : "Rasm yuklash"}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG yoki WebP · max 2MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="full_name">To'liq ism</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={`@${profile?.username ?? ""}`} disabled />
            <p className="mt-1 text-xs text-muted-foreground">Username o'zgartirilmaydi.</p>
          </div>
          <div>
            <Label htmlFor="bio">O'zingiz haqingizda</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Masalan: Matematika o'qituvchisi, 7 yillik tajriba"
              rows={4}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-muted-foreground">{bio.length}/500</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={save} disabled={saving} className="rounded-full bg-gradient-hero shadow-glow">
            <UserIcon className="mr-2 h-4 w-4" />
            {saving ? t.editor.saving : t.save}
          </Button>
          <Link to="/profile">
            <Button variant="outline" className="rounded-full">
              {t.cancel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
