"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Menu, X, ChevronRight } from "lucide-react"
import { useTheme } from "next-themes"
import { ConnectWalletButton } from "@/components/wallet/connect-wallet"
import { AuthButtons } from "@/components/auth/auth-buttons"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-lg transition-all duration-300 ${
        isScrolled ? "bg-background/80 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground">
            N
          </div>
          <span>NyayChain</span>
        </div>

        <nav className="hidden md:flex gap-8">
          <Link
            href="/bonds"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Bonds
          </Link>
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="/#testimonials"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Testimonials
          </Link>
          <Link
            href="/#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/#faq"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </Link>
        </nav>

        <div className="hidden md:flex gap-4 items-center">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {mounted ? (
              theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />
            ) : (
              <div className="size-[18px]" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <ConnectWalletButton className="rounded-full h-9 px-4" />
          <AuthButtons />
        </div>

        <div className="flex items-center gap-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {mounted ? (
              theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />
            ) : (
              <div className="size-[18px]" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden absolute top-16 inset-x-0 bg-background/95 backdrop-blur-lg border-b"
        >
          <div className="container py-4 flex flex-col gap-4">
            <Link href="/bonds" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
              Bonds
            </Link>
            <Link href="/#features" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
              Features
            </Link>
            <Link href="/#testimonials" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
              Testimonials
            </Link>
            <Link href="/#pricing" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </Link>
            <Link href="/#faq" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
              FAQ
            </Link>
            <div className="flex flex-col gap-2 pt-2 border-t">
              <ConnectWalletButton className="rounded-full h-10 px-4" />
              <div className="flex justify-center">
                <AuthButtons />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  )
}
