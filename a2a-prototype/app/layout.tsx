import type { Metadata } from "next";
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import "./globals.css";

export const metadata: Metadata = {
  title: "A2A Agent Console",
  description: "Autonomous Agent Orchestrator UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-mono antialiased bg-zinc-950 text-zinc-200">
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
