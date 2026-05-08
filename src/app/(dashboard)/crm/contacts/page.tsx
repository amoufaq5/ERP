"use client";

import { useState } from "react";
import { Users, Plus, Mail, Phone, Building2, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { downloadCSV } from "@/lib/download";

// ─── Contact type ─────────────────────────────────────────────────────────────

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

// ─── Seed data ────────────────────────────────────────────────────────────────

const INITIAL_CONTACTS: Contact[] = [
  { id: "CON-001", firstName: "Alexandra", lastName: "Chen", title: "VP of Engineering", email: "a.chen@techcorp.io", phone: "+1 (415) 555-0192", account: "TechCorp Solutions", owner: "Marcus Williams", status: "active", createdAt: "2024-06-15" },
  { id: "CON-002", firstName: "James", lastName: "Martinez", title: "Chief Procurement Officer", email: "j.martinez@globalretail.com", phone: "+1 (212) 555-0148", account: "Global Retail Inc.", owner: "Sarah Johnson", status: "active", createdAt: "2024-03-22" },
  { id: "CON-003", firstName: "Priya", lastName: "Patel", title: "CTO", email: "priya.patel@nexusfinance.com", phone: "+1 (312) 555-0271", account: "Nexus Finance", owner: "Marcus Williams", status: "active", createdAt: "2023-11-10" },
  { id: "CON-004", firstName: "David", lastName: "Thompson", title: "IT Director", email: "d.thompson@healthplus.org", phone: "+1 (617) 555-0334", account: "HealthPlus Systems", owner: "Emma Davis", status: "active", createdAt: "2026-01-08" },
  { id: "CON-005", firstName: "Sofia", lastName: "Nguyen", title: "Head of Operations", email: "sofia.n@cloudbuild.tech", phone: "+1 (206) 555-0417", account: "CloudBuild Technologies", owner: "Sarah Johnson", status: "active", createdAt: "2026-02-14" },
  { id: "CON-006", firstName: "Robert", lastName: "Kim", title: "Plant Manager", email: "r.kim@manufactura.com", phone: "+1 (313) 555-0509", account: "Manufactura Group", owner: "Emma Davis", status: "active", createdAt: "2024-09-03" },
  { id: "CON-007", firstName: "Isabella", lastName: "Santos", title: "Logistics Coordinator", email: "i.santos@logisticspro.net", phone: "+1 (713) 555-0623", account: "LogisticsPro", owner: "Marcus Williams", status: "active", createdAt: "2025-04-17" },
  { id: "CON-008", firstName: "Michael", lastName: "O'Brien", title: "CEO", email: "m.obrien@quantumdata.ai", phone: "+1 (650) 555-0781", account: "Quantum Data AI", owner: "Sarah Johnson", status: "active", createdAt: "2025-08-29" },
  { id: "CON-009", firstName: "Natalie", lastName: "Foster", title: "Sales Director", email: "n.foster@independentco.com", phone: "+1 (404) 555-0855", account: null, owner: "Emma Davis", status: "pending", createdAt: "2026-03-10" },
  { id: "CON-010", firstName: "Carlos", lastName: "Reyes", title: "Business Development Manager", email: "c.reyes@freeagent.biz", phone: "+1 (305) 555-0933", account: null, owner: "Marcus Williams", status: "pending", createdAt: "2026-03-20" },
];

// ─── Account options for form select ──────────────────────────────────────────

const ACCOUNT_OPTIONS = [
  { label: "None", value: "" },
  { label: "TechCorp Solutions", value: "TechCorp Solutions" },
  { label: "Global Retail Inc.", value: "Global Retail Inc." },
  { label: "Nexus Finance", value: "Nexus Finance" },
  { label: "HealthPlus Systems", value: "HealthPlus Systems" },
  { label: "CloudBuild Technologies", value: "CloudBuild Technologies" },
  { label: "Manufactura Group", value: "Manufactura Group" },
  { label: "LogisticsPro", value: "LogisticsPro" },
  { label: "Quantum Data AI", value: "Quantum Data AI" },
];

// ─── Form fields ──────────────────────────────────────────────────────────────

const CONTACT_FIELDS: EntityField[] = [
  { name: "firstName", label: "First Name", type: "text", placeholder: "First name", required: true },
  { name: "lastName", label: "Last Name", type: "text", placeholder: "Last name" },
  { name: "title", label: "Job Title", type: "text", placeholder: "e.g. VP of Sales", fullWidth: true },
  { name: "email", label: "Email", type: "email", placeholder: "email@company.com", required: true },
  { name: "phone", label: "Phone", type: "text", placeholder: "+1 (555) 000-0000" },
  { name: "account", label: "Account", type: "select", options: ACCOUNT_OPTIONS },
  { name: "owner", label: "Owner", type: "text", placeholder: "Assigned rep" },
  { name: "status", label: "Status", type: "select", defaultValue: "active", options: [
    { label: "Active", value: "active" },
    { label: "Pending", value: "pending" },
  ]},
];

// ─── Filter configuration ─────────────────────────────────────────────────────

const FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Active", value: "active" },
    { label: "Pending", value: "pending" },
  ]},
  { key: "account", label: "Account", type: "select" as const, options: ACCOUNT_OPTIONS.filter((o) => o.value !== "") },
];

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", account: "" });
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);

  // ── Filtered data ──
  const filteredContacts = contacts.filter((c) => {
    const q = (filters._search || "").toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch = !q || fullName.includes(q) || c.email.toLowerCase().includes(q);
    const matchesStatus = !filters.status || c.status === filters.status;
    const matchesAccount = !filters.account || c.account === filters.account;
    return matchesSearch && matchesStatus && matchesAccount;
  });

  // ── Stats ──
  const totalContacts = contacts.length;
  const activeContacts = contacts.filter((c) => c.status === "active").length;
  const pendingContacts = contacts.filter((c) => c.status === "pending").length;
  const linkedToAccount = contacts.filter((c) => c.account !== null).length;

  // ── CRUD handlers ──
  const handleSubmit = (data: EntityFormData) => {
    if (editingContact) {
      setContacts((prev) => prev.map((c) => c.id === editingContact.id ? {
        ...c,
        firstName: data.firstName as string,
        lastName: (data.lastName as string) || c.lastName,
        title: (data.title as string) || c.title,
        email: data.email as string,
        phone: (data.phone as string) || c.phone,
        account: (data.account as string) || null,
        owner: (data.owner as string) || c.owner,
        status: (data.status as string) || c.status,
      } : c));
    } else {
      const newContact: Contact = {
        id: `CON-${Date.now().toString(36)}`,
        firstName: data.firstName as string,
        lastName: (data.lastName as string) || "",
        title: (data.title as string) || "",
        email: data.email as string,
        phone: (data.phone as string) || "",
        account: (data.account as string) || null,
        owner: (data.owner as string) || "Unassigned",
        status: (data.status as string) || "active",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setContacts((prev) => [newContact, ...prev]);
    }
    setShowFormModal(false);
    setEditingContact(null);
  };

  const handleDelete = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleExport = () => {
    downloadCSV("contacts.csv", filteredContacts as unknown as Record<string, unknown>[], [
      { key: "id", label: "ID" },
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "title", label: "Title" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "account", label: "Account" },
      { key: "owner", label: "Owner" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Created" },
    ]);
  };

  // ── Table columns ──
  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "firstName",
      label: "Name",
      render: (_v, row) => (
        <button
          className="text-left font-medium text-primary hover:underline"
          onClick={() => setDetailContact(contacts.find((c) => c.id === row.id) || null)}
        >
          {row.firstName as string} {row.lastName as string}
        </button>
      ),
    },
    { key: "title", label: "Title" },
    {
      key: "email",
      label: "Email",
      render: (v) => (
        <span className="flex items-center gap-1.5 text-sm">
          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
          {v as string}
        </span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (v) => (
        <span className="flex items-center gap-1.5 text-sm">
          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
          {v as string}
        </span>
      ),
    },
    {
      key: "account",
      label: "Account",
      render: (v) => v
        ? <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-muted-foreground" />{v as string}</span>
        : <span className="text-muted-foreground italic text-xs">No account</span>,
    },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "id",
      label: "",
      render: (_v, row) => {
        const c = contacts.find((x) => x.id === row.id);
        if (!c) return null;
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingContact(c); setShowFormModal(true); }}
            onDelete={() => handleDelete(c.id)}
            onView={() => setDetailContact(c)}
            canView
            itemLabel={`${c.firstName} ${c.lastName}`}
            extraItems={c.status === "pending" ? [{
              label: "Set Active",
              onClick: () => setContacts((prev) => prev.map((x) => x.id === c.id ? { ...x, status: "active" } : x)),
            }] : []}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <PageHeader title="Contacts" description="Manage your contact directory">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditingContact(null); setShowFormModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Contact
          </Button>
        </div>
      </PageHeader>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Contacts" value={totalContacts} subtitle="All contacts in system" icon={<Users className="w-5 h-5" />} trend={{ value: 7, label: "vs last month" }} />
        <StatsCard title="Active Contacts" value={activeContacts} subtitle="Currently active" icon={<Users className="w-5 h-5" />} />
        <StatsCard title="Pending" value={pendingContacts} subtitle="Awaiting activation" icon={<Eye className="w-5 h-5" />} />
        <StatsCard title="Linked to Account" value={linkedToAccount} subtitle="Associated with an account" icon={<Building2 className="w-5 h-5" />} />
      </div>

      {/* ── Filter & Table ── */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <FilterBar
            searchValue={filters._search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
            fields={FILTER_FIELDS}
            values={filters}
            onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredContacts as unknown as Record<string, unknown>[]}
          emptyMessage="No contacts found."
        />
      </div>

      {/* ── Create / Edit Modal ── */}
      <EntityFormModal
        open={showFormModal}
        onOpenChange={(open) => { setShowFormModal(open); if (!open) setEditingContact(null); }}
        title={editingContact ? "Edit Contact" : "Add New Contact"}
        fields={CONTACT_FIELDS}
        initialData={editingContact ? {
          firstName: editingContact.firstName,
          lastName: editingContact.lastName,
          title: editingContact.title,
          email: editingContact.email,
          phone: editingContact.phone,
          account: editingContact.account || "",
          owner: editingContact.owner,
          status: editingContact.status,
        } : undefined}
        onSubmit={handleSubmit}
      />

      {/* ── Contact Detail Dialog ── */}
      <Dialog open={!!detailContact} onOpenChange={(open) => { if (!open) setDetailContact(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailContact?.firstName} {detailContact?.lastName}</DialogTitle>
          </DialogHeader>
          {detailContact && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Full Name</span>
                  <p className="font-medium">{detailContact.firstName} {detailContact.lastName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Job Title</span>
                  <p className="font-medium">{detailContact.title || "---"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email</span>
                  <p className="font-medium flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {detailContact.email}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <p className="font-medium flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {detailContact.phone || "---"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p><StatusBadge status={detailContact.status} /></p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Owner</span>
                  <p className="font-medium">{detailContact.owner}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Created</span>
                  <p className="font-medium">{detailContact.createdAt}</p>
                </div>
              </div>

              {/* Linked account info */}
              {detailContact.account ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Linked Account
                  </h4>
                  <p className="text-sm font-medium">{detailContact.account}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This contact is associated with the {detailContact.account} account.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground italic">
                    This contact is not linked to any account.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setDetailContact(null);
                    setEditingContact(detailContact);
                    setShowFormModal(true);
                  }}
                >
                  Edit Contact
                </Button>
                {detailContact.status === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setContacts((prev) => prev.map((c) => c.id === detailContact.id ? { ...c, status: "active" } : c));
                      setDetailContact({ ...detailContact, status: "active" });
                    }}
                  >
                    Set Active
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDelete(detailContact.id);
                    setDetailContact(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
