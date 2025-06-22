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
      <body className={`${inter.className} bg-background text-foreground`}>
        {/*
          ThemeProvider might not be strictly necessary if we're hardcoding dark theme,
          but good practice if you want to toggle later.
          For this specific request, we're forcing dark theme.
        */}
        {/* <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        > */}
        {children}
        {/* </ThemeProvider> */}
      </body>
    </html>
  )
}
