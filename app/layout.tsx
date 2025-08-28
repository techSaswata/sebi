import type React from "react"
import "@/app/globals.css" // fix wrong globals.css import path from "@/styles/globals.css" to the actual location
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import Providers from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NyayChain - Tokenized Bond Trading Platform",
  description: "Secure, low-cost, and efficient tokenized corporate bond trading on Solana blockchain. Trade bonds with USDC, manage portfolios, and access AI-driven insights.",
  generator: 'Next.js'
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
