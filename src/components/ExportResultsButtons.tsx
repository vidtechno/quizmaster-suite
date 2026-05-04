import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useLocale } from "@/lib/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ExportResultsButtons({ testId, testTitle }: { testId: string; testTitle: string }) {
  const { tr } = useLocale();

  const fetchResults = async () => {
    const { data: attempts } = await supabase
      .from("test_attempts")
      .select("id,user_id,attempt_number,score,total_questions,time_spent,submitted_at,status")
      .eq("test_id", testId)
      .eq("status", "completed")
      .order("submitted_at", { ascending: false });
    const list = (attempts || []) as any[];
    const ids = Array.from(new Set(list.map((a) => a.user_id)));
    let map: Record<string, { name: string; username: string }> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,username").in("id", ids);
      (profs || []).forEach((p: any) => (map[p.id] = { name: p.full_name, username: p.username }));
    }
    return list.map((a) => ({ ...a, ...map[a.user_id] }));
  };

  const exportCsv = async () => {
    const rows = await fetchResults();
    if (!rows.length) return toast.info("Hech qanday natija yo'q");
    const header = ["Foydalanuvchi", "Username", "Urinish", "Ball", "Jami", "%", "Vaqt(s)", "Topshirilgan"];
    const lines = [
      header.join(","),
      ...rows.map((r) => {
        const pct = r.total_questions ? Math.round((r.score / r.total_questions) * 100) : 0;
        return [
          q(r.name || ""),
          q(r.username || ""),
          r.attempt_number,
          r.score,
          r.total_questions,
          pct,
          r.time_spent,
          new Date(r.submitted_at).toISOString(),
        ].join(",");
      }),
    ];
    const csv = "\uFEFF" + lines.join("\n");
    download(csv, `${slug(testTitle)}-natijalar.csv`, "text/csv");
  };

  const exportPdf = async () => {
    const rows = await fetchResults();
    if (!rows.length) return toast.info("Hech qanday natija yo'q");
    const w = window.open("", "_blank");
    if (!w) return toast.error("Pop-up bloklangan");
    const tbody = rows
      .map((r) => {
        const pct = r.total_questions ? Math.round((r.score / r.total_questions) * 100) : 0;
        return `<tr><td>${esc(r.name || "")}</td><td>@${esc(r.username || "")}</td><td>${r.attempt_number}</td><td>${r.score}/${r.total_questions}</td><td>${pct}%</td><td>${Math.floor(r.time_spent / 60)}m ${r.time_spent % 60}s</td><td>${new Date(r.submitted_at).toLocaleString()}</td></tr>`;
      })
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(testTitle)} — Natijalar</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{margin:0 0 8px}p{color:#666;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}@media print{body{padding:0}}</style></head>
<body><h1>${esc(testTitle)}</h1><p>Natijalar — ${rows.length} ta urinish · ${new Date().toLocaleString()}</p>
<table><thead><tr><th>Foydalanuvchi</th><th>Username</th><th>#</th><th>Ball</th><th>%</th><th>Vaqt</th><th>Sana</th></tr></thead><tbody>${tbody}</tbody></table>
<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportCsv} className="rounded-full">
        <Download className="mr-2 h-4 w-4" /> {tr.exportCsv}
      </Button>
      <Button variant="outline" size="sm" onClick={exportPdf} className="rounded-full">
        <FileText className="mr-2 h-4 w-4" /> {tr.exportPdf}
      </Button>
    </div>
  );
}

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]!));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
