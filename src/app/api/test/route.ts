import { NextResponse } from "next/server"
import { complete } from "@/lib/foundry-iq"

export async function GET() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.FOUNDRY_IQ_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY || process.env.FOUNDRY_IQ_API_KEY
  const model = process.env.AZURE_OPENAI_DEPLOYMENT || "grok-4-20-reasoning"

  if (!endpoint || !key) {
    return NextResponse.json({
      status: "ok",
      message: "No AI configured — app runs in demo mode with in-memory data",
      model,
    })
  }

  try {
    const result = await complete(
      [
        {
          role: "system",
          content: "Responde exactamente: 'OK - Forge conectado a Foundry IQ'",
        },
      ],
      { deployment: model, maxTokens: 256 }
    )

    return NextResponse.json({
      status: "success",
      model,
      reply: result.completion.choices[0]?.message?.content,
      tokens: result.completion.usage,
      trace: result.trace,
    })
  } catch (err) {
    return NextResponse.json({
      status: "demo",
      message: "AI unreachable — app runs with in-memory data",
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
