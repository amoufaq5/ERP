import { NextRequest, NextResponse } from "next/server";

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaResponse {
  message: { role: string; content: string };
  done: boolean;
}

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

function getOllamaConfig() {
  return {
    baseUrl: process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL,
    model: process.env.OLLAMA_MODEL || "llama3.2",
  };
}

const SYSTEM_PROMPT = `You are an AI assistant for a pharmaceutical ERP/CRM/ATS system called "Enterprise Suite".
You help users with:
- Financial queries (invoices, payments, budgets, journal entries)
- Inventory management (stock levels, reorder alerts, batch tracking)
- HR operations (employee records, payroll, leave management)
- CRM activities (leads, opportunities, customer accounts)
- Procurement (purchase orders, vendor management, GRN)
- Sales orders and delivery tracking
- Reports and analytics

When users ask about data, provide helpful analysis and suggestions.
When users ask how to do something, give step-by-step guidance using the system's features.
Keep responses concise and actionable. Use tables for data when helpful.
Always respond in the same language the user writes in (Arabic or English).`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, systemData, provider, apiKey, model: userModel } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const effectiveProvider = provider || "ollama";

    // Build messages array
    const messages: OllamaMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Inject system data context if provided
    if (systemData) {
      messages.push({
        role: "system",
        content: `Current system data snapshot:\n${JSON.stringify(systemData, null, 2)}`,
      });
    }

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const h of history) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: "user", content: message });

    if (effectiveProvider === "ollama") {
      return await handleOllama(messages, userModel);
    } else if (effectiveProvider === "openai") {
      return await handleOpenAI(messages, apiKey, userModel);
    } else {
      // Fallback: generate a helpful response without external AI
      return handleFallback(message, systemData);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleOllama(messages: OllamaMessage[], userModel?: string) {
  const config = getOllamaConfig();
  const model = userModel || config.model;

  try {
    const res = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { temperature: 0.7, num_predict: 1024 },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 404 || text.includes("not found")) {
        return NextResponse.json({
          response: `Model "${model}" not found. Pull it first:\n\`\`\`bash\nollama pull ${model}\n\`\`\`\nOr choose a different model in settings.`,
          model,
          provider: "ollama",
          fallback: true,
        });
      }
      throw new Error(`Ollama error: ${res.status} ${text}`);
    }

    const data: OllamaResponse = await res.json();
    return NextResponse.json({
      response: data.message.content,
      model,
      provider: "ollama",
    });
  } catch (err) {
    if (err instanceof TypeError && (err as Error).message.includes("fetch")) {
      return NextResponse.json({
        response: "Cannot connect to Ollama. Make sure it's running:\n\n```bash\n# Install Ollama\ncurl -fsSL https://ollama.com/install.sh | sh\n\n# Start the server\nollama serve\n\n# Pull a model\nollama pull llama3.2\n```\n\nOr switch to Fallback mode in settings to use the built-in assistant.",
        provider: "ollama",
        fallback: true,
      });
    }
    throw err;
  }
}

async function handleOpenAI(messages: OllamaMessage[], apiKey?: string, model?: string) {
  if (!apiKey) {
    return NextResponse.json({ error: "API key required for OpenAI" }, { status: 400 });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return NextResponse.json({
    response: data.choices[0].message.content,
    model: model || "gpt-4o-mini",
    provider: "openai",
    tokens: data.usage?.total_tokens,
  });
}

function handleFallback(message: string, systemData?: Record<string, unknown>) {
  const lower = message.toLowerCase();
  let response = "";

  if (lower.includes("invoice") || lower.includes("فاتور")) {
    const count = (systemData?.invoiceCount as number) || 0;
    const total = (systemData?.invoiceTotal as string) || "N/A";
    response = `**Invoice Summary**\n- Total invoices: ${count}\n- Total value: ${total}\n\nTo create a new invoice, go to **Finance → Invoices → Add Invoice**.\nTo view aging report, check **Reports → AR Aging**.`;
  } else if (lower.includes("employee") || lower.includes("موظف") || lower.includes("payroll") || lower.includes("رات")) {
    const count = (systemData?.employeeCount as number) || 0;
    response = `**HR Overview**\n- Total employees: ${count}\n\nManage employees at **HR & Payroll → Employees**.\nFor payroll processing, go to **HR & Payroll → Payroll**.`;
  } else if (lower.includes("inventory") || lower.includes("stock") || lower.includes("مخزون")) {
    const products = (systemData?.productCount as number) || 0;
    const lowStock = (systemData?.lowStockCount as number) || 0;
    response = `**Inventory Status**\n- Total products: ${products}\n- Low stock alerts: ${lowStock}\n\nCheck inventory at **Supply Chain → Inventory**.\nReorder alerts are shown on the dashboard.`;
  } else if (lower.includes("sales") || lower.includes("مبيع") || lower.includes("order") || lower.includes("طلب")) {
    const soCount = (systemData?.salesOrderCount as number) || 0;
    response = `**Sales Orders**\n- Total orders: ${soCount}\n\nCreate new orders at **Supply Chain → Sales Orders**.\nView revenue reports at **Reports → Financial**.`;
  } else if (lower.includes("lead") || lower.includes("عميل")) {
    response = `**Lead Management**\n\nManage leads at **CRM → Leads**.\nUse lead scoring to prioritize follow-ups.\nConvert qualified leads to opportunities at **CRM → Opportunities**.`;
  } else if (lower.includes("help") || lower.includes("مساعد") || lower.includes("what can")) {
    response = `**I can help you with:**\n\n1. **Financial queries** — invoices, payments, budgets\n2. **Inventory checks** — stock levels, reorder alerts\n3. **HR operations** — employee info, payroll\n4. **Sales analysis** — orders, revenue trends\n5. **CRM insights** — leads, opportunities, pipeline\n6. **System guidance** — how to use any feature\n\nJust ask your question in English or Arabic!`;
  } else {
    response = `I understand your question about "${message.substring(0, 50)}..."\n\nFor the best experience, connect to **Ollama** (self-hosted AI) or enter an **API key** in settings.\n\nIn the meantime, try asking about:\n- Invoices & payments\n- Inventory & stock\n- Employees & payroll\n- Sales orders\n- Leads & CRM`;
  }

  return NextResponse.json({
    response,
    provider: "fallback",
    model: "built-in",
  });
}
