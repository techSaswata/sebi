export type BondStatus = "active" | "paused"

export interface Bond {
  id: string
  bond_mint: string
  issuer: string
  coupon_rate: number
  maturity_date: string // ISO date
  face_value: number
  decimals: number
  total_supply: number
  status: BondStatus
  price_usdc: number // current unit price in USDC
  ytm: number // yield to maturity in %
}
