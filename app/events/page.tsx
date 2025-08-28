import { Header } from "@/components/app-shell/header"
import { LiveEvents } from "@/components/events/live-events"

export default function EventsPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-10 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Real-time Events</h1>
              <p className="text-muted-foreground">
                Streaming Solana program logs via Server-Sent Events. Configure NEXT_PUBLIC_MARKET_PROGRAM_ID and
                NEXT_PUBLIC_SOLANA_CLUSTER to enable.
              </p>
            </div>
            <LiveEvents />
          </div>
        </section>
      </main>
    </div>
  )
}
