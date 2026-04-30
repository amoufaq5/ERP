"use client"

import { useState, useEffect } from "react"
import {
  Database, Server, HardDrive, Activity, RefreshCw,
  CheckCircle, XCircle, Clock, ArrowUpDown, Shield, Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PageHeader from "@/components/shared/page-header"
import { useTranslation } from "@/lib/i18n/i18n-context"

interface DbInfo {
  config: { type: string; isProduction: boolean; poolSize: number }
  health: { connected: boolean; type: string; latencyMs: number; error?: string }
  tables: { table: string; count: number }[]
  migrations: { status: string; pending: number }
}

export default function DatabaseAdminPage() {
  const { t } = useTranslation()
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "tables" | "migrate" | "setup">("overview")

  useEffect(() => { fetchDbInfo() }, [])

  async function fetchDbInfo() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/database")
      if (res.ok) {
        setDbInfo(await res.json())
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const isConnected = dbInfo?.health?.connected ?? false
  const dbType = dbInfo?.config?.type || "sqlite"
  const latency = dbInfo?.health?.latencyMs ?? 0
  const totalRecords = (dbInfo?.tables || []).reduce((s, tbl) => s + Math.max(0, tbl.count), 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Database Administration" description="Manage database connections, migrations, and monitoring" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isConnected ? "bg-green-100" : "bg-red-100"}`}>
                {isConnected ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold">{isConnected ? "Connected" : "Disconnected"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Database className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Database Type</p>
                <p className="text-2xl font-bold capitalize">{dbType}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Clock className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Latency</p>
                <p className="text-2xl font-bold">{latency}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><HardDrive className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{totalRecords.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {(["overview", "tables", "migrate", "setup"] as const).map(tab => (
          <Button key={tab} variant={activeTab === tab ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(tab)}>
            {tab === "overview" && <Activity className="h-4 w-4 mr-2" />}
            {tab === "tables" && <Database className="h-4 w-4 mr-2" />}
            {tab === "migrate" && <ArrowUpDown className="h-4 w-4 mr-2" />}
            {tab === "setup" && <Server className="h-4 w-4 mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={fetchDbInfo} className="ml-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Server className="h-5 w-5" /> Connection Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span className="font-medium capitalize">{dbType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pool Size</span><span className="font-medium">{dbInfo?.config?.poolSize || 1}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Environment</span><span className="font-medium">{dbInfo?.config?.isProduction ? "Production" : "Development"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tables</span><span className="font-medium">{dbInfo?.tables?.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Migration Status</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">{dbInfo?.migrations?.status || "unknown"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5" /> Database Features</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { name: "Multi-tenancy", supported: true, desc: "Database-per-tenant isolation" },
                { name: "Connection Pooling", supported: dbType === "postgresql", desc: dbType === "postgresql" ? "PgBouncer compatible" : "Not needed for SQLite" },
                { name: "Full-text Search", supported: dbType === "postgresql", desc: dbType === "postgresql" ? "PostgreSQL FTS" : "Basic LIKE queries" },
                { name: "JSON Fields", supported: dbType === "postgresql", desc: dbType === "postgresql" ? "Native JSONB" : "Text with JSON parse" },
                { name: "Row-level Security", supported: dbType === "postgresql", desc: dbType === "postgresql" ? "RLS policies" : "App-level only" },
              ].map(feat => (
                <div key={feat.name} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{feat.name}</span>
                    <p className="text-xs text-muted-foreground">{feat.desc}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${feat.supported ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {feat.supported ? "Active" : "N/A"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "tables" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Database Tables</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Table</th>
                  <th className="text-right p-3 font-medium">Records</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(dbInfo?.tables || []).map(tbl => (
                  <tr key={tbl.table} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{tbl.table}</td>
                    <td className="p-3 text-right">{tbl.count >= 0 ? tbl.count.toLocaleString() : "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${tbl.count >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {tbl.count >= 0 ? "OK" : "Error"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!dbInfo?.tables || dbInfo.tables.length === 0) && (
                  <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No table data available. Check database connection.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === "migrate" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowUpDown className="h-5 w-5" /> Migration Manager</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Current Migration Status</h4>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">All migrations applied. Schema is up to date.</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline"><Zap className="h-4 w-4 mr-2" />Run Pending Migrations</Button>
                <Button size="sm" variant="outline"><Database className="h-4 w-4 mr-2" />Generate Migration</Button>
                <Button size="sm" variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Reset Database</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Migration to PostgreSQL</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm space-y-2">
                <p className="font-medium text-blue-800">Steps to migrate from SQLite to PostgreSQL:</p>
                <ol className="list-decimal ml-5 space-y-1 text-blue-700">
                  <li>Install PostgreSQL and create a database</li>
                  <li>Update <code className="bg-blue-100 px-1 rounded">DATABASE_URL</code> in <code className="bg-blue-100 px-1 rounded">.env</code></li>
                  <li>Update <code className="bg-blue-100 px-1 rounded">prisma/schema.prisma</code> provider to &quot;postgresql&quot;</li>
                  <li>Run <code className="bg-blue-100 px-1 rounded">npx prisma migrate dev --name init</code></li>
                  <li>Export data from SQLite and import to PostgreSQL</li>
                  <li>Verify all tables and data integrity</li>
                </ol>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`# 1. Set PostgreSQL connection
DATABASE_URL="postgresql://user:password@localhost:5432/erp_db"

# 2. Update schema provider
# In prisma/schema.prisma, change:
#   provider = "sqlite"  →  provider = "postgresql"

# 3. Generate and apply migration
npx prisma migrate dev --name migrate-to-postgresql

# 4. Seed initial data
npx prisma db seed`}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "setup" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">PostgreSQL Setup Guide</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Connection String</Label>
                  <Input
                    placeholder="postgresql://user:password@localhost:5432/erp_db"
                    className="mt-1 font-mono text-xs"
                    readOnly
                    value={process.env.DATABASE_URL || "file:./prisma/dev.db"}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Set via DATABASE_URL environment variable</p>
                </div>
                <div>
                  <Label>Pool Size</Label>
                  <Input type="number" placeholder="10" className="mt-1" readOnly value={dbInfo?.config?.poolSize || 1} />
                  <p className="text-xs text-muted-foreground mt-1">Set via DB_POOL_SIZE environment variable</p>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm space-y-3">
                <h4 className="font-medium">Docker Quick Start</h4>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`# Start PostgreSQL with Docker
docker run -d \\
  --name erp-postgres \\
  -e POSTGRES_USER=erp_admin \\
  -e POSTGRES_PASSWORD=secure_password \\
  -e POSTGRES_DB=erp_db \\
  -p 5432:5432 \\
  -v pgdata:/var/lib/postgresql/data \\
  postgres:16-alpine

# Connection string:
# postgresql://erp_admin:secure_password@localhost:5432/erp_db`}
                </pre>
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm space-y-3">
                <h4 className="font-medium">Production Recommendations</h4>
                <ul className="space-y-2">
                  {[
                    "Use connection pooling (PgBouncer) for high concurrency",
                    "Enable SSL for database connections in production",
                    "Set up automated daily backups with pg_dump",
                    "Use read replicas for reporting queries",
                    "Monitor with pg_stat_statements extension",
                    "Configure WAL archiving for point-in-time recovery",
                  ].map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-none" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
