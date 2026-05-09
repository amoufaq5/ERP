"use client";

import { useState, useMemo } from "react";
import { Megaphone, DollarSign, TrendingUp, Users, Plus, Gift, Star, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import type { Column } from "@/components/shared/data-table";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";
import { type CRMCampaign, type CampaignType, type CampaignStatus } from "@/lib/data-store";
import { useAuditLogger } from "@/lib/audit-logger";
import { useNotificationCenter } from "@/lib/notification-context";

type Campaign = CRMCampaign;

// ── Loyalty Types & Interfaces ──
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

// ── Campaign Constants ──
const STATUS_MAP: Record<CampaignStatus, string> = {
  DRAFT: "draft", ACTIVE: "active", PAUSED: "on hold", COMPLETED: "completed", CANCELLED: "cancelled",
};

const CAMPAIGN_FIELDS: EntityField[] = [
  { name: "name", label: "Campaign Name", type: "text", placeholder: "e.g. Summer Promo Email Blast", required: true, fullWidth: true },
  { name: "type", label: "Type", type: "select", defaultValue: "EMAIL", options: [
    { label: "Email", value: "EMAIL" }, { label: "Social Media", value: "SOCIAL_MEDIA" },
    { label: "PPC", value: "PPC" }, { label: "Content", value: "CONTENT" },
    { label: "Webinar", value: "WEBINAR" }, { label: "Trade Show", value: "TRADE_SHOW" },
    { label: "Direct Mail", value: "DIRECT_MAIL" },
  ]},
  { name: "budget", label: "Budget (EGP)", type: "number", placeholder: "0" },
  { name: "startDate", label: "Start Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "endDate", label: "End Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "owner", label: "Owner", type: "text", placeholder: "Campaign manager" },
];

const CAMPAIGN_FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Draft", value: "DRAFT" }, { label: "Active", value: "ACTIVE" },
    { label: "Paused", value: "PAUSED" }, { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
  ]},
  { key: "type", label: "Type", type: "select" as const, options: [
    { label: "Email", value: "EMAIL" }, { label: "Social Media", value: "SOCIAL_MEDIA" },
    { label: "PPC", value: "PPC" }, { label: "Content", value: "CONTENT" },
    { label: "Webinar", value: "WEBINAR" }, { label: "Trade Show", value: "TRADE_SHOW" },
  ]},
];

// ── Loyalty Constants ──
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

// ── Helper Components ──
function BudgetProgress({ budget, spent }: { budget: number; spent: number }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-orange-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">EGP {(spent / 1000).toFixed(1)}K / EGP {(budget / 1000).toFixed(1)}K</span>
    </div>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_STYLES[tier]}`}>{tier}</span>;
}

function TxnTypeBadge({ type }: { type: TransactionType }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TXN_STYLES[type]}`}>{type}</span>;
}

// ── Main Page Component ──
type HubTab = "campaigns" | "loyalty";

export default function CampaignsPage() {
  const { t } = useTranslation();
  const store = useApiDataStore();
  const { user } = useCurrentUser();
  const { logAction } = useAuditLogger();
  const { addNotification } = useNotificationCenter();

  // Role-based campaign scoping
  // ADMIN / NSM / BUM / MARKETEER: see all campaigns (org-wide)
  // DM / MEDICAL_REP: see all campaigns (campaigns are org-wide marketing assets)
  const campaigns = useMemo(() => {
    const all = store.crmCampaigns as Campaign[];
    // All roles see campaigns since they are org-wide; scoping is kept for future buId-based filtering
    if (user.role === "ADMIN" || user.role === "NSM" || user.role === "BUM" || user.role === "MARKETEER") return all;
    // DM / MEDICAL_REP: show all campaigns (org-wide assets, no buId on CRMCampaign)
    return all;
  }, [store.crmCampaigns, user.role]);
  const [activeHubTab, setActiveHubTab] = useState<HubTab>("campaigns");
  const [campaignFilters, setCampaignFilters] = useState<FilterState>({ _search: "", status: "", type: "" });
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);

  // ── Loyalty State ──
  const [programs, setPrograms] = useState<LoyaltyProgram[]>(INITIAL_PROGRAMS);
  const [members, setMembers] = useState<LoyaltyMember[]>(INITIAL_MEMBERS);
  const [loyaltySubTab, setLoyaltySubTab] = useState("programs");
  const [memberFilters, setMemberFilters] = useState<FilterState>({ _search: "", tier: "", program: "" });
  const [txnFilters, setTxnFilters] = useState<FilterState>({ _search: "" });
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<LoyaltyMember | null>(null);
  const [viewMember, setViewMember] = useState<LoyaltyMember | null>(null);

  // ── Campaign Computed Values ──
  const filteredCampaigns = campaigns.filter((c) => {
    const q = (campaignFilters._search || "").toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
    const matchesStatus = !campaignFilters.status || c.status === campaignFilters.status;
    const matchesType = !campaignFilters.type || c.type === campaignFilters.type;
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
  const statusFlow: Record<string, CampaignStatus> = { DRAFT: "ACTIVE", ACTIVE: "PAUSED", PAUSED: "ACTIVE" };

  // ── Loyalty Computed Values ──
  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const totalRedemptions = TRANSACTIONS.filter((t) => t.type === "REDEEM").length;

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

  function toggleProgram(id: string) {
    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  }

  // ── Campaign Columns ──
  const campaignColumns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Campaign Name" },
    { key: "type", label: "Type", render: (v) => <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">{(v as string).replace(/_/g, " ")}</span> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={STATUS_MAP[v as CampaignStatus]} /> },
    { key: "budget", label: "Budget vs Spent", render: (_v, row) => <BudgetProgress budget={row.budget as number} spent={row.spent as number} /> },
    { key: "leads", label: "Leads", render: (v) => <span className="font-medium">{v as number}</span> },
    { key: "conversions", label: "Conversions", render: (v) => <span className="font-medium">{v as number}</span> },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "owner", label: "Owner" },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const c = campaigns.find((x) => x.id === row.id);
        if (!c) return null;
        const next = statusFlow[c.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingCampaign(c); setShowCampaignModal(true); }}
            onDelete={() => store.remove("crmCampaigns", c.id)}
            onView={() => setDetailCampaign(c)}
            canView
            itemLabel={c.name}
            extraItems={[
              ...(next ? [{ label: `Set ${next}`, onClick: () => {
                store.update("crmCampaigns", c.id, { status: next });
                logAction({
                  userId: user.id,
                  userName: user.name,
                  userRole: user.role,
                  action: "UPDATE",
                  module: "CRM",
                  entity: "Campaign",
                  entityId: c.id,
                  entityName: c.name,
                  details: `Changed campaign ${c.name} status from ${c.status} to ${next}`,
                });
                if (next === "ACTIVE") {
                  addNotification({
                    type: "SUCCESS",
                    title: "Campaign Launched",
                    message: `Campaign "${c.name}" is now active`,
                    module: "CRM",
                    entityType: "Campaign",
                    entityId: c.id,
                    actionUrl: "/crm/campaigns",
                  });
                }
              } }] : []),
              ...(c.status === "ACTIVE" ? [{ label: "Complete", onClick: () => {
                store.update("crmCampaigns", c.id, { status: "COMPLETED" });
                logAction({
                  userId: user.id,
                  userName: user.name,
                  userRole: user.role,
                  action: "UPDATE",
                  module: "CRM",
                  entity: "Campaign",
                  entityId: c.id,
                  entityName: c.name,
                  details: `Completed campaign ${c.name}`,
                });
              } }] : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Marketing Hub" description={`Manage campaigns, loyalty programs, member points, and reward redemptions. Viewing as ${ROLE_LABEL[user.role]}.`}>
        {activeHubTab === "campaigns" && (
          <Button onClick={() => { setEditingCampaign(null); setShowCampaignModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Campaign
          </Button>
        )}
        {activeHubTab === "loyalty" && (
          <>
            <Button variant="outline" className="gap-2" onClick={() => { setMembers(prev => prev.map(m => ({ ...m, points: m.points + Math.floor(Math.random() * 500) }))); }}>
              <RefreshCw className="w-4 h-4" />Sync Points
            </Button>
            <Button className="gap-2" onClick={() => { setEditingMember(null); setShowMemberModal(true); }}>
              <Plus className="w-4 h-4" />Add Member
            </Button>
          </>
        )}
      </PageHeader>

      {/* ── Hub Tab Switcher ── */}
      <div className="flex gap-2">
        <Button
          variant={activeHubTab === "campaigns" ? "default" : "ghost"}
          onClick={() => setActiveHubTab("campaigns")}
          className="gap-2"
        >
          <Megaphone className="w-4 h-4" /> Campaigns
        </Button>
        <Button
          variant={activeHubTab === "loyalty" ? "default" : "ghost"}
          onClick={() => setActiveHubTab("loyalty")}
          className="gap-2"
        >
          <Gift className="w-4 h-4" /> Loyalty Programs
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── Campaigns Tab ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeHubTab === "campaigns" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Active Campaigns" value={activeCampaigns} subtitle="Currently running" icon={<Megaphone className="w-5 h-5" />} />
            <StatsCard title="Total Budget" value={`EGP ${(totalBudget / 1000).toFixed(0)}K`} subtitle="Across all campaigns" icon={<DollarSign className="w-5 h-5" />} />
            <StatsCard title="Total Spent" value={`EGP ${(totalSpent / 1000).toFixed(1)}K`} subtitle={`${Math.round((totalSpent / totalBudget) * 100)}% of budget`} icon={<TrendingUp className="w-5 h-5" />} />
            <StatsCard title="Total Leads Generated" value={totalLeads} subtitle="All campaigns combined" icon={<Users className="w-5 h-5" />} trend={{ value: 14, label: "vs last quarter" }} />
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="p-4 border-b border-border">
              <FilterBar
                searchValue={campaignFilters._search}
                onSearchChange={(v) => setCampaignFilters((f) => ({ ...f, _search: v }))}
                fields={CAMPAIGN_FILTER_FIELDS}
                values={campaignFilters}
                onChange={(k, v) => setCampaignFilters((f) => ({ ...f, [k]: v }))}
              />
            </div>
            <DataTable columns={campaignColumns} data={filteredCampaigns as unknown as Record<string, unknown>[]} exportable exportFilename="crm-campaigns.csv" emptyMessage="No campaigns found." />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── Loyalty Programs Tab ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeHubTab === "loyalty" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Active Programs" value={programs.filter((p) => p.active).length} subtitle="Currently running programs" icon={<Gift className="w-5 h-5" />} />
            <StatsCard title="Total Members" value={members.length} subtitle="Enrolled across all programs" icon={<Users className="w-5 h-5" />} />
            <StatsCard title="Points Issued" value={totalPoints.toLocaleString()} subtitle="Cumulative points balance" icon={<Star className="w-5 h-5" />} />
            <StatsCard title="Redemptions" value={totalRedemptions} subtitle="Rewards redeemed to date" icon={<RefreshCw className="w-5 h-5" />} />
          </div>

          {/* Loyalty Sub-Tabs */}
          <div className="flex gap-2">
            <Button variant={loyaltySubTab === "programs" ? "default" : "ghost"} onClick={() => setLoyaltySubTab("programs")} size="sm">Programs</Button>
            <Button variant={loyaltySubTab === "members" ? "default" : "ghost"} onClick={() => setLoyaltySubTab("members")} size="sm">Members</Button>
            <Button variant={loyaltySubTab === "transactions" ? "default" : "ghost"} onClick={() => setLoyaltySubTab("transactions")} size="sm">Transactions</Button>
          </div>

          {/* Programs Sub-Tab */}
          {loyaltySubTab === "programs" && (
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
          )}

          {/* Members Sub-Tab */}
          {loyaltySubTab === "members" && (
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
                  { key: "points", label: "Points", className: "text-right", render: (v) => <span className="font-semibold text-foreground">{((v as number) ?? 0).toLocaleString()}</span> },
                  { key: "tier", label: "Tier", render: (v) => <TierBadge tier={v as Tier} /> },
                  { key: "joinDate", label: "Join Date", render: (v) => <span className="text-muted-foreground">{v as string}</span> },
                  { key: "_actions", label: "", render: (_v, row) => {
                    const member = row as unknown as LoyaltyMember;
                    const next = tierFlow[member.tier];
                    return (
                      <EditDeleteMenu
                        onView={() => setViewMember(member)}
                        onEdit={() => { setEditingMember(member); setShowMemberModal(true); }}
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
          )}

          {/* Transactions Sub-Tab */}
          {loyaltySubTab === "transactions" && (
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
                    const pts = (v as number) ?? 0;
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
          )}
        </>
      )}

      {/* ── Campaign Form Modal ── */}
      <EntityFormModal
        open={showCampaignModal}
        onOpenChange={(open) => { setShowCampaignModal(open); if (!open) setEditingCampaign(null); }}
        title={editingCampaign ? "Edit Campaign" : "Add New Campaign"}
        fields={CAMPAIGN_FIELDS}
        initialData={editingCampaign ? { name: editingCampaign.name, type: editingCampaign.type, budget: editingCampaign.budget, startDate: editingCampaign.startDate, endDate: editingCampaign.endDate, owner: editingCampaign.owner } : undefined}
        onSubmit={(data) => {
          // Validate required fields
          const campaignName = (data.name as string || "").trim();
          if (!campaignName) {
            alert("Campaign Name is required.");
            return;
          }

          if (editingCampaign) {
            store.update("crmCampaigns", editingCampaign.id, {
              name: campaignName,
              type: (data.type as CampaignType) || editingCampaign.type,
              budget: (data.budget as number) || editingCampaign.budget,
              startDate: (data.startDate as string) || editingCampaign.startDate,
              endDate: (data.endDate as string) || editingCampaign.endDate,
              owner: (data.owner as string) || editingCampaign.owner,
            });
            logAction({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: "UPDATE",
              module: "CRM",
              entity: "Campaign",
              entityId: editingCampaign.id,
              entityName: editingCampaign.name,
              details: `Updated campaign ${editingCampaign.name}`,
            });
          } else {
            const newId = store.genId("camp");
            store.add("crmCampaigns", {
              id: newId,
              name: campaignName,
              type: (data.type as CampaignType) || "EMAIL",
              status: "DRAFT",
              budget: (data.budget as number) || 0,
              spent: 0,
              leads: 0,
              conversions: 0,
              startDate: (data.startDate as string) || new Date().toISOString().split("T")[0],
              endDate: (data.endDate as string) || "",
              owner: (data.owner as string) || "Unassigned",
            });
            logAction({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: "CREATE",
              module: "CRM",
              entity: "Campaign",
              entityId: newId,
              entityName: campaignName,
              details: `Created campaign ${campaignName}`,
            });
            addNotification({
              type: "INFO",
              title: "New Campaign Created",
              message: `Campaign "${campaignName}" has been created as draft`,
              module: "CRM",
              entityType: "Campaign",
              entityId: newId,
              actionUrl: "/crm/campaigns",
            });
          }
          setShowCampaignModal(false);
          setEditingCampaign(null);
        }}
      />

      {/* ── Campaign Detail Dialog ── */}
      <Dialog open={!!detailCampaign} onOpenChange={(open) => { if (!open) setDetailCampaign(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailCampaign?.name}</DialogTitle>
          </DialogHeader>
          {detailCampaign && (() => {
            const budgetPct = detailCampaign.budget > 0 ? Math.min(100, Math.round((detailCampaign.spent / detailCampaign.budget) * 100)) : 0;
            const budgetColor = budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-orange-500" : "bg-blue-500";
            const convRate = detailCampaign.leads > 0 ? ((detailCampaign.conversions / detailCampaign.leads) * 100).toFixed(1) : "0";
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Campaign Name</span><p className="font-medium">{detailCampaign.name}</p></div>
                  <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{detailCampaign.type.replace(/_/g, " ")}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={STATUS_MAP[detailCampaign.status]} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Owner</span><p className="font-medium">{detailCampaign.owner}</p></div>
                  <div><span className="text-sm text-muted-foreground">Budget</span><p className="font-medium">EGP {(detailCampaign.budget ?? 0).toLocaleString()}</p></div>
                  <div><span className="text-sm text-muted-foreground">Spent</span><p className="font-medium">EGP {(detailCampaign.spent ?? 0).toLocaleString()}</p></div>
                  <div><span className="text-sm text-muted-foreground">Leads Generated</span><p className="font-medium">{detailCampaign.leads}</p></div>
                  <div><span className="text-sm text-muted-foreground">Conversions</span><p className="font-medium">{detailCampaign.conversions}</p></div>
                  <div><span className="text-sm text-muted-foreground">Conversion Rate</span><p className="font-medium">{convRate}%</p></div>
                  <div><span className="text-sm text-muted-foreground">Start Date</span><p className="font-medium">{detailCampaign.startDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">End Date</span><p className="font-medium">{detailCampaign.endDate}</p></div>
                </div>
                {/* Budget Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Budget Utilization</span>
                    <span className="font-medium">{budgetPct}% &mdash; EGP {(detailCampaign.spent ?? 0).toLocaleString()} / EGP {(detailCampaign.budget ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${budgetColor}`} style={{ width: `${budgetPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Member Detail Dialog ── */}
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
              <div><span className="text-sm text-muted-foreground">Points</span><p className="font-medium">{(viewMember.points ?? 0).toLocaleString()}</p></div>
              <div><span className="text-sm text-muted-foreground">Tier</span><p className="font-medium">{viewMember.tier}</p></div>
              <div><span className="text-sm text-muted-foreground">Join Date</span><p className="font-medium">{viewMember.joinDate}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Member Form Modal ── */}
      <EntityFormModal
        open={showMemberModal}
        onOpenChange={(open) => { setShowMemberModal(open); if (!open) setEditingMember(null); }}
        title={editingMember ? "Edit Member" : "Add New Member"}
        fields={MEMBER_FIELDS}
        initialData={editingMember ? { name: editingMember.name, account: editingMember.account, program: editingMember.program } : undefined}
        onSubmit={(data) => {
          // Validate required fields
          const memberName = (data.name as string || "").trim();
          const memberAccount = (data.account as string || "").trim();
          if (!memberName || !memberAccount) {
            alert("Member Name and Account are required.");
            return;
          }

          if (editingMember) {
            setMembers((prev) => prev.map((m) => m.id === editingMember.id ? {
              ...m,
              name: memberName,
              account: memberAccount,
              program: (data.program as string) || m.program,
            } : m));
          } else {
            const newMember: LoyaltyMember = {
              id: `LM-${Date.now().toString(36)}`,
              name: memberName,
              account: memberAccount,
              program: (data.program as string) || INITIAL_PROGRAMS[0].name,
              points: 0,
              tier: "BRONZE",
              joinDate: new Date().toISOString().split("T")[0],
            };
            setMembers((prev) => [newMember, ...prev]);
          }
          setShowMemberModal(false);
          setEditingMember(null);
        }}
      />
    </div>
  );
}
