import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "A2A Agent Orchestrator",
  description: "AI Agent orchestration platform for autonomous coding workflows",
}

export const viewport: Viewport = {
  themeColor: "#0a0f1a",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark bg-background">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
