import type { Bond } from "@/components/bonds/bond-types"

export const demoBonds: Bond[] = [
  {
    id: "NBC-2027-A",
    bond_mint: "DemoMint1111111111111111111111111111111111",
    issuer: "NyayBank Corp",
    coupon_rate: 6.5,
    maturity_date: "2027-12-31",
    face_value: 1000,
    decimals: 2,
    total_supply: 100000,
    status: "active",
    price_usdc: 101.25,
    ytm: 6.2,
  },
  {
    id: "IND-2029-B",
    bond_mint: "DemoMint2222222222222222222222222222222222",
    issuer: "Indus Infra Ltd",
    coupon_rate: 7.2,
    maturity_date: "2029-06-30",
    face_value: 1000,
    decimals: 2,
    total_supply: 50000,
    status: "active",
    price_usdc: 98.4,
    ytm: 7.5,
  },
]
