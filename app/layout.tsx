import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "C9N.AI - Unlock Deeper Insights",
  description:
    "Leverage AI for relevant information, better analysis, and coordination of disparate, opaque relationships.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body className={`${inter.className} bg-c9n-blue-dark text-gray-200 antialiased`}>{children}</body>
    </html>
  )
}
