"use client"

import * as React from "react"
import { mutate } from "swr"

export function SWRRevalidateBridge() {
  React.useEffect(() => {
    const es = new EventSource("/api/events/stream")
    es.onmessage = () => {
      // Revalidate all keys; simple and effective. Can be narrowed if needed.
      mutate(() => true, undefined, { revalidate: true })
    }
    es.onerror = () => {
      // do nothing; the stream endpoint will report missing config
    }
    return () => es.close()
  }, [])

  return null
}
