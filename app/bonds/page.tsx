import { Header } from "@/components/app-shell/header"
import { BondList } from "@/components/bonds/bond-list"

export default function BondsPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-10 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Browse Bonds</h1>
                <p className="text-muted-foreground">Explore tokenized bonds and trade using your Solana wallet.</p>
              </div>
            </div>
            <BondList />
          </div>
        </section>
      </main>
    </div>
  )
}
