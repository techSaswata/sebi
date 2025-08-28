// Utility for calling Aspero Home API securely from the server

export type AsperoBond = {
  id: number | string
  isin: string
  name: string
  credit_rating?: string
  credit_rating_agency?: string
  category?: string
  coupon_rate?: number
  listed_yield?: number
  min_units_to_sell?: number
  units_to_sell?: number
  interest_payment_frequency?: string
  sector?: string | null
  maturity_date?: string
  face_value?: number
  min_investment_per_unit?: number | string
  min_investment?: number | string
  logo_url?: string | null
  detail_short?: string
}

export type AsperoWidget = {
  config: {
    widget_id: number
    widget_type: string
    render_type?: string
    heading?: { title?: string; ctaText?: string }
    category?: string
  }
  data: unknown
}

export type AsperoHomeResponse = {
  widgets: AsperoWidget[]
}

function mustEnv(name: keyof NodeJS.ProcessEnv) {
  const v = process.env[name as string]
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

/**
 * Calls Aspero Home API using required headers.
 * Env required:
 * - ASPERO_API_BASE (e.g. https://retail-api.aspero.in)
 * - ASPERO_API_BEARER (JWT)
 * - ASPERO_X_USER_ID (uuid)
 * - ASPERO_X_PRODUCT_ID (e.g. YUBIFIN)
 * Optional:
 * - ASPERO_API_HOME_PATH (default /bff/api/v1/home)
 * - ASPERO_CHANNEL (default invest)
 * - ASPERO_X_USER_CATEGORY (default KYC_PENDING)
 * - ASPERO_DEVICE_PLATFORM (default web)
 * - ASPERO_X_PIN_TOKEN
 */
export async function fetchAsperoHome(): Promise<AsperoHomeResponse> {
  const base = mustEnv("ASPERO_API_BASE")
  const path = process.env.ASPERO_API_HOME_PATH || "/bff/api/v1/home"
  const url = `${base}${path}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${mustEnv("ASPERO_API_BEARER")}`,
    Accept: "application/json, text/plain, */*",
    "x-user-id": mustEnv("ASPERO_X_USER_ID"),
    "x-product-id": mustEnv("ASPERO_X_PRODUCT_ID"),
    channel: process.env.ASPERO_CHANNEL || "invest",
    "x-user-category": process.env.ASPERO_X_USER_CATEGORY || "KYC_PENDING",
    devicePlatform: process.env.ASPERO_DEVICE_PLATFORM || "web",
    "Device-Platform": process.env.ASPERO_DEVICE_PLATFORM || "web",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  }
  if (process.env.ASPERO_X_PIN_TOKEN) headers["x-pin-token"] = process.env.ASPERO_X_PIN_TOKEN as string

  const res = await fetch(url, { method: "GET", headers, cache: "no-store" })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Aspero home fetch failed: ${res.status} ${res.statusText} ${text}`)
  }
  return (await res.json()) as AsperoHomeResponse
}

export function flattenAsperoBonds(payload: AsperoHomeResponse): AsperoBond[] {
  const out: AsperoBond[] = []
  for (const w of payload.widgets || []) {
    if (w?.config?.widget_type === "BOND_TILES" && Array.isArray(w.data)) {
      out.push(...(w.data as AsperoBond[]))
    }
    if (w?.config?.widget_type === "PRODUCT_CATEGORIES") {
      const cats = (w as any)?.data?.bonds?.data as Array<{ name: string; data: AsperoBond[] }> | undefined
      if (Array.isArray(cats)) {
        for (const c of cats) {
          if (Array.isArray(c?.data)) out.push(...c.data)
        }
      }
    }
  }
  // dedupe by id if present, else by isin+name
  const seen = new Set<string>()
  const unique: AsperoBond[] = []
  for (const b of out) {
    const key = String((b as any).id ?? `${(b as any).isin ?? ""}-${(b as any).name ?? ""}`)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(b)
    }
  }
  return unique
}
