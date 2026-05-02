import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { AuthModalProvider } from "@/components/AuthModal";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { t } from "@/lib/i18n";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t.err.notFound}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.err.notFoundDesc}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.err.goHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Megapanel.uz — Zamonaviy test yaratish platformasi" },
      { name: "description", content: "Testlar yarating, ulashing va real vaqt rejimidagi yetakchilar jadvali hamda chuqur tahlillar bilan sinovdan o'ting." },
      { property: "og:title", content: "Megapanel.uz — Zamonaviy test yaratish platformasi" },
      { name: "twitter:title", content: "Megapanel.uz — Zamonaviy test yaratish platformasi" },
      { property: "og:description", content: "Testlar yarating, ulashing va real vaqt rejimidagi yetakchilar jadvali hamda chuqur tahlillar bilan sinovdan o'ting." },
      { name: "twitter:description", content: "Testlar yarating, ulashing va real vaqt rejimidagi yetakchilar jadvali hamda chuqur tahlillar bilan sinovdan o'ting." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/pqWrbhHSC3dcaf3yAgBEcqXEdLK2/social-images/social-1777631260454-Gemini_Generated_Image_rzsmqorzsmqorzsm.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/pqWrbhHSC3dcaf3yAgBEcqXEdLK2/social-images/social-1777631260454-Gemini_Generated_Image_rzsmqorzsmqorzsm.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthModalProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Outlet />
            </main>
            <MobileBottomNav />
          </div>
          <Toaster richColors closeButton position="top-right" />
        </AuthModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
