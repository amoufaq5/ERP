"use client";

import { useState } from "react";
import {
  Gift,
  Users,
  Star,
  RefreshCw,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
type TransactionType = "EARN" | "REDEEM" | "ADJUST";

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  pointsPerDollar: number;
  redemptionRate: number; // points per $1 redemption value
  members: number;
  active: boolean;
}

interface LoyaltyMember {
  id: string;
  name: string;
  account: string;
  program: string;
  points: number;
  tier: Tier;
  joinDate: string;
}

interface LoyaltyTransaction {
  id: string;
  member: string;
  type: TransactionType;
  points: number;
  description: string;
  date: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const INITIAL_PROGRAMS: LoyaltyProgram[] = [
  {
    id: "LP-001",
    name: "Enterprise Rewards",
    description:
      "Exclusive rewards program for enterprise-tier customers. Earn accelerated points on all annual contract renewals and add-on purchases.",
    pointsPerDollar: 5,
    redemptionRate: 100,
    members: 89,
    active: true,
  },
  {
    id: "LP-002",
    name: "SMB Loyalty Club",
    description:
      "Tailored for small and medium businesses. Earn points on every invoice and redeem them for service credits, training sessions, or merchandise.",
    pointsPerDollar: 3,
    redemptionRate: 150,
    members: 67,
    active: true,
  },
];

const INITIAL_MEMBERS: LoyaltyMember[] = [
  {
    id: "LM-001",
    name: "James Carter",
    account: "TechCorp Solutions",
    program: "Enterprise Rewards",
    points: 48_500,
    tier: "PLATINUM",
    joinDate: "2024-03-15",
  },
  {
    id: "LM-002",
    name: "Priya Sharma",
    account: "Global Retail Inc.",
    program: "Enterprise Rewards",
    points: 31_200,
    tier: "GOLD",
    joinDate: "2024-07-22",
  },
  {
    id: "LM-003",
    name: "Nathan Brooks",
    account: "Nexus Finance",
    program: "Enterprise Rewards",
    points: 19_800,
    tier: "SILVER",
    joinDate: "2024-11-05",
  },
  {
    id: "LM-004",
    name: "Olivia Chen",
    account: "Manufactura Group",
    program: "SMB Loyalty Club",
    points: 8_750,
    tier: "BRONZE",
    joinDate: "2025-02-18",
  },
  {
    id: "LM-005",
    name: "Samuel Torres",
    account: "CloudBuild Technologies",
    program: "SMB Loyalty Club",
    points: 14_300,
    tier: "SILVER",
    joinDate: "2025-05-10",
  },
  {
    id: "LM-006",
    name: "Rachel Kim",
    account: "HealthPlus Systems",
    program: "Enterprise Rewards",
    points: 27_600,
    tier: "GOLD",
    joinDate: "2025-08-30",
  },
];

const TRANSACTIONS: LoyaltyTransaction[] = [
  {
    id: "TXN-001",
    member: "James Carter",
    type: "EARN",
    points: 5_000,
    description: "Annual contract renewal — Enterprise Rewards",
    date: "2026-03-28",
  },
  {
    id: "TXN-002",
    member: "Priya Sharma",
    type: "REDEEM",
    points: -3_000,
    description: "Service credit redemption — $30 off invoice",
    date: "2026-03-27",
  },
  {
    id: "TXN-003",
    member: "Nathan Brooks",
    type: "EARN",
    points: 1_500,
    description: "Add-on module purchase — Analytics Pro",
    date: "2026-03-26",
  },
  {
    id: "TXN-004",
    member: "Olivia Chen",
    type: "EARN",
    points: 750,
    description: "Monthly subscription payment",
    date: "2026-03-25",
  },
  {
    id: "TXN-005",
    member: "Samuel Torres",
    type: "ADJUST",
    points: 500,
    description: "Goodwill adjustment — support escalation compensation",
    date: "2026-03-24",
  },
  {
    id: "TXN-006",
    member: "Rachel Kim",
    type: "REDEEM",
    points: -2_500,
    description: "Training session credit — 2 hours onsite",
    date: "2026-03-22",
  },
  {
    id: "TXN-007",
    member: "James Carter",
    type: "EARN",
    points: 2_250,
    description: "Referral bonus — new customer TechBridge Ltd.",
    date: "2026-03-20",
  },
  {
    id: "TXN-008",
    member: "Nathan Brooks",
    type: "REDEEM",
    points: -1_000,
    description: "Branded merchandise bundle",
    date: "2026-03-18",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_STYLES: Record<Tier, string> = {
  BRONZE: "bg-amber-100 text-amber-800",
  SILVER: "bg-gray-100 text-gray-600",
  GOLD: "bg-yellow-100 text-yellow-800",
  PLATINUM: "bg-purple-100 text-purple-800",
};

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_STYLES[tier]}`}
    >
      {tier}
    </span>
  );
}

const TXN_STYLES: Record<TransactionType, string> = {
  EARN: "bg-green-100 text-green-800",
  REDEEM: "bg-red-100 text-red-700",
  ADJUST: "bg-blue-100 text-blue-800",
};

function TxnTypeBadge({ type }: { type: TransactionType }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TXN_STYLES[type]}`}
    >
      {type}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>(INITIAL_PROGRAMS);
  const [members, setMembers] = useState<LoyaltyMember[]>(INITIAL_MEMBERS);
  const [activeTab, setActiveTab] = useState("programs");
  const [memberSearch, setMemberSearch] = useState("");
  const [txnSearch, setTxnSearch] = useState("");

  // Add Member dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    account: "",
    program: INITIAL_PROGRAMS[0].name,
  });

  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const totalRedemptions = TRANSACTIONS.filter(
    (t) => t.type === "REDEEM"
  ).length;

  function toggleProgram(id: string) {
    setPrograms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  }

  function handleAddMember() {
    if (!addForm.name || !addForm.account) return;
    const newMember: LoyaltyMember = {
      id: `LM-${String(members.length + 1).padStart(3, "0")}`,
      name: addForm.name,
      account: addForm.account,
      program: addForm.program,
      points: 0,
      tier: "BRONZE",
      joinDate: new Date().toISOString().split("T")[0],
    };
    setMembers((prev) => [newMember, ...prev]);
    setAddForm({ name: "", account: "", program: INITIAL_PROGRAMS[0].name });
    setAddOpen(false);
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.account.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.program.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const filteredTxns = TRANSACTIONS.filter(
    (t) =>
      t.member.toLowerCase().includes(txnSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(txnSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Loyalty Programs"
        description="Manage customer loyalty programs, track member points, and monitor reward redemptions"
      >
        <Button variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Sync Points
        </Button>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Programs"
          value={programs.filter((p) => p.active).length}
          subtitle="Currently running programs"
          icon={Gift}
        />
        <StatsCard
          title="Total Members"
          value={members.length}
          subtitle="Enrolled across all programs"
          icon={Users}
          change={12}
          changeLabel="vs last quarter"
        />
        <StatsCard
          title="Points Issued"
          value={totalPoints.toLocaleString()}
          subtitle="Cumulative points balance"
          icon={Star}
          change={8}
          changeLabel="vs last month"
        />
        <StatsCard
          title="Redemptions"
          value={totalRedemptions}
          subtitle="Rewards redeemed to date"
          icon={RefreshCw}
          change={5}
          changeLabel="vs last month"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* ── Programs Tab ──────────────────────────────────────────────── */}
        <TabsContent value="programs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {programs.map((program) => (
              <Card key={program.id} className="overflow-hidden">
                <div
                  className={`h-1.5 w-full ${
                    program.active ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base leading-snug">
                        {program.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {program.id}
                      </CardDescription>
                    </div>
                    <button
                      onClick={() => toggleProgram(program.id)}
                      className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={
                        program.active ? "Deactivate program" : "Activate program"
                      }
                    >
                      {program.active ? (
                        <ToggleRight className="w-7 h-7 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-7 h-7" />
                      )}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {program.description}
                  </p>
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {program.pointsPerDollar}x
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Points / $1
                      </p>
                    </div>
                    <div className="text-center border-x border-border">
                      <p className="text-lg font-bold text-foreground">
                        {program.redemptionRate}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pts per $1 value
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {program.members}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={
                        program.active
                          ? "border-green-300 text-green-700 bg-green-50"
                          : "border-gray-300 text-gray-500 bg-gray-50"
                      }
                    >
                      {program.active ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Members Tab ───────────────────────────────────────────────── */}
        <TabsContent value="members">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>
              <span className="text-sm text-muted-foreground shrink-0">
                {filteredMembers.length} member
                {filteredMembers.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Member Name
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Account
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Program
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Points
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Tier
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Join Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No members found.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {member.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {member.account}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {member.program}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {member.points.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <TierBadge tier={member.tier} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {member.joinDate}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Transactions Tab ──────────────────────────────────────────── */}
        <TabsContent value="transactions">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search transactions..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                />
              </div>
              <span className="text-sm text-muted-foreground shrink-0">
                {filteredTxns.length} transaction
                {filteredTxns.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Member
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Points
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredTxns.map((txn) => (
                      <tr
                        key={txn.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {txn.member}
                        </td>
                        <td className="px-4 py-3">
                          <TxnTypeBadge type={txn.type} />
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums ${
                            txn.points > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {txn.points > 0 ? "+" : ""}
                          {txn.points.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[280px] truncate">
                          {txn.description}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {txn.date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Member Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Member Name *</Label>
              <Input
                placeholder="Full name"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm({ ...addForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account *</Label>
              <Input
                placeholder="Company or account name"
                value={addForm.account}
                onChange={(e) =>
                  setAddForm({ ...addForm, account: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Program</Label>
              <div className="flex flex-col gap-2">
                {programs
                  .filter((p) => p.active)
                  .map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                        addForm.program === p.name
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        className="accent-primary"
                        name="program"
                        value={p.name}
                        checked={addForm.program === p.name}
                        onChange={() =>
                          setAddForm({ ...addForm, program: p.name })
                        }
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.pointsPerDollar}x points per dollar
                        </p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
