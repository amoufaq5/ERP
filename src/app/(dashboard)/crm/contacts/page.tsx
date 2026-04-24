"use client";

import { useState } from "react";
import { Users, UserPlus, Link, UserX, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import type { Column } from "@/components/shared/data-table";
import { useDataStore } from "@/lib/data-store";

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

const CONTACT_FIELDS: EntityField[] = [
  { name: "firstName", label: "First Name", type: "text", placeholder: "First name", required: true },
  { name: "lastName", label: "Last Name", type: "text", placeholder: "Last name" },
  { name: "title", label: "Job Title", type: "text", placeholder: "e.g. VP of Sales", fullWidth: true },
  { name: "email", label: "Email", type: "email", placeholder: "email@company.com", required: true },
  { name: "phone", label: "Phone", type: "text", placeholder: "+1 (555) 000-0000" },
  { name: "account", label: "Account", type: "text", placeholder: "Company name (optional)" },
  { name: "owner", label: "Owner", type: "text", placeholder: "Assigned rep" },
];

const FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Active", value: "active" }, { label: "Pending", value: "pending" },
  ]},
];

export default function ContactsPage() {
  const store = useDataStore();
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);

  const filtered = contacts.filter((c) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.account || "").toLowerCase().includes(q);
    const matchesStatus = !filters.status || c.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const totalContacts = contacts.length;
  const newThisMonth = contacts.filter((c) => c.createdAt >= "2026-03-01").length;
  const withAccount = contacts.filter((c) => c.account !== null).length;
  const withoutAccount = contacts.filter((c) => c.account === null).length;

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
      render: (v) => v ? <span>{v as string}</span> : <span className="text-muted-foreground italic text-xs">No account</span>,
    },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    { key: "createdAt", label: "Created" },
    {
      key: "id",
      label: "",
      render: (_v, row) => {
        const c = contacts.find((x) => x.id === row.id);
        if (!c) return null;
        return (
          <EditDeleteMenu
            onEdit={() => { setEditing(c); setShowModal(true); }}
            onDelete={() => setContacts((prev) => prev.filter((x) => x.id !== c.id))}
            onView={() => setDetailContact(c)}
            canView
            itemLabel={`${c.firstName} ${c.lastName}`}
            extraItems={c.status === "pending" ? [{ label: "Set Active", onClick: () => setContacts((prev) => prev.map((x) => x.id === c.id ? { ...x, status: "active" } : x)) }] : []}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Contacts" description="Manage your business contacts and relationships">
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Contact
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Contacts" value={totalContacts} subtitle="All contacts in system" icon={<Users className="w-5 h-5" />} trend={{ value: 7, label: "vs last month" }} />
        <StatsCard title="New This Month" value={newThisMonth} subtitle="Added in March 2026" icon={<UserPlus className="w-5 h-5" />} />
        <StatsCard title="With Account" value={withAccount} subtitle="Linked to an account" icon={<Link className="w-5 h-5" />} />
        <StatsCard title="Without Account" value={withoutAccount} subtitle="Not yet linked" icon={<UserX className="w-5 h-5" />} />
      </div>

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
        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} emptyMessage="No contacts found." exportable exportFilename="contacts.csv" />
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Contact" : "Add New Contact"}
        fields={CONTACT_FIELDS}
        initialData={editing ? { firstName: editing.firstName, lastName: editing.lastName, title: editing.title, email: editing.email, phone: editing.phone, account: editing.account || "", owner: editing.owner } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setContacts((prev) => prev.map((c) => c.id === editing.id ? {
              ...c,
              firstName: data.firstName as string,
              lastName: (data.lastName as string) || c.lastName,
              title: (data.title as string) || c.title,
              email: data.email as string,
              phone: (data.phone as string) || c.phone,
              account: (data.account as string) || null,
              owner: (data.owner as string) || c.owner,
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
              status: "active",
              createdAt: new Date().toISOString().split("T")[0],
            };
            setContacts((prev) => [newContact, ...prev]);
          }
          setShowModal(false);
          setEditing(null);
        }}
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
                <div><span className="text-sm text-muted-foreground">Name</span><p className="font-medium">{detailContact.firstName} {detailContact.lastName}</p></div>
                <div><span className="text-sm text-muted-foreground">Job Title</span><p className="font-medium">{detailContact.title || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{detailContact.email}</p></div>
                <div><span className="text-sm text-muted-foreground">Phone</span><p className="font-medium">{detailContact.phone || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Account</span><p className="font-medium">{detailContact.account || "No account"}</p></div>
                <div><span className="text-sm text-muted-foreground">Owner</span><p className="font-medium">{detailContact.owner}</p></div>
                <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={detailContact.status} /></p></div>
                <div><span className="text-sm text-muted-foreground">Created</span><p className="font-medium">{detailContact.createdAt}</p></div>
              </div>
              {/* Cross-module: ERP customer data */}
              {(() => {
                if (!detailContact.account) return null;
                const matchedCustomer = store.customers.find(c => c.name === detailContact.account);
                const relatedInvoices = matchedCustomer ? store.invoices.filter(i => i.customerId === matchedCustomer.id) : [];
                return matchedCustomer ? (
                  <div className="pt-3 border-t">
                    <h4 className="text-sm font-semibold mb-2">ERP Customer Data — {matchedCustomer.name}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Outstanding</span><p className="font-medium">EGP {matchedCustomer.outstanding.toLocaleString()}</p></div>
                      <div><span className="text-muted-foreground">Credit Limit</span><p className="font-medium">EGP {matchedCustomer.creditLimit.toLocaleString()}</p></div>
                      <div><span className="text-muted-foreground">Invoices</span><p className="font-medium">{relatedInvoices.length} ({relatedInvoices.filter(i => i.status === "PAID").length} paid)</p></div>
                      <div><span className="text-muted-foreground">Payment Terms</span><p className="font-medium">{matchedCustomer.paymentTerms}</p></div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
