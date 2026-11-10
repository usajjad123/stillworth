import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stillworth · Your money, in perspective",
  description: "A quiet home for your savings, assets, and monthly audits.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Stillworth", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
