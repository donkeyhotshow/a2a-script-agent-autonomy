import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark bg-background`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
