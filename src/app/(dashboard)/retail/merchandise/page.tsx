"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Tag,
  Percent,
  TrendingDown,
  Search,
  Plus,
  LayoutGrid,
  Ban,
} from "lucide-react";

// ─── Mock Data ─────────────────────────────────────────────────────────────

const stats = [
  { label: "Active SKUs", value: "4,823", icon: Package, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Categories", value: "42", icon: LayoutGrid, color: "text-green-600", bg: "bg-green-100" },
  { label: "Avg Margin %", value: "54.2%", icon: Percent, color: "text-purple-600", bg: "bg-purple-100" },
  { label: "Markdown Items", value: "318", icon: TrendingDown, color: "text-orange-600", bg: "bg-orange-100" },
];

const assortment = [
  { sku: "SKU-4821", name: "Classic Leather Jacket", category: "Outerwear", season: "Fall/Winter", sizeRange: "XS-XXL", color: "Black", status: "Active", margin: 62 },
  { sku: "SKU-3102", name: "Organic Cotton Tee", category: "Tops", season: "All Season", sizeRange: "S-XL", color: "White", status: "Active", margin: 71 },
  { sku: "SKU-5590", name: "Slim Fit Chinos", category: "Bottoms", season: "All Season", sizeRange: "28-38", color: "Navy", status: "Active", margin: 58 },
  { sku: "SKU-2201", name: "Silk Evening Dress", category: "Dresses", season: "Spring/Summer", sizeRange: "2-14", color: "Red", status: "Pre-order", margin: 68 },
  { sku: "SKU-7788", name: "Wool Blend Sweater", category: "Knitwear", season: "Fall/Winter", sizeRange: "S-XXL", color: "Camel", status: "Active", margin: 55 },
  { sku: "SKU-1456", name: "Canvas Sneakers", category: "Footwear", season: "Spring/Summer", sizeRange: "6-13", color: "Multi", status: "Active", margin: 48 },
  { sku: "SKU-9901", name: "Vintage Denim Jacket", category: "Outerwear", season: "All Season", sizeRange: "XS-XL", color: "Blue", status: "Discontinued", margin: 45 },
  { sku: "SKU-6630", name: "Cashmere Scarf", category: "Accessories", season: "Fall/Winter", sizeRange: "One Size", color: "Grey", status: "Active", margin: 72 },
];

const pricing = [
  { sku: "SKU-4821", name: "Classic Leather Jacket", cost: "$120.00", retail: "$320.00", current: "$320.00", markdown: 0, effectiveDate: "—" },
  { sku: "SKU-3102", name: "Organic Cotton Tee", cost: "$8.50", retail: "$29.99", current: "$29.99", markdown: 0, effectiveDate: "—" },
  { sku: "SKU-5590", name: "Slim Fit Chinos", cost: "$25.00", retail: "$59.99", current: "$44.99", markdown: 25, effectiveDate: "May 1, 2026" },
  { sku: "SKU-2201", name: "Silk Evening Dress", cost: "$85.00", retail: "$268.00", current: "$268.00", markdown: 0, effectiveDate: "—" },
  { sku: "SKU-7788", name: "Wool Blend Sweater", cost: "$35.00", retail: "$79.99", current: "$55.99", markdown: 30, effectiveDate: "Apr 28, 2026" },
  { sku: "SKU-1456", name: "Canvas Sneakers", cost: "$22.00", retail: "$42.00", current: "$33.60", markdown: 20, effectiveDate: "May 5, 2026" },
  { sku: "SKU-9901", name: "Vintage Denim Jacket", cost: "$45.00", retail: "$89.99", current: "$53.99", markdown: 40, effectiveDate: "Apr 15, 2026" },
  { sku: "SKU-6630", name: "Cashmere Scarf", cost: "$28.00", retail: "$99.99", current: "$99.99", markdown: 0, effectiveDate: "—" },
];

const promotions = [
  { name: "Summer Kickoff BOGO", type: "BOGO", startDate: "May 15, 2026", endDate: "May 31, 2026", skuCount: 45, redemptions: 0 },
  { name: "Spring Clearance 30%", type: "% Off", startDate: "Apr 20, 2026", endDate: "May 15, 2026", skuCount: 120, redemptions: 1843 },
  { name: "New Season Bundle", type: "Bundle", startDate: "May 1, 2026", endDate: "Jun 30, 2026", skuCount: 18, redemptions: 234 },
  { name: "$10 Off Accessories", type: "$ Off", startDate: "May 5, 2026", endDate: "May 20, 2026", skuCount: 67, redemptions: 412 },
  { name: "VIP Double Points", type: "% Off", startDate: "May 10, 2026", endDate: "May 12, 2026", skuCount: 4823, redemptions: 89 },
  { name: "Buy 3 Get 1 Free Tees", type: "BOGO", startDate: "May 8, 2026", endDate: "May 22, 2026", skuCount: 32, redemptions: 156 },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Active: "bg-green-100 text-green-800",
    Discontinued: "bg-red-100 text-red-800",
    "Pre-order": "bg-blue-100 text-blue-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function promoBadge(type: string) {
  const map: Record<string, string> = {
    BOGO: "bg-purple-100 text-purple-800",
    "% Off": "bg-green-100 text-green-800",
    "$ Off": "bg-blue-100 text-blue-800",
    Bundle: "bg-orange-100 text-orange-800",
  };
  return <Badge className={map[type] || "bg-gray-100 text-gray-800"}>{type}</Badge>;
}

export default function MerchandisePage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Merchandise Management</h1>
          <p className="text-muted-foreground">Manage assortment, pricing, promotions, and planograms</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><TrendingDown className="h-4 w-4 mr-2" />Set Markdown</Button>
          <Button variant="outline"><Ban className="h-4 w-4 mr-2" />Discontinue SKU</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Create Promotion</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search SKUs, products..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline"><LayoutGrid className="h-4 w-4 mr-2" />Update Planogram</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="assortment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assortment">Assortment</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="planogram">Planogram</TabsTrigger>
        </TabsList>

        <TabsContent value="assortment">
          <Card>
            <CardHeader><CardTitle>Product Assortment</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Size Range</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assortment.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.sku.toLowerCase().includes(search.toLowerCase())).map((a) => (
                    <TableRow key={a.sku}>
                      <TableCell className="font-mono">{a.sku}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.category}</TableCell>
                      <TableCell>{a.season}</TableCell>
                      <TableCell>{a.sizeRange}</TableCell>
                      <TableCell>{a.color}</TableCell>
                      <TableCell>{statusBadge(a.status)}</TableCell>
                      <TableCell className="text-right">{a.margin}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader><CardTitle>Pricing & Markdowns</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Retail Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Markdown %</TableHead>
                    <TableHead>Effective Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricing.map((p) => (
                    <TableRow key={p.sku}>
                      <TableCell className="font-mono">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.cost}</TableCell>
                      <TableCell>{p.retail}</TableCell>
                      <TableCell className={p.markdown > 0 ? "text-red-600 font-medium" : ""}>{p.current}</TableCell>
                      <TableCell>{p.markdown > 0 ? <Badge className="bg-red-100 text-red-800">{p.markdown}%</Badge> : "—"}</TableCell>
                      <TableCell>{p.effectiveDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions">
          <Card>
            <CardHeader><CardTitle>Active Promotions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>SKU Count</TableHead>
                    <TableHead className="text-right">Redemptions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{promoBadge(p.type)}</TableCell>
                      <TableCell>{p.startDate}</TableCell>
                      <TableCell>{p.endDate}</TableCell>
                      <TableCell>{p.skuCount}</TableCell>
                      <TableCell className="text-right">{p.redemptions.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planogram">
          <Card>
            <CardHeader><CardTitle>Planogram Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {["Entrance Display", "Wall A - Outerwear", "Wall B - Dresses", "Center Island - Accessories", "Fixture 1 - Tops", "Fixture 2 - Bottoms", "Fixture 3 - Knitwear", "Back Wall - Footwear"].map((zone) => (
                  <Card key={zone} className="border-dashed">
                    <CardContent className="p-4 text-center">
                      <LayoutGrid className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">{zone}</p>
                      <p className="text-xs text-muted-foreground mt-1">{Math.floor(Math.random() * 30 + 10)} SKUs</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
