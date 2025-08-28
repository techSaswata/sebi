"use client"
import { useState, useEffect, ReactNode } from 'react'

interface NoSSRProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * NoSSR component prevents server-side rendering of its children
 * Useful for components that have different behavior on server vs client
 */
export function NoSSR({ children, fallback = null }: NoSSRProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
