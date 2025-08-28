import type React from "react"
import "@/app/globals.css" // fix wrong globals.css import path from "@/styles/globals.css" to the actual location
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import Providers from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SaaSify - Streamline Your Workflow",
  description: "Boost productivity, reduce costs, and scale your business with our all-in-one SaaS platform.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
