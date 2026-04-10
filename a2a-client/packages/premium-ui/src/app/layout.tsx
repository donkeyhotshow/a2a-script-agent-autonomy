import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent",
  description: "A2A Agent Console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0d0d0d', color: '#e8e8e8', margin: 0 }}>{children}</body>
    </html>
  );
}
