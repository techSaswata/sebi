import { NextResponse } from "next/server"
import { fetchAsperoHome } from "@/lib/aspero"

export async function GET() {
  try {
    const data = await fetchAsperoHome()
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch Aspero home" }, { status: 500 })
  }
}
