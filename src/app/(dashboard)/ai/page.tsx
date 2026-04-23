"use client"

import { useState } from "react"
import { Brain, Sparkles, Zap, TrendingUp, MessageSquare, Search, Shield, Target, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PageHeader from "@/components/shared/page-header"

const aiFeatures = [
  { id: "1", name: "Lead Scoring", description: "Auto-score leads based on engagement, demographics, and behavior patterns", icon: Target, active: true },
  { id: "2", name: "Ticket Classification", description: "Automatically categorize and route support tickets using NLP", icon: Zap, active: true },
  { id: "3", name: "Resume Screening", description: "AI-powered candidate matching against job requirements", icon: Search, active: true },
  { id: "4", name: "Sales Forecasting", description: "Predict revenue trends based on pipeline and historical data", icon: TrendingUp, active: false },
  { id: "5", name: "Smart Recommendations", description: "Cross-sell and upsell suggestions based on customer behavior", icon: Sparkles, active: false },
  { id: "6", name: "Chat Assistant", description: "AI-powered help desk for employees and customers", icon: MessageSquare, active: false },
]

const recentActivity = [
  { id: "1", feature: "Lead Scoring", input: "New lead: John Doe from Acme Corp", result: "Score: 85/100 - High Priority", tokens: 245, cost: 0.004, time: "2 min ago" },
  { id: "2", feature: "Ticket Classification", input: "Cannot access my account after password reset", result: "Category: Access Issues, Priority: HIGH", tokens: 189, cost: 0.003, time: "8 min ago" },
  { id: "3", feature: "Resume Screening", input: "Resume: Sarah Chen - Full Stack Developer", result: "Match: 92% - Recommended for interview", tokens: 1024, cost: 0.015, time: "15 min ago" },
  { id: "4", feature: "Lead Scoring", input: "Lead update: Tech Solutions Inc visited pricing page 3x", result: "Score updated: 72 → 89", tokens: 198, cost: 0.003, time: "1 hour ago" },
  { id: "5", feature: "Ticket Classification", input: "Billing discrepancy on invoice #INV-2024-078", result: "Category: Billing, Priority: MEDIUM", tokens: 156, cost: 0.002, time: "2 hours ago" },
]

export default function AIHubPage() {
  const [features, setFeatures] = useState(aiFeatures)
  const [config, setConfig] = useState({ provider: "openai", apiKey: "", model: "gpt-4o" })

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f))
  }

  const activeCount = features.filter(f => f.active).length

  return (
    <div className="space-y-6">
      <PageHeader title="AI Hub" description="Configure AI integrations and manage intelligent features" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Brain className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">AI Features Active</p><p className="text-2xl font-bold">{activeCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Zap className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">API Calls Today</p><p className="text-2xl font-bold">147</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Sparkles className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Tokens Used</p><p className="text-2xl font-bold">52.3K</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><TrendingUp className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Cost This Month</p><p className="text-2xl font-bold">$12.45</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />AI Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Provider</Label>
              <select className="w-full rounded-md border px-3 py-2 text-sm mt-1" value={config.provider} onChange={e => setConfig(p => ({ ...p, provider: e.target.value }))}>
                <option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="custom">Custom Endpoint</option>
              </select>
            </div>
            <div>
              <Label>API Key</Label>
              <Input type="password" placeholder="sk-..." value={config.apiKey} onChange={e => setConfig(p => ({ ...p, apiKey: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={config.model} onChange={e => setConfig(p => ({ ...p, model: e.target.value }))} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">Test Connection</Button>
              <Button className="flex-1">Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">AI Features</h2>
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
                    <button onClick={() => toggleFeature(f.id)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${f.active ? "bg-purple-600" : "bg-gray-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${f.active ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent AI Activity</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Feature</th>
              <th className="text-left p-3 font-medium">Input</th>
              <th className="text-left p-3 font-medium">Result</th>
              <th className="text-right p-3 font-medium">Tokens</th>
              <th className="text-right p-3 font-medium">Cost</th>
              <th className="text-left p-3 font-medium">Time</th>
            </tr></thead>
            <tbody>
              {recentActivity.map(a => (
                <tr key={a.id} className="border-b hover:bg-muted/50">
                  <td className="p-3"><span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{a.feature}</span></td>
                  <td className="p-3 max-w-[200px] truncate">{a.input}</td>
                  <td className="p-3 max-w-[200px] truncate text-foreground">{a.result}</td>
                  <td className="p-3 text-right">{a.tokens}</td>
                  <td className="p-3 text-right">${a.cost.toFixed(3)}</td>
                  <td className="p-3 text-muted-foreground">{a.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
