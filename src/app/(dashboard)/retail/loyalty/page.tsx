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
  Crown,
  Users,
  Star,
  Gift,
  Search,
  Plus,
  ArrowUp,
  Award,
  UserPlus,
} from "lucide-react";

// ─── Mock Data ─────────────────────────────────────────────────────────────

const stats = [
  { label: "Total Members", value: "52,481", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Active This Month", value: "8,320", icon: Star, color: "text-green-600", bg: "bg-green-100" },
  { label: "Points Issued", value: "1.2M", icon: Award, color: "text-purple-600", bg: "bg-purple-100" },
  { label: "Points Redeemed", value: "485K", icon: Gift, color: "text-orange-600", bg: "bg-orange-100" },
];

const members = [
  { id: "LYL-10001", name: "Emma Richardson", tier: "Platinum", balance: 12450, lifetimeSpend: "$28,400", lastVisit: "May 9, 2026" },
  { id: "LYL-10002", name: "Michael Torres", tier: "Gold", balance: 8200, lifetimeSpend: "$15,800", lastVisit: "May 8, 2026" },
  { id: "LYL-10003", name: "Sophia Wang", tier: "Gold", balance: 6780, lifetimeSpend: "$12,500", lastVisit: "May 10, 2026" },
  { id: "LYL-10004", name: "Daniel Kim", tier: "Silver", balance: 3200, lifetimeSpend: "$6,200", lastVisit: "May 5, 2026" },
  { id: "LYL-10005", name: "Olivia Martinez", tier: "Silver", balance: 2890, lifetimeSpend: "$5,400", lastVisit: "May 7, 2026" },
  { id: "LYL-10006", name: "James Cooper", tier: "Bronze", balance: 1250, lifetimeSpend: "$2,800", lastVisit: "Apr 28, 2026" },
  { id: "LYL-10007", name: "Ava Patel", tier: "Platinum", balance: 15800, lifetimeSpend: "$34,200", lastVisit: "May 10, 2026" },
  { id: "LYL-10008", name: "Noah Johnson", tier: "Bronze", balance: 650, lifetimeSpend: "$1,400", lastVisit: "Apr 20, 2026" },
  { id: "LYL-10009", name: "Isabella Chen", tier: "Gold", balance: 5400, lifetimeSpend: "$11,000", lastVisit: "May 9, 2026" },
  { id: "LYL-10010", name: "Liam O'Brien", tier: "Silver", balance: 4100, lifetimeSpend: "$7,800", lastVisit: "May 6, 2026" },
];

const tiers = [
  { name: "Platinum", threshold: "$25,000+", benefits: "20% off, Free shipping, VIP events, Personal stylist", members: 1240, upgradeRate: 8.2 },
  { name: "Gold", threshold: "$10,000+", benefits: "15% off, Free shipping, Early access", members: 5430, upgradeRate: 12.5 },
  { name: "Silver", threshold: "$3,000+", benefits: "10% off, Birthday bonus, Member events", members: 14280, upgradeRate: 18.3 },
  { name: "Bronze", threshold: "$0+", benefits: "5% off, Birthday bonus, Points earning", members: 31531, upgradeRate: 22.1 },
];

const rewards = [
  { name: "$10 Store Credit", pointsRequired: 1000, type: "Discount", redemptions: 2340, stock: "Unlimited" },
  { name: "$25 Store Credit", pointsRequired: 2500, type: "Discount", redemptions: 1205, stock: "Unlimited" },
  { name: "Exclusive Tote Bag", pointsRequired: 3000, type: "Product", redemptions: 580, stock: "245 left" },
  { name: "VIP Shopping Night", pointsRequired: 5000, type: "Experience", redemptions: 120, stock: "50 spots" },
  { name: "Limited Edition Scarf", pointsRequired: 4500, type: "Product", redemptions: 310, stock: "82 left" },
  { name: "Personal Styling Session", pointsRequired: 8000, type: "Experience", redemptions: 45, stock: "Available" },
  { name: "$50 Store Credit", pointsRequired: 5000, type: "Discount", redemptions: 890, stock: "Unlimited" },
  { name: "Designer Collaboration Piece", pointsRequired: 15000, type: "Product", redemptions: 28, stock: "12 left" },
];

const campaigns = [
  { name: "Double Points Weekend", startDate: "May 15, 2026", endDate: "May 17, 2026", target: "All Members", status: "Scheduled", enrolled: 52481 },
  { name: "Gold Tier Flash Sale", startDate: "May 12, 2026", endDate: "May 12, 2026", target: "Gold & Platinum", status: "Scheduled", enrolled: 6670 },
  { name: "Birthday Month Bonus", startDate: "May 1, 2026", endDate: "May 31, 2026", target: "May Birthdays", status: "Active", enrolled: 4120 },
  { name: "Referral Bonus 500pts", startDate: "Apr 1, 2026", endDate: "Jun 30, 2026", target: "All Members", status: "Active", enrolled: 52481 },
  { name: "New Member Welcome", startDate: "Jan 1, 2026", endDate: "Dec 31, 2026", target: "New Signups", status: "Active", enrolled: 8900 },
];

function tierBadge(tier: string) {
  const map: Record<string, string> = {
    Platinum: "bg-gray-800 text-white",
    Gold: "bg-yellow-100 text-yellow-800",
    Silver: "bg-gray-200 text-gray-800",
    Bronze: "bg-orange-100 text-orange-800",
  };
  return <Badge className={map[tier] || "bg-gray-100 text-gray-800"}>{tier}</Badge>;
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    Discount: "bg-green-100 text-green-800",
    Product: "bg-blue-100 text-blue-800",
    Experience: "bg-purple-100 text-purple-800",
  };
  return <Badge className={map[type] || "bg-gray-100 text-gray-800"}>{type}</Badge>;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Active: "bg-green-100 text-green-800",
    Scheduled: "bg-blue-100 text-blue-800",
    Ended: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

export default function LoyaltyPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loyalty Program</h1>
          <p className="text-muted-foreground">Manage members, tiers, rewards, and loyalty campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Star className="h-4 w-4 mr-2" />Award Points</Button>
          <Button variant="outline"><ArrowUp className="h-4 w-4 mr-2" />Upgrade Tier</Button>
          <Button variant="outline"><Gift className="h-4 w-4 mr-2" />Create Reward</Button>
          <Button><UserPlus className="h-4 w-4 mr-2" />Enroll Member</Button>
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
          <Input placeholder="Search members, rewards..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader><CardTitle>Loyalty Members</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Points Balance</TableHead>
                    <TableHead>Lifetime Spend</TableHead>
                    <TableHead>Last Visit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase())).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.id}</TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{tierBadge(m.tier)}</TableCell>
                      <TableCell>{m.balance.toLocaleString()}</TableCell>
                      <TableCell>{m.lifetimeSpend}</TableCell>
                      <TableCell>{m.lastVisit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers">
          <Card>
            <CardHeader><CardTitle>Tier Structure</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier Name</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Benefits</TableHead>
                    <TableHead>Members Count</TableHead>
                    <TableHead>Upgrade Rate %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell>{tierBadge(t.name)}</TableCell>
                      <TableCell className="font-medium">{t.threshold}</TableCell>
                      <TableCell className="max-w-xs text-sm">{t.benefits}</TableCell>
                      <TableCell>{t.members.toLocaleString()}</TableCell>
                      <TableCell>{t.upgradeRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardHeader><CardTitle>Available Rewards</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reward Name</TableHead>
                    <TableHead>Points Required</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.pointsRequired.toLocaleString()}</TableCell>
                      <TableCell>{typeBadge(r.type)}</TableCell>
                      <TableCell>{r.redemptions.toLocaleString()}</TableCell>
                      <TableCell>{r.stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader><CardTitle>Loyalty Campaigns</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrolled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.startDate}</TableCell>
                      <TableCell>{c.endDate}</TableCell>
                      <TableCell>{c.target}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell>{c.enrolled.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
