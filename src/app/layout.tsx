import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { PwaInstall } from "@/components/shared/pwa-install";
import { AuthSessionProvider } from "@/lib/auth/session-provider";

export const metadata: Metadata = {
  title: "PharmaCRM Field Force",
  description:
    "Pharmaceutical CRM and Field Force Automation",
  keywords: ["ERP", "CRM", "pharma", "field force", "automation"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PharmaCRM",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d9488" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PharmaCRM" />
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.svg" />
      </head>
      <body className="antialiased min-h-screen font-sans">
        <script
          dangerouslySetInnerHTML={{ __html: `
            (function(){try{var t=localStorage.getItem('pharma.theme');
            if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches))
            document.documentElement.classList.add('dark')}catch{}})()
          `}}
        />
        <AuthSessionProvider>
        <OfflineIndicator />
        {children}
        <PwaInstall />
        </AuthSessionProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', async () => {
                  try {
                    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                    reg.addEventListener('updatefound', () => {
                      const newWorker = reg.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            window.dispatchEvent(new CustomEvent('sw-update-available', { detail: reg }));
                          }
                        });
                      }
                    });
                  } catch (e) {
                    console.error('[PWA] SW registration failed:', e);
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
