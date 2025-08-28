"use client"

import * as React from "react"

type EventItem =
  | { type: "hello"; cluster: string; programId: string; t: number }
  | { type: "program-log"; slot: number; err: any; logs: string[]; signature: string | null; t: number }

export function LiveEvents() {
  const [events, setEvents] = React.useState<EventItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [connected, setConnected] = React.useState(false)

  React.useEffect(() => {
    const es = new EventSource("/api/events/stream")
    es.onopen = () => {
      setConnected(true)
      setError(null)
    }
    es.onerror = () => {
      setConnected(false)
      setError("Failed to connect to event stream.")
    }
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as EventItem
        setEvents((prev) => [data, ...prev].slice(0, 50))
      } catch {
        // ignore comments/heartbeats
      }
    }
    return () => es.close()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Program Events</h2>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
            connected
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {connected ? "connected" : "disconnected"}
        </span>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="space-y-2">
        {events.map((ev, i) => (
          <li key={i} className="rounded-md border border-border/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{ev.type}</span>
              <span className="text-muted-foreground">{new Date((ev as any).t).toLocaleTimeString()}</span>
            </div>
            {"logs" in ev ? (
              <div className="mt-2">
                {ev.signature ? <p className="text-xs text-muted-foreground break-all">sig: {ev.signature}</p> : null}
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs">{ev.logs.join("\n")}</pre>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
