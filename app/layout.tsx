import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outreach Command Center",
  description: "Research, review and approve high-quality client outreach.",
  robots: {
    index: false,
    follow: false,
  },
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
