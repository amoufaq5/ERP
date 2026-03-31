"use client";

import { useState } from "react";
import { Users, UserPlus, Link, UserX, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import type { Column } from "@/components/shared/data-table";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  account: string | null;
  owner: string;
  status: string;
  createdAt: string;
}

const INITIAL_CONTACTS: Contact[] = [
  {
    id: "CON-001",
    firstName: "Alexandra",
    lastName: "Chen",
    title: "VP of Engineering",
    email: "a.chen@techcorp.io",
    phone: "+1 (415) 555-0192",
    account: "TechCorp Solutions",
    owner: "Marcus Williams",
    status: "active",
    createdAt: "2024-06-15",
  },
  {
    id: "CON-002",
    firstName: "James",
    lastName: "Martinez",
    title: "Chief Procurement Officer",
    email: "j.martinez@globalretail.com",
    phone: "+1 (212) 555-0148",
    account: "Global Retail Inc.",
    owner: "Sarah Johnson",
    status: "active",
    createdAt: "2024-03-22",
  },
  {
    id: "CON-003",
    firstName: "Priya",
    lastName: "Patel",
    title: "CTO",
    email: "priya.patel@nexusfinance.com",
    phone: "+1 (312) 555-0271",
    account: "Nexus Finance",
    owner: "Marcus Williams",
    status: "active",
    createdAt: "2023-11-10",
  },
  {
    id: "CON-004",
    firstName: "David",
    lastName: "Thompson",
    title: "IT Director",
    email: "d.thompson@healthplus.org",
    phone: "+1 (617) 555-0334",
    account: "HealthPlus Systems",
    owner: "Emma Davis",
    status: "active",
    createdAt: "2026-01-08",
  },
  {
    id: "CON-005",
    firstName: "Sofia",
    lastName: "Nguyen",
    title: "Head of Operations",
    email: "sofia.n@cloudbuild.tech",
    phone: "+1 (206) 555-0417",
    account: "CloudBuild Technologies",
    owner: "Sarah Johnson",
    status: "active",
    createdAt: "2026-02-14",
  },
  {
    id: "CON-006",
    firstName: "Robert",
    lastName: "Kim",
    title: "Plant Manager",
    email: "r.kim@manufactura.com",
    phone: "+1 (313) 555-0509",
    account: "Manufactura Group",
    owner: "Emma Davis",
    status: "active",
    createdAt: "2024-09-03",
  },
  {
    id: "CON-007",
    firstName: "Isabella",
    lastName: "Santos",
    title: "Logistics Coordinator",
    email: "i.santos@logisticspro.net",
    phone: "+1 (713) 555-0623",
    account: "LogisticsPro",
    owner: "Marcus Williams",
    status: "active",
    createdAt: "2025-04-17",
  },
  {
    id: "CON-008",
    firstName: "Michael",
    lastName: "O'Brien",
    title: "CEO",
    email: "m.obrien@quantumdata.ai",
    phone: "+1 (650) 555-0781",
    account: "Quantum Data AI",
    owner: "Sarah Johnson",
    status: "active",
    createdAt: "2025-08-29",
  },
  {
    id: "CON-009",
    firstName: "Natalie",
    lastName: "Foster",
    title: "Sales Director",
    email: "n.foster@independentco.com",
    phone: "+1 (404) 555-0855",
    account: null,
    owner: "Emma Davis",
    status: "pending",
    createdAt: "2026-03-10",
  },
  {
    id: "CON-010",
    firstName: "Carlos",
    lastName: "Reyes",
    title: "Business Development Manager",
    email: "c.reyes@freeagent.biz",
    phone: "+1 (305) 555-0933",
    account: null,
    owner: "Marcus Williams",
    status: "pending",
    createdAt: "2026-03-20",
  },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    account: "",
    owner: "",
  });

  const filtered = contacts.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.account || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalContacts = contacts.length;
  const newThisMonth = contacts.filter(
    (c) => c.createdAt >= "2026-03-01"
  ).length;
  const withAccount = contacts.filter((c) => c.account !== null).length;
  const withoutAccount = contacts.filter((c) => c.account === null).length;

  function handleAdd() {
    if (!form.firstName || !form.email) return;
    const newContact: Contact = {
      id: `CON-${String(contacts.length + 1).padStart(3, "0")}`,
      firstName: form.firstName,
      lastName: form.lastName,
      title: form.title,
      email: form.email,
      phone: form.phone,
      account: form.account || null,
      owner: form.owner || "Unassigned",
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setContacts((prev) => [newContact, ...prev]);
    setForm({
      firstName: "",
      lastName: "",
      title: "",
      email: "",
      phone: "",
      account: "",
      owner: "",
    });
    setOpen(false);
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "firstName",
      label: "Name",
      render: (_v, row) => (
        <div className="font-medium">
          {row.firstName as string} {row.lastName as string}
        </div>
      ),
    },
    { key: "title", label: "Title" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    {
      key: "account",
      label: "Account",
      render: (v) =>
        v ? (
          <span>{v as string}</span>
        ) : (
          <span className="text-muted-foreground italic text-xs">No account</span>
        ),
    },
    { key: "owner", label: "Owner" },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
    { key: "createdAt", label: "Created" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Contacts"
        description="Manage your business contacts and relationships"
      >
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Contact
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Contacts"
          value={totalContacts}
          subtitle="All contacts in system"
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 7, label: "vs last month" }}
        />
        <StatsCard
          title="New This Month"
          value={newThisMonth}
          subtitle="Added in March 2026"
          icon={<UserPlus className="w-5 h-5" />}
        />
        <StatsCard
          title="With Account"
          value={withAccount}
          subtitle="Linked to an account"
          icon={<Link className="w-5 h-5" />}
        />
        <StatsCard
          title="Without Account"
          value={withoutAccount}
          subtitle="Not yet linked"
          icon={<UserX className="w-5 h-5" />}
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No contacts found."
        />
      </div>

      {/* Add New Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input
                placeholder="e.g. VP of Sales"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="email@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Input
                placeholder="Company name (optional)"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input
                placeholder="Assigned rep"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
