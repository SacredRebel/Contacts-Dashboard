import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relationship OS",
  description: "Shared relationship, outreach and capital-qualification workspace for Paul, Mark and Jonathan.",
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
