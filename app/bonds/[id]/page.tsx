import { Header } from "@/components/app-shell/header"
import { BondDetail } from "@/components/bonds/bond-detail"

export default function BondDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-10 md:py-16">
          <div className="container px-4 md:px-6">
            <BondDetail id={params.id} />
          </div>
        </section>
      </main>
    </div>
  )
}
