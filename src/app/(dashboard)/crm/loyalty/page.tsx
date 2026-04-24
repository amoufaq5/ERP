"use client";

import { useState } from "react";
import { Gift, Users, Star, RefreshCw, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

type Tier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
type TransactionType = "EARN" | "REDEEM" | "ADJUST";

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  pointsPerEGP: number;
  redemptionRate: number;
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

const INITIAL_PROGRAMS: LoyaltyProgram[] = [
  { id: "LP-001", name: "Enterprise Rewards", description: "Exclusive rewards program for enterprise-tier customers. Earn accelerated points on all annual contract renewals and add-on purchases.", pointsPerEGP: 5, redemptionRate: 100, members: 89, active: true },
  { id: "LP-002", name: "SMB Loyalty Club", description: "Tailored for small and medium businesses. Earn points on every invoice and redeem them for service credits, training sessions, or merchandise.", pointsPerEGP: 3, redemptionRate: 150, members: 67, active: true },
];

const INITIAL_MEMBERS: LoyaltyMember[] = [
  { id: "LM-001", name: "James Carter", account: "TechCorp Solutions", program: "Enterprise Rewards", points: 48_500, tier: "PLATINUM", joinDate: "2024-03-15" },
  { id: "LM-002", name: "Priya Sharma", account: "Global Retail Inc.", program: "Enterprise Rewards", points: 31_200, tier: "GOLD", joinDate: "2024-07-22" },
  { id: "LM-003", name: "Nathan Brooks", account: "Nexus Finance", program: "Enterprise Rewards", points: 19_800, tier: "SILVER", joinDate: "2024-11-05" },
  { id: "LM-004", name: "Olivia Chen", account: "Manufactura Group", program: "SMB Loyalty Club", points: 8_750, tier: "BRONZE", joinDate: "2025-02-18" },
  { id: "LM-005", name: "Samuel Torres", account: "CloudBuild Technologies", program: "SMB Loyalty Club", points: 14_300, tier: "SILVER", joinDate: "2025-05-10" },
  { id: "LM-006", name: "Rachel Kim", account: "HealthPlus Systems", program: "Enterprise Rewards", points: 27_600, tier: "GOLD", joinDate: "2025-08-30" },
];

const TRANSACTIONS: LoyaltyTransaction[] = [
  { id: "TXN-001", member: "James Carter", type: "EARN", points: 5_000, description: "Annual contract renewal — Enterprise Rewards", date: "2026-03-28" },
  { id: "TXN-002", member: "Priya Sharma", type: "REDEEM", points: -3_000, description: "Service credit redemption — EGP 30 off invoice", date: "2026-03-27" },
  { id: "TXN-003", member: "Nathan Brooks", type: "EARN", points: 1_500, description: "Add-on module purchase — Analytics Pro", date: "2026-03-26" },
  { id: "TXN-004", member: "Olivia Chen", type: "EARN", points: 750, description: "Monthly subscription payment", date: "2026-03-25" },
  { id: "TXN-005", member: "Samuel Torres", type: "ADJUST", points: 500, description: "Goodwill adjustment — support escalation compensation", date: "2026-03-24" },
  { id: "TXN-006", member: "Rachel Kim", type: "REDEEM", points: -2_500, description: "Training session credit — 2 hours onsite", date: "2026-03-22" },
  { id: "TXN-007", member: "James Carter", type: "EARN", points: 2_250, description: "Referral bonus — new customer TechBridge Ltd.", date: "2026-03-20" },
  { id: "TXN-008", member: "Nathan Brooks", type: "REDEEM", points: -1_000, description: "Branded merchandise bundle", date: "2026-03-18" },
];

const TIER_STYLES: Record<Tier, string> = {
  BRONZE: "bg-amber-100 text-amber-800", SILVER: "bg-gray-100 text-gray-600",
  GOLD: "bg-yellow-100 text-yellow-800", PLATINUM: "bg-purple-100 text-purple-800",
};

const TXN_STYLES: Record<TransactionType, string> = {
  EARN: "bg-green-100 text-green-800", REDEEM: "bg-red-100 text-red-700", ADJUST: "bg-blue-100 text-blue-800",
};

function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_STYLES[tier]}`}>{tier}</span>;
}

function TxnTypeBadge({ type }: { type: TransactionType }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TXN_STYLES[type]}`}>{type}</span>;
}

const MEMBER_FIELDS: EntityField[] = [
  { name: "name", label: "Member Name", type: "text", placeholder: "Full name", required: true },
  { name: "account", label: "Account", type: "text", placeholder: "Company or account name", required: true },
  { name: "program", label: "Program", type: "select", options: [
    { label: "Enterprise Rewards", value: "Enterprise Rewards" },
    { label: "SMB Loyalty Club", value: "SMB Loyalty Club" },
  ]},
];

const MEMBER_FILTER_FIELDS = [
  { key: "tier", label: "Tier", type: "select" as const, options: [
    { label: "Bronze", value: "BRONZE" }, { label: "Silver", value: "SILVER" },
    { label: "Gold", value: "GOLD" }, { label: "Platinum", value: "PLATINUM" },
  ]},
  { key: "program", label: "Program", type: "select" as const, options: [
    { label: "Enterprise Rewards", value: "Enterprise Rewards" },
    { label: "SMB Loyalty Club", value: "SMB Loyalty Club" },
  ]},
];

export default function LoyaltyPage() {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>(INITIAL_PROGRAMS);
  const [members, setMembers] = useState<LoyaltyMember[]>(INITIAL_MEMBERS);
  const [activeTab, setActiveTab] = useState("programs");
  const [memberFilters, setMemberFilters] = useState<FilterState>({ _search: "", tier: "", program: "" });
  const [txnFilters, setTxnFilters] = useState<FilterState>({ _search: "" });
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<LoyaltyMember | null>(null);
  const [viewMember, setViewMember] = useState<LoyaltyMember | null>(null);

  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const totalRedemptions = TRANSACTIONS.filter((t) => t.type === "REDEEM").length;

  function toggleProgram(id: string) {
    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  }

  const filteredMembers = members.filter((m) => {
    const q = (memberFilters._search || "").toLowerCase();
    const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.account.toLowerCase().includes(q) || m.program.toLowerCase().includes(q);
    const matchesTier = !memberFilters.tier || m.tier === memberFilters.tier;
    const matchesProgram = !memberFilters.program || m.program === memberFilters.program;
    return matchesSearch && matchesTier && matchesProgram;
  });

  const filteredTxns = TRANSACTIONS.filter((t) => {
    const q = (txnFilters._search || "").toLowerCase();
    return !q || t.member.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  const tierFlow: Record<string, Tier> = { BRONZE: "SILVER", SILVER: "GOLD", GOLD: "PLATINUM" };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Loyalty Programs" description="Manage customer loyalty programs, track member points, and monitor reward redemptions">
        <Button variant="outline" className="gap-2" onClick={() => { setMembers(prev => prev.map(m => ({ ...m, points: m.points + Math.floor(Math.random() * 500) }))); }}><RefreshCw className="w-4 h-4" />Sync Points</Button>
        <Button className="gap-2" onClick={() => { setEditingMember(null); setShowModal(true); }}><Plus className="w-4 h-4" />Add Member</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Active Programs" value={programs.filter((p) => p.active).length} subtitle="Currently running programs" icon={<Gift className="w-5 h-5" />} />
        <StatsCard title="Total Members" value={members.length} subtitle="Enrolled across all programs" icon={<Users className="w-5 h-5" />} />
        <StatsCard title="Points Issued" value={totalPoints.toLocaleString()} subtitle="Cumulative points balance" icon={<Star className="w-5 h-5" />} />
        <StatsCard title="Redemptions" value={totalRedemptions} subtitle="Rewards redeemed to date" icon={<RefreshCw className="w-5 h-5" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {programs.map((program) => (
              <Card key={program.id} className="overflow-hidden">
                <div className={`h-1.5 w-full ${program.active ? "bg-green-500" : "bg-gray-300"}`} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base leading-snug">{program.name}</CardTitle>
                      <CardDescription className="text-xs">{program.id}</CardDescription>
                    </div>
                    <button onClick={() => toggleProgram(program.id)} className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors">
                      {program.active ? <ToggleRight className="w-7 h-7 text-green-500" /> : <ToggleLeft className="w-7 h-7" />}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{program.description}</p>
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                    <div className="text-center"><p className="text-lg font-bold text-foreground">{program.pointsPerEGP}x</p><p className="text-xs text-muted-foreground mt-0.5">Points / EGP 1</p></div>
                    <div className="text-center border-x border-border"><p className="text-lg font-bold text-foreground">{program.redemptionRate}</p><p className="text-xs text-muted-foreground mt-0.5">Pts per EGP 1 value</p></div>
                    <div className="text-center"><p className="text-lg font-bold text-foreground">{program.members}</p><p className="text-xs text-muted-foreground mt-0.5">Members</p></div>
                  </div>
                  <Badge variant="outline" className={program.active ? "border-green-300 text-green-700 bg-green-50" : "border-gray-300 text-gray-500 bg-gray-50"}>
                    {program.active ? "Active" : "Inactive"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <FilterBar
                searchValue={memberFilters._search}
                onSearchChange={(v) => setMemberFilters((f) => ({ ...f, _search: v }))}
                fields={MEMBER_FILTER_FIELDS}
                values={memberFilters}
                onChange={(k, v) => setMemberFilters((f) => ({ ...f, [k]: v }))}
              />
            </div>
            <DataTable
              columns={[
                { key: "name", label: "Member Name", render: (v) => <span className="font-medium text-foreground">{v as string}</span> },
                { key: "account", label: "Account", render: (v) => <span className="text-muted-foreground">{v as string}</span> },
                { key: "program", label: "Program", render: (v) => <span className="text-muted-foreground">{v as string}</span> },
                { key: "points", label: "Points", className: "text-right", render: (v) => <span className="font-semibold text-foreground">{(v as number).toLocaleString()}</span> },
                { key: "tier", label: "Tier", render: (v) => <TierBadge tier={v as Tier} /> },
                { key: "joinDate", label: "Join Date", render: (v) => <span className="text-muted-foreground">{v as string}</span> },
                { key: "_actions", label: "", render: (_v, row) => {
                  const member = row as unknown as LoyaltyMember;
                  const next = tierFlow[member.tier];
                  return (
                    <EditDeleteMenu
                      onView={() => setViewMember(member)}
                      onEdit={() => { setEditingMember(member); setShowModal(true); }}
                      onDelete={() => setMembers((prev) => prev.filter((m) => m.id !== member.id))}
                      itemLabel={member.name}
                      extraItems={next ? [{ label: `Upgrade to ${next}`, onClick: () => setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, tier: next } : m)) }] : []}
                    />
                  );
                }},
              ] as Column<Record<string, unknown>>[]}
              data={filteredMembers as unknown as Record<string, unknown>[]}
              
              emptyMessage="No members found."
              exportable
              exportFilename="loyalty-members.csv"
            />
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <FilterBar
                searchValue={txnFilters._search}
                onSearchChange={(v) => setTxnFilters((f) => ({ ...f, _search: v }))}
                fields={[]}
                values={txnFilters}
                onChange={() => {}}
              />
            </div>
            <DataTable
              columns={[
                { key: "member", label: "Member", render: (v) => <span className="font-medium text-foreground">{v as string}</span> },
                { key: "type", label: "Type", render: (v) => <TxnTypeBadge type={v as TransactionType} /> },
                { key: "points", label: "Points", className: "text-right", render: (v) => {
                  const pts = v as number;
                  return <span className={`font-semibold tabular-nums ${pts > 0 ? "text-green-600" : "text-red-600"}`}>{pts > 0 ? "+" : ""}{pts.toLocaleString()}</span>;
                }},
                { key: "description", label: "Description", className: "max-w-[280px] truncate", render: (v) => <span className="text-muted-foreground">{v as string}</span> },
                { key: "date", label: "Date", render: (v) => <span className="text-muted-foreground">{v as string}</span> },
              ] as Column<Record<string, unknown>>[]}
              data={filteredTxns as unknown as Record<string, unknown>[]}
              
              emptyMessage="No transactions found."
              exportable
              exportFilename="loyalty-transactions.csv"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Member Detail Dialog */}
      <Dialog open={!!viewMember} onOpenChange={(open) => { if (!open) setViewMember(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewMember?.name}</DialogTitle>
          </DialogHeader>
          {viewMember && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Member ID</span><p className="font-medium">{viewMember.id}</p></div>
              <div><span className="text-sm text-muted-foreground">Name</span><p className="font-medium">{viewMember.name}</p></div>
              <div><span className="text-sm text-muted-foreground">Account</span><p className="font-medium">{viewMember.account}</p></div>
              <div><span className="text-sm text-muted-foreground">Program</span><p className="font-medium">{viewMember.program}</p></div>
              <div><span className="text-sm text-muted-foreground">Points</span><p className="font-medium">{viewMember.points.toLocaleString()}</p></div>
              <div><span className="text-sm text-muted-foreground">Tier</span><p className="font-medium">{viewMember.tier}</p></div>
              <div><span className="text-sm text-muted-foreground">Join Date</span><p className="font-medium">{viewMember.joinDate}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditingMember(null); } }}
        title={editingMember ? "Edit Member" : "Add New Member"}
        fields={MEMBER_FIELDS}
        initialData={editingMember ? { name: editingMember.name, account: editingMember.account, program: editingMember.program } : undefined}
        onSubmit={(data) => {
          if (editingMember) {
            setMembers((prev) => prev.map((m) => m.id === editingMember.id ? {
              ...m,
              name: data.name as string,
              account: (data.account as string) || m.account,
              program: (data.program as string) || m.program,
            } : m));
          } else {
            const newMember: LoyaltyMember = {
              id: `LM-${Date.now().toString(36)}`,
              name: data.name as string,
              account: (data.account as string) || "",
              program: (data.program as string) || INITIAL_PROGRAMS[0].name,
              points: 0,
              tier: "BRONZE",
              joinDate: new Date().toISOString().split("T")[0],
            };
            setMembers((prev) => [newMember, ...prev]);
          }
          setShowModal(false);
          setEditingMember(null);
        }}
      />
    </div>
  );
}
