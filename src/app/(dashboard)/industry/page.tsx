"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FlaskConical,
  FileText,
  Microscope,
  Thermometer,
  ClipboardList,
  Pill,
  AlertTriangle,
  Beaker,
  Truck,
  MapPin,
  Warehouse,
  Package,
  Navigation,
  Container,
  Users,
  RotateCcw,
  Flame,
  GitBranch,
  Factory,
  ShieldCheck,
  DollarSign,
  BarChart3,
  TrendingUp,
  Layers,
  Hammer,
  Cog,
  Leaf,
  CalendarCheck,
  Weight,
  Briefcase,
  Megaphone,
  ImageIcon,
  Tv,
  Receipt,
  Share2,
  PieChart,
  UserCheck,
  HardHat,
  FileEdit,
  Wrench,
  Building2,
  Home,
  Key,
  CreditCard,
  ListChecks,
  BarChart2,
  Compass,
  Search,
  Download,
  Activity,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stat {
  label: string;
  value: string | number;
}

interface Module {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface Industry {
  id: string;
  label: string;
  stats: Stat[];
  modules: Module[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const industriesData: Industry[] = [
  {
    id: "pharmaceutical",
    label: "Pharmaceutical",
    stats: [
      { label: "Active Batches", value: 24 },
      { label: "Compliance Score", value: "98.5%" },
      { label: "Expiring Products", value: 12 },
      { label: "Clinical Trials", value: 3 },
    ],
    modules: [
      {
        id: "pharma-batch",
        name: "Batch Tracking & Lot Management",
        description:
          "Track production batches, lot numbers, expiry dates, and batch recalls. FDA/GMP compliant.",
        icon: <FlaskConical className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pharma-regulatory",
        name: "Drug Regulatory Compliance",
        description:
          "Manage FDA submissions, ANDA/NDA filings, GMP certifications, and audit trails.",
        icon: <FileText className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pharma-qc",
        name: "Quality Control (QC/QA)",
        description:
          "Lab test management, stability studies, deviation tracking, CAPA management.",
        icon: <Microscope className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pharma-coldchain",
        name: "Cold Chain Management",
        description:
          "Temperature monitoring, storage conditions, cold chain logistics with alerts.",
        icon: <Thermometer className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "pharma-clinical",
        name: "Clinical Trial Management",
        description:
          "Trial phases, patient enrollment, adverse events, regulatory submissions.",
        icon: <ClipboardList className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pharma-distribution",
        name: "Pharmacy Distribution",
        description:
          "Wholesaler management, drug scheduling (Schedule II-V), DEA compliance.",
        icon: <Pill className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "pharma-expiry",
        name: "Expiry & Recall Management",
        description:
          "Automated expiry alerts, recall workflows, affected batch tracing.",
        icon: <AlertTriangle className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pharma-rd",
        name: "R&D Pipeline",
        description:
          "Drug discovery pipeline, compound tracking, patent management.",
        icon: <Beaker className="h-5 w-5" />,
        enabled: false,
      },
    ],
  },
  {
    id: "logistics",
    label: "Logistics",
    stats: [
      { label: "Active Shipments", value: 342 },
      { label: "Fleet Vehicles", value: 45 },
      { label: "On-Time Delivery", value: "96.2%" },
      { label: "Warehouses", value: 8 },
    ],
    modules: [
      {
        id: "log-fleet",
        name: "Fleet Management",
        description:
          "Vehicle tracking, maintenance schedules, fuel management, driver assignments.",
        icon: <Truck className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "log-route",
        name: "Route Optimization",
        description:
          "AI-powered route planning, real-time traffic, delivery ETAs.",
        icon: <MapPin className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "log-wms",
        name: "Warehouse Management (WMS)",
        description:
          "Bin locations, pick/pack/ship, barcode scanning, cross-docking.",
        icon: <Warehouse className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "log-freight",
        name: "Freight & Shipping",
        description:
          "Multi-carrier rate comparison, BOL generation, customs documentation.",
        icon: <Package className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "log-lastmile",
        name: "Last-Mile Delivery",
        description:
          "Proof of delivery, customer notifications, delivery scheduling.",
        icon: <Navigation className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "log-container",
        name: "Container & Cargo Tracking",
        description:
          "Container monitoring, port management, intermodal tracking.",
        icon: <Container className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "log-3pl",
        name: "3PL Management",
        description:
          "Third-party logistics provider management, SLA tracking.",
        icon: <Users className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "log-returns",
        name: "Returns & Reverse Logistics",
        description: "RMA processing, return routing, refurbishment tracking.",
        icon: <RotateCcw className="h-5 w-5" />,
        enabled: false,
      },
    ],
  },
  {
    id: "petroleum",
    label: "Petroleum & Energy",
    stats: [
      { label: "Active Wells", value: 18 },
      { label: "Daily Production", value: "45,000 bbl" },
      { label: "Pipeline Length", value: "2,400 km" },
      { label: "HSE Incidents", value: 0 },
    ],
    modules: [
      {
        id: "pet-upstream",
        name: "Upstream Operations",
        description:
          "Well management, drilling operations, reservoir monitoring.",
        icon: <Flame className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pet-pipeline",
        name: "Midstream/Pipeline Management",
        description:
          "Pipeline monitoring, flow rates, pressure tracking, leak detection.",
        icon: <GitBranch className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pet-refinery",
        name: "Downstream/Refinery",
        description:
          "Refinery operations, yield optimization, product blending.",
        icon: <Factory className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pet-hse",
        name: "HSE Management",
        description:
          "Health, Safety & Environment compliance, incident reporting, safety permits.",
        icon: <ShieldCheck className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pet-jv",
        name: "Joint Venture Accounting",
        description:
          "Revenue sharing, partner billing, working interest calculations.",
        icon: <DollarSign className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "pet-production",
        name: "Production Reporting",
        description:
          "Daily production reports, allocation, government royalty calculations.",
        icon: <BarChart3 className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "pet-tankfarm",
        name: "Tank Farm Management",
        description:
          "Tank gauging, inventory reconciliation, custody transfer.",
        icon: <Container className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "pet-trading",
        name: "Energy Trading",
        description:
          "Commodity trading, price hedging, contract management.",
        icon: <TrendingUp className="h-5 w-5" />,
        enabled: false,
      },
    ],
  },
  {
    id: "steel",
    label: "Steel & Manufacturing",
    stats: [
      { label: "Production Orders", value: 56 },
      { label: "Yield Rate", value: "94.8%" },
      { label: "Equipment Uptime", value: "97.2%" },
      { label: "Quality Score", value: "99.1%" },
    ],
    modules: [
      {
        id: "steel-heat",
        name: "Heat & Melt Tracking",
        description:
          "Heat numbers, melt composition, metallurgical analysis.",
        icon: <Flame className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "steel-rolling",
        name: "Rolling Mill Management",
        description: "Mill scheduling, pass design, thickness control.",
        icon: <Layers className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "steel-quality",
        name: "Quality Metallurgy",
        description:
          "Chemical analysis, mechanical testing, certification generation.",
        icon: <Microscope className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "steel-tpm",
        name: "Equipment Maintenance (TPM)",
        description:
          "Total Productive Maintenance, MTBF/MTTR tracking, PM scheduling.",
        icon: <Cog className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "steel-costing",
        name: "Costing & Yield Analysis",
        description:
          "Raw material costing, conversion costs, yield optimization.",
        icon: <DollarSign className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "steel-env",
        name: "Environmental Compliance",
        description:
          "Emissions monitoring, waste management, EPA reporting.",
        icon: <Leaf className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "steel-supply",
        name: "Supply Chain Planning",
        description:
          "Demand forecasting, capacity planning, raw material procurement.",
        icon: <CalendarCheck className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "steel-dispatch",
        name: "Dispatch & Weighbridge",
        description: "Truck weighing, dispatch scheduling, e-way bills.",
        icon: <Weight className="h-5 w-5" />,
        enabled: false,
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing Agencies",
    stats: [
      { label: "Active Clients", value: 32 },
      { label: "Running Campaigns", value: 18 },
      { label: "Team Utilization", value: "78%" },
      { label: "Monthly Revenue", value: "$485K" },
    ],
    modules: [
      {
        id: "mkt-client",
        name: "Client Management",
        description:
          "Client portfolios, retainer tracking, scope of work management.",
        icon: <Briefcase className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "mkt-campaign",
        name: "Campaign Planning & Execution",
        description:
          "Multi-channel campaign planning, creative briefs, approvals workflow.",
        icon: <Megaphone className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "mkt-dam",
        name: "Creative Asset Management (DAM)",
        description:
          "Digital asset library, version control, brand guidelines.",
        icon: <ImageIcon className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "mkt-media",
        name: "Media Buying & Planning",
        description:
          "Media plans, rate cards, insertion orders, programmatic management.",
        icon: <Tv className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "mkt-billing",
        name: "Project Billing & Retainers",
        description:
          "Time-based billing, retainer management, scope creep tracking.",
        icon: <Receipt className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "mkt-social",
        name: "Social Media Management",
        description:
          "Content calendars, post scheduling, engagement analytics.",
        icon: <Share2 className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "mkt-reporting",
        name: "Client Reporting & Analytics",
        description:
          "Automated client reports, KPI dashboards, ROI analysis.",
        icon: <PieChart className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "mkt-freelancer",
        name: "Freelancer & Vendor Management",
        description:
          "Freelancer database, rate negotiations, deliverable tracking.",
        icon: <UserCheck className="h-5 w-5" />,
        enabled: false,
      },
    ],
  },
  {
    id: "construction",
    label: "Construction",
    stats: [
      { label: "Active Projects", value: 8 },
      { label: "Total Contract Value", value: "$124M" },
      { label: "Completion Rate", value: "67%" },
      { label: "Safety Score", value: "96%" },
    ],
    modules: [
      {
        id: "con-estimation",
        name: "Project Estimation & Bidding",
        description: "BOQ preparation, cost estimation, bid management.",
        icon: <BarChart2 className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "con-contract",
        name: "Contract Management",
        description:
          "Contract types (lump sum, cost-plus, T&M), change orders, claims.",
        icon: <FileEdit className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "con-resource",
        name: "Resource & Equipment Scheduling",
        description:
          "Crew scheduling, equipment allocation, rental management.",
        icon: <CalendarCheck className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "con-billing",
        name: "Progress Billing (AIA)",
        description:
          "AIA G702/G703 billing, retention tracking, certified payroll.",
        icon: <Receipt className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "con-safety",
        name: "Safety & Compliance (OSHA)",
        description:
          "Safety inspections, toolbox talks, incident reporting, OSHA logs.",
        icon: <HardHat className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "con-subcontractor",
        name: "Subcontractor Management",
        description:
          "Subcontractor prequalification, lien waivers, payment applications.",
        icon: <Users className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "con-docs",
        name: "Document Control",
        description:
          "Drawing management, RFIs, submittals, transmittals, plan revisions.",
        icon: <FileText className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "con-bim",
        name: "BIM Integration",
        description:
          "Building Information Modeling data integration, clash detection.",
        icon: <Layers className="h-5 w-5" />,
        enabled: false,
      },
    ],
  },
  {
    id: "realestate",
    label: "Real Estate",
    stats: [
      { label: "Properties", value: 145 },
      { label: "Occupancy Rate", value: "92.3%" },
      { label: "Monthly Revenue", value: "$2.1M" },
      { label: "Active Listings", value: 23 },
    ],
    modules: [
      {
        id: "re-property",
        name: "Property Management",
        description:
          "Units, leases, maintenance requests, inspections.",
        icon: <Building2 className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "re-lease",
        name: "Lease Management",
        description:
          "Lease terms, renewals, escalations, CAM charges.",
        icon: <FileText className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "re-tenant",
        name: "Tenant Portal",
        description:
          "Online rent payment, maintenance requests, communications.",
        icon: <Home className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "re-accounting",
        name: "Property Accounting",
        description:
          "Revenue recognition, operating expenses, NOI calculations.",
        icon: <DollarSign className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "re-listing",
        name: "Listing & Marketing",
        description:
          "MLS integration, virtual tours, showing scheduling.",
        icon: <Key className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "re-development",
        name: "Construction & Development",
        description:
          "Development pipeline, proforma analysis, draw management.",
        icon: <Hammer className="h-5 w-5" />,
        enabled: false,
      },
      {
        id: "re-investment",
        name: "Investment Analysis",
        description:
          "Cap rates, IRR, cash-on-cash, DCF modeling.",
        icon: <TrendingUp className="h-5 w-5" />,
        enabled: true,
      },
      {
        id: "re-compliance",
        name: "Compliance & Inspections",
        description:
          "Building codes, fire safety, accessibility compliance.",
        icon: <ListChecks className="h-5 w-5" />,
        enabled: false,
      },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value }: Stat) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="p-4">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

interface ModuleCardProps {
  module: Module;
  onToggle: (id: string) => void;
  onConfigure: (name: string) => void;
}

function ModuleCard({ module, onToggle, onConfigure }: ModuleCardProps) {
  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-primary">{module.icon}</div>
            <CardTitle className="text-sm font-semibold leading-tight">
              {module.name}
            </CardTitle>
          </div>
          <Switch
            checked={module.enabled}
            onCheckedChange={() => onToggle(module.id)}
            aria-label={`Toggle ${module.name}`}
            className="shrink-0 mt-0.5"
          />
        </div>
      </CardHeader>
      <CardContent className="pb-4 flex flex-col gap-3 flex-1">
        <CardDescription className="text-xs leading-relaxed">
          {module.description}
        </CardDescription>
        <div className="flex items-center justify-between mt-auto pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 px-3"
            onClick={() => onConfigure(module.name)}
          >
            <Cog className="h-3 w-3 mr-1" />
            Configure
          </Button>
          <Badge
            variant={module.enabled ? "success" : "secondary"}
            className="text-xs"
          >
            {module.enabled ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndustryPage() {
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>(
    industriesData[0].id
  );
  const [industries, setIndustries] = useState<Industry[]>(industriesData);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const selectedIndustry = industries.find((i) => i.id === selectedIndustryId)!;

  const filteredModules = selectedIndustry.modules.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleToggle(moduleId: string) {
    setIndustries((prev) =>
      prev.map((industry) => {
        if (industry.id !== selectedIndustryId) return industry;
        return {
          ...industry,
          modules: industry.modules.map((mod) =>
            mod.id === moduleId ? { ...mod, enabled: !mod.enabled } : mod
          ),
        };
      })
    );
  }

  function handleConfigure(moduleName: string) {
    alert(`Configuration panel for "${moduleName}" — coming soon!`);
  }

  function handleDownloadTemplate() {
    alert(
      `Downloading industry template for "${selectedIndustry.label}" — coming soon!`
    );
  }

  const activeCount = selectedIndustry.modules.filter((m) => m.enabled).length;
  const totalCount = selectedIndustry.modules.length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            Industry Solutions
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Specialized modules and workflows tailored for your industry
        </p>
      </div>

      {/* ── Industry Selector ── */}
      <div className="flex flex-wrap gap-2">
        {industries.map((industry) => (
          <Button
            key={industry.id}
            variant={selectedIndustryId === industry.id ? "default" : "outline"}
            size="sm"
            className="text-sm"
            onClick={() => {
              setSelectedIndustryId(industry.id);
              setSearchQuery("");
            }}
          >
            {industry.label}
          </Button>
        ))}
      </div>

      {/* ── Stats Row ── */}
      <div className="flex flex-wrap gap-3">
        {selectedIndustry.stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-56 text-sm"
            />
          </div>
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            <Activity className="h-3 w-3 mr-1" />
            {activeCount} / {totalCount} active
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-sm gap-1.5 whitespace-nowrap"
          onClick={handleDownloadTemplate}
        >
          <Download className="h-4 w-4" />
          Download Industry Template
        </Button>
      </div>

      {/* ── Modules Grid ── */}
      {filteredModules.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModules.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              onToggle={handleToggle}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Search className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            No modules found matching{" "}
            <span className="font-medium text-foreground">
              &ldquo;{searchQuery}&rdquo;
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs mt-1"
            onClick={() => setSearchQuery("")}
          >
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}
