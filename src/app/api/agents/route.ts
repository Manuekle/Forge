import { NextResponse } from "next/server"
import { AGENTS } from "@/lib/constants"

export async function GET() {
  return NextResponse.json(AGENTS)
}
