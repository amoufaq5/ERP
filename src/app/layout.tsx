import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enterprise Suite - ERP | CRM | ATS",
  description:
    "Integrated enterprise platform combining ERP, CRM, and ATS functionality for modern businesses.",
  keywords: ["ERP", "CRM", "ATS", "enterprise", "management"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
