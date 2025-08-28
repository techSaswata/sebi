"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useToast } from "@/hooks/use-toast"
import useSWR from "swr"

export function BuyModal({ price, bondId }: { price: number; bondId: string }) {
  const [qty, setQty] = React.useState<number>(1)
  const [submitting, setSubmitting] = React.useState(false)
  const { connected, publicKey } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  const total = qty > 0 ? qty * price : 0

  // Get bond data for blockchain integration
  const { data: bondData } = useSWR(bondId ? `/api/bonds/${bondId}` : null, (url) => 
    fetch(url).then(r => r.json())
  )

  const onConfirm = async () => {
    if (!connected || !publicKey) {
      toast({ title: "Connect wallet", description: "Please connect your wallet to continue." })
      return
    }

    if (!bondData?.success || !bondData.data?.bond?.bond_mint) {
      toast({ title: "Error", description: "Bond data not available. Please try again later." })
      return
    }

    try {
      setSubmitting(true)

      // Check if blockchain setup is complete
      const blockchainStatusRes = await fetch('/api/blockchain/setup')
      const blockchainStatus = await blockchainStatusRes.json()

      if (blockchainStatus.success && blockchainStatus.data.setup_complete) {
        // Use blockchain trading
        const tradeRes = await fetch('/api/blockchain/trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bondMint: bondData.data.bond.bond_mint,
            amount: qty,
            side: 'buy',
            userWallet: publicKey.toBase58()
            // Note: In production, user would sign with their wallet
            // For demo, we'll create a demo keypair server-side
          })
        })

        const tradeData = await tradeRes.json()
        
        if (tradeData.success) {
          toast({ 
            title: "Trade executed on blockchain!", 
            description: `Bought ${qty} bonds for ${tradeData.data.total_cost.toFixed(2)} USDC. Tx: ${tradeData.data.signature?.slice(0, 8)}...`
          })
        } else {
          throw new Error(tradeData.error || "Blockchain trade failed")
        }
      } else {
        // Fallback to database-only trading
        const res = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: publicKey.toBase58(),
            bond_id: bondId,
            side: "buy",
            amount: qty,
            price,
          }),
        })
        
        const out = await res.json()
        if (!res.ok) throw new Error(out?.error || "Trade failed")
        
        toast({ 
          title: "Order recorded", 
          description: `Buy ${qty} bonds submitted (database mode).`
        })
      }
    } catch (e: any) {
      toast({ 
        title: "Trade failed", 
        description: String(e?.message || e), 
        variant: "destructive" 
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-full" disabled={submitting}>
          Buy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy {bondId}</DialogTitle>
          <DialogDescription>
            Records a trade server-side (off-chain). On-chain settlement comes later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              inputMode="numeric"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Unit Price</span>
            <span className="font-medium">{price ? `$${price.toFixed(2)}` : "—"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{price ? `$${total.toFixed(2)}` : "—"}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-full bg-transparent" disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="rounded-full" disabled={submitting}>
            {submitting ? "Submitting..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
