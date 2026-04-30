import { NextResponse } from "next/server";

export async function GET() {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Not OK");

    const data = await res.json();
    const models = (data.models || []).map((m: { name: string; size: number; modified_at: string }) => ({
      name: m.name,
      size: m.size,
      modified: m.modified_at,
    }));

    return NextResponse.json({
      status: "connected",
      url: ollamaUrl,
      models,
    });
  } catch {
    return NextResponse.json({
      status: "disconnected",
      url: ollamaUrl,
      models: [],
    });
  }
}
