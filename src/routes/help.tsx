import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Yordam markazi — MegaPanel.uz" },
      { name: "description", content: "MegaPanel.uz uchun yordam, FAQ va qisqa qo'llanma." },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t.back}
      </Link>
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{t.help.title}</h1>
          <p className="mt-1 text-muted-foreground">{t.help.subtitle}</p>
        </div>
      </div>

      <div className="space-y-6">
        {t.help.sections.map((sec, si) => (
          <section key={si} className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-2 font-display text-lg font-semibold">{sec.title}</h2>
            <Accordion type="single" collapsible>
              {sec.items.map((it, ii) => (
                <AccordionItem key={ii} value={`s${si}-${ii}`}>
                  <AccordionTrigger className="text-left text-sm font-semibold">
                    {it.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {it.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
        <p className="px-1 text-center text-sm text-muted-foreground">{t.help.contact}</p>
      </div>
    </div>
  );
}
