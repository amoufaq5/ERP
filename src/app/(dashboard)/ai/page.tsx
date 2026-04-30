"use client"

import { useState, useEffect, useRef } from "react"
import {
  Brain, Sparkles, Zap, TrendingUp, MessageSquare, Search,
  Target, Send, Trash2, Download, Settings, Cpu, Globe,
  CheckCircle, XCircle, RefreshCw, ChevronRight, Bot, User,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PageHeader from "@/components/shared/page-header"
import { useTranslation } from "@/lib/i18n/i18n-context"
import { useDataStore } from "@/lib/data-store"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  model?: string
  provider?: string
}

interface OllamaModel {
  name: string
  size: number
  modified: string
}

interface AIConfig {
  provider: "ollama" | "openai" | "fallback"
  apiKey: string
  model: string
  ollamaUrl: string
}

const DEFAULT_CONFIG: AIConfig = {
  provider: "ollama",
  apiKey: "",
  model: "llama3.2",
  ollamaUrl: "http://localhost:11434",
}

const SUGGESTIONS = [
  "How many invoices are pending?",
  "Show me low stock items",
  "Employee count by department",
  "Help me create a sales order",
  "What are the top leads?",
  "Explain the payroll process",
]

const AI_FEATURES = [
  { id: "1", name: "Lead Scoring", description: "Auto-score leads based on engagement, demographics, and behavior patterns", icon: Target, active: true },
  { id: "2", name: "Ticket Classification", description: "Automatically categorize and route support tickets using NLP", icon: Zap, active: true },
  { id: "3", name: "Resume Screening", description: "AI-powered candidate matching against job requirements", icon: Search, active: true },
  { id: "4", name: "Sales Forecasting", description: "Predict revenue trends based on pipeline and historical data", icon: TrendingUp, active: false },
  { id: "5", name: "Smart Recommendations", description: "Cross-sell and upsell suggestions based on customer behavior", icon: Sparkles, active: false },
  { id: "6", name: "Chat Assistant", description: "AI-powered help desk for employees and customers", icon: MessageSquare, active: false },
]

function formatMarkdown(text: string): string {
  let html = text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 p-3 rounded-lg my-2 overflow-x-auto text-sm"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')
  html = html.replace(/\n/g, "<br/>")
  return html
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB"
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + " MB"
  return (bytes / 1e3).toFixed(0) + " KB"
}

export default function AIHubPage() {
  const { t } = useTranslation()
  const store = useDataStore()

  const [activeTab, setActiveTab] = useState<"chat" | "features" | "settings">("chat")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG)
  const [features, setFeatures] = useState(AI_FEATURES)

  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "connected" | "disconnected">("checking")
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-chat-messages")
      if (saved) {
        const parsed = JSON.parse(saved)
        setMessages(parsed.map((m: ChatMessage) => ({ ...m, timestamp: new Date(m.timestamp) })))
      }
    } catch { /* ignore */ }

    try {
      const savedConfig = localStorage.getItem("ai-config-v2")
      if (savedConfig) setConfig(JSON.parse(savedConfig))
    } catch { /* ignore */ }

    checkOllamaStatus()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("ai-chat-messages", JSON.stringify(messages))
    } catch { /* ignore */ }
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function checkOllamaStatus() {
    setOllamaStatus("checking")
    try {
      const res = await fetch("/api/ai/status")
      const data = await res.json()
      if (data.status === "connected") {
        setOllamaStatus("connected")
        setOllamaModels(data.models || [])
      } else {
        setOllamaStatus("disconnected")
        setOllamaModels([])
      }
    } catch {
      setOllamaStatus("disconnected")
      setOllamaModels([])
    }
  }

  function getSystemData() {
    const invoices = store.invoices || []
    const employees = store.employees || []
    const products = store.products || []
    const salesOrders = store.salesOrders || []
    const leads = store.leads || []

    return {
      invoiceCount: invoices.length,
      invoiceTotal: invoices.reduce((s: number, inv: Record<string, unknown>) => s + (Number(inv.total) || 0), 0).toLocaleString(),
      employeeCount: employees.length,
      productCount: products.length,
      lowStockCount: products.filter((p: Record<string, unknown>) => (Number(p.quantity) || 0) < (Number(p.reorderLevel) || 10)).length,
      salesOrderCount: salesOrders.length,
      leadCount: leads.length,
    }
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history,
          systemData: getSystemData(),
          provider: config.provider,
          apiKey: config.apiKey,
          model: config.model,
        }),
      })

      const data = await res.json()
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || data.error || "No response received.",
        timestamp: new Date(),
        model: data.model,
        provider: data.provider,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Failed to connect to AI service."}`,
        timestamp: new Date(),
        provider: "error",
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function clearChat() {
    setMessages([])
    localStorage.removeItem("ai-chat-messages")
  }

  function exportChat() {
    const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join("\n\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ai-chat-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function saveConfig() {
    try {
      localStorage.setItem("ai-config-v2", JSON.stringify(config))
    } catch { /* ignore */ }
  }

  const activeFeatures = features.filter(f => f.active).length

  return (
    <div className="space-y-6">
      <PageHeader title={t("ai.title")} description="AI-powered assistant with self-hosted LLM support" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Brain className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">AI Features Active</p><p className="text-2xl font-bold">{activeFeatures}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><MessageSquare className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Chat Messages</p><p className="text-2xl font-bold">{messages.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${ollamaStatus === "connected" ? "bg-green-100" : "bg-red-100"}`}><Cpu className={`h-5 w-5 ${ollamaStatus === "connected" ? "text-green-600" : "text-red-600"}`} /></div><div><p className="text-sm text-muted-foreground">Ollama Status</p><p className="text-2xl font-bold capitalize">{ollamaStatus}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Globe className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Provider</p><p className="text-2xl font-bold capitalize">{config.provider}</p></div></div></CardContent></Card>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "chat" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("chat")}
        >
          <MessageSquare className="h-4 w-4 mr-2" />Chat
        </Button>
        <Button
          variant={activeTab === "features" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("features")}
        >
          <Sparkles className="h-4 w-4 mr-2" />Features
        </Button>
        <Button
          variant={activeTab === "settings" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("settings")}
        >
          <Settings className="h-4 w-4 mr-2" />Settings
        </Button>
      </div>

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <Card className="flex flex-col" style={{ height: "calc(100vh - 380px)", minHeight: "400px" }}>
          <CardHeader className="flex-none flex flex-row items-center justify-between py-3 px-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5" /> AI Assistant
              {config.provider !== "fallback" && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({config.model} via {config.provider})
                </span>
              )}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={exportChat} disabled={messages.length === 0}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={clearChat} disabled={messages.length === 0}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Brain className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Enterprise AI Assistant</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  Ask about invoices, inventory, employees, sales, leads, or get guidance on any system feature.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="px-3 py-1.5 text-sm border rounded-full hover:bg-muted transition-colors"
                    >
                      <ChevronRight className="h-3 w-3 inline mr-1" />{s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="flex-none w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-purple-600" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                  {msg.provider && msg.role === "assistant" && (
                    <p className="text-[10px] mt-2 opacity-50">
                      {msg.provider}{msg.model ? ` • ${msg.model}` : ""}
                    </p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex-none w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="flex-none w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-600 animate-pulse" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="flex-none border-t p-3">
            <form
              onSubmit={e => { e.preventDefault(); sendMessage() }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your ERP data..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !input.trim()} size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Features Tab */}
      {activeTab === "features" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => {
            const Icon = f.icon
            return (
              <Card key={f.id} className={`transition-all ${!f.active ? "opacity-60" : ""}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${f.active ? "bg-purple-100" : "bg-muted"}`}>
                        <Icon className={`h-5 w-5 ${f.active ? "text-purple-600" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{f.name}</h3>
                          <span className={`h-2 w-2 rounded-full ${f.active ? "bg-green-500" : "bg-gray-300"}`} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{f.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFeatures(prev => prev.map(x => x.id === f.id ? { ...x, active: !x.active } : x))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${f.active ? "bg-purple-600" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${f.active ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Ollama Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-5 w-5" /> Ollama Server Status
                <Button variant="ghost" size="sm" onClick={checkOllamaStatus} className="ml-auto">
                  <RefreshCw className={`h-4 w-4 ${ollamaStatus === "checking" ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {ollamaStatus === "connected" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : ollamaStatus === "disconnected" ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                )}
                <span className="font-medium capitalize">{ollamaStatus}</span>
              </div>

              {ollamaStatus === "connected" && ollamaModels.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Available Models</h4>
                  <div className="space-y-2">
                    {ollamaModels.map(m => (
                      <div
                        key={m.name}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted transition-colors ${config.model === m.name ? "border-purple-500 bg-purple-50" : ""}`}
                        onClick={() => setConfig(prev => ({ ...prev, model: m.name, provider: "ollama" }))}
                      >
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground">{formatSize(m.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ollamaStatus === "disconnected" && (
                <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                  <p className="font-medium">To set up Ollama:</p>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start the server
ollama serve

# Pull a model
ollama pull llama3.2`}
                  </pre>
                  <p className="text-muted-foreground">Or switch to Fallback mode below to use the built-in assistant.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Provider Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-5 w-5" /> AI Provider Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Provider</Label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm mt-1"
                    value={config.provider}
                    onChange={e => setConfig(prev => ({ ...prev, provider: e.target.value as AIConfig["provider"] }))}
                  >
                    <option value="ollama">Ollama (Self-hosted)</option>
                    <option value="openai">OpenAI (API Key)</option>
                    <option value="fallback">Built-in (No AI needed)</option>
                  </select>
                </div>
                <div>
                  <Label>Model</Label>
                  <Input
                    value={config.model}
                    onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                    placeholder={config.provider === "openai" ? "gpt-4o-mini" : "llama3.2"}
                    className="mt-1"
                  />
                </div>
                {config.provider === "openai" && (
                  <div>
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={config.apiKey}
                      onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
              <Button onClick={saveConfig} size="sm">
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
