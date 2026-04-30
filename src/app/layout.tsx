import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";

export const metadata: Metadata = {
  title: "Enterprise Suite - ERP | CRM | ATS",
  description:
    "Integrated enterprise platform combining ERP, CRM, and ATS functionality for modern businesses.",
  keywords: ["ERP", "CRM", "ATS", "enterprise", "management"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EnterpriseSuite",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
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
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EnterpriseSuite" />
        <link rel="icon" href="/icons/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144.png" />
      </head>
      <body className="antialiased min-h-screen font-sans">
        <OfflineIndicator />
        {children}
        <InstallPrompt />
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
