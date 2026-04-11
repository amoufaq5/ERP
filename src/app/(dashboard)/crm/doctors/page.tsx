"use client";

import { useState } from "react";
import { Stethoscope, Users, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { FormModal, type FormField } from "@/components/ui/form-modal";

interface Doctor {
  id: string; name: string; specialty: string; hospital: string; city: string;
  phone: string; classification: "A" | "B" | "C"; assignedRep: string;
  visitFrequency: string; lastVisit: string; products: string; status: string;
}

const INITIAL: Doctor[] = [
  { id: "DR-001", name: "Dr. Tarek Hamdy", specialty: "Cardiologist", hospital: "Cairo Heart Center", city: "Cairo", phone: "+20 100 111 2222", classification: "A", assignedRep: "Ahmed Hassan", visitFrequency: "Weekly", lastVisit: "2026-03-30", products: "Cardizem, Atenol", status: "Active" },
  { id: "DR-002", name: "Dr. Mona Abdelrahman", specialty: "Pediatrician", hospital: "Children's Hospital", city: "Cairo", phone: "+20 100 222 3333", classification: "A", assignedRep: "Ahmed Hassan", visitFrequency: "Weekly", lastVisit: "2026-03-29", products: "Augmentin, Zinnat", status: "Active" },
  { id: "DR-003", name: "Dr. Sherif Nabil", specialty: "GP", hospital: "Alex Medical Center", city: "Alexandria", phone: "+20 100 333 4444", classification: "B", assignedRep: "Sara Mohamed", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-25", products: "Panadol, Voltaren", status: "Active" },
  { id: "DR-004", name: "Dr. Laila Saad", specialty: "Dermatologist", hospital: "Skin Care Clinic", city: "Giza", phone: "+20 100 444 5555", classification: "A", assignedRep: "Omar Khalil", visitFrequency: "Weekly", lastVisit: "2026-03-30", products: "Fucidin, Elocon", status: "Active" },
  { id: "DR-005", name: "Dr. Hossam Ezzat", specialty: "Orthopedic", hospital: "Ortho Care Center", city: "Cairo", phone: "+20 100 555 6666", classification: "A", assignedRep: "Fatima Ali", visitFrequency: "Weekly", lastVisit: "2026-03-27", products: "Voltaren, Celebrex", status: "Active" },
  { id: "DR-006", name: "Dr. Amira Gaber", specialty: "Neurologist", hospital: "Neuro Institute", city: "Cairo", phone: "+20 100 666 7777", classification: "A", assignedRep: "Ahmed Hassan", visitFrequency: "Weekly", lastVisit: "2026-03-26", products: "Depakine, Tegretol", status: "Active" },
  { id: "DR-007", name: "Dr. Walid Fathy", specialty: "Oncologist", hospital: "Cancer Institute", city: "Cairo", phone: "+20 100 777 8888", classification: "A", assignedRep: "Fatima Ali", visitFrequency: "Weekly", lastVisit: "2026-03-28", products: "Herceptin, Avastin", status: "Active" },
  { id: "DR-008", name: "Dr. Nada Hussein", specialty: "Internal Medicine", hospital: "Mansoura University", city: "Mansoura", phone: "+20 100 888 9999", classification: "B", assignedRep: "Mahmoud Farouk", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-22", products: "Nexium, Losec", status: "Active" },
  { id: "DR-009", name: "Dr. Rami Adel", specialty: "GP", hospital: "Family Clinic", city: "Tanta", phone: "+20 100 999 0000", classification: "C", assignedRep: "Nour Ibrahim", visitFrequency: "Monthly", lastVisit: "2026-02-28", products: "Panadol, Brufen", status: "Active" },
  { id: "DR-010", name: "Dr. Yasmin Tarek", specialty: "Pediatrician", hospital: "Giza Children's Hospital", city: "Giza", phone: "+20 101 111 2222", classification: "A", assignedRep: "Omar Khalil", visitFrequency: "Weekly", lastVisit: "2026-03-30", products: "Augmentin, Klacid", status: "Active" },
  { id: "DR-011", name: "Dr. Ashraf Zaki", specialty: "Cardiologist", hospital: "Heart & Vascular Clinic", city: "Alexandria", phone: "+20 101 222 3333", classification: "A", assignedRep: "Sara Mohamed", visitFrequency: "Weekly", lastVisit: "2026-03-29", products: "Plavix, Crestor", status: "Active" },
  { id: "DR-012", name: "Dr. Rania Sobhy", specialty: "Dermatologist", hospital: "Skin Clinic Alex", city: "Alexandria", phone: "+20 101 333 4444", classification: "B", assignedRep: "Sara Mohamed", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-24", products: "Fucidin, Differin", status: "Active" },
  { id: "DR-013", name: "Dr. Emad Shawky", specialty: "ENT", hospital: "ENT Hospital", city: "Zagazig", phone: "+20 101 444 5555", classification: "B", assignedRep: "Karim Saeed", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-23", products: "Otrivin, Avamys", status: "Active" },
  { id: "DR-014", name: "Dr. Samia Magdy", specialty: "Psychiatrist", hospital: "Psychiatry Center", city: "Cairo", phone: "+20 101 555 6666", classification: "A", assignedRep: "Fatima Ali", visitFrequency: "Weekly", lastVisit: "2026-03-28", products: "Zoloft, Xanax", status: "Active" },
  { id: "DR-015", name: "Dr. Khaled Adham", specialty: "Urologist", hospital: "Urology Center", city: "Ismailia", phone: "+20 101 666 7777", classification: "C", assignedRep: "Yousef Ahmad", visitFrequency: "Monthly", lastVisit: "2026-03-10", products: "Cialis, Levitra", status: "Active" },
  { id: "DR-016", name: "Dr. Ihab Salama", specialty: "Cardiologist", hospital: "Mansoura Cardiac", city: "Mansoura", phone: "+20 101 777 8888", classification: "B", assignedRep: "Mahmoud Farouk", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-20", products: "Crestor, Plavix", status: "Active" },
  { id: "DR-017", name: "Dr. Heba Mostafa", specialty: "Pediatrician", hospital: "Tanta Children's", city: "Tanta", phone: "+20 101 888 9999", classification: "B", assignedRep: "Nour Ibrahim", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-19", products: "Augmentin, Zinnat", status: "Active" },
  { id: "DR-018", name: "Dr. Yousef Saad", specialty: "GP", hospital: "Suez Medical", city: "Suez", phone: "+20 102 111 2222", classification: "C", assignedRep: "Dina Mostafa", visitFrequency: "Monthly", lastVisit: "2026-02-25", products: "Panadol", status: "Inactive" },
  { id: "DR-019", name: "Dr. Mariam Helmy", specialty: "Oncologist", hospital: "Alex Cancer Center", city: "Alexandria", phone: "+20 102 222 3333", classification: "A", assignedRep: "Sara Mohamed", visitFrequency: "Weekly", lastVisit: "2026-03-28", products: "Herceptin", status: "Active" },
  { id: "DR-020", name: "Dr. Adel Farid", specialty: "Neurologist", hospital: "Assiut University", city: "Assiut", phone: "+20 102 333 4444", classification: "B", assignedRep: "Hala Samir", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-15", products: "Depakine, Keppra", status: "Active" },
];

const SPECIALTIES = ["Cardiologist", "GP", "Pediatrician", "Dermatologist", "Orthopedic", "Neurologist", "Oncologist", "Internal Medicine", "ENT", "Urologist", "Psychiatrist"];

const doctorFields: FormField[] = [
  { name: "name", label: "Doctor Name", type: "text", required: true },
  { name: "specialty", label: "Specialty", type: "select", required: true, options: SPECIALTIES.map(s => ({ label: s, value: s })) },
  { name: "hospital", label: "Hospital/Clinic", type: "text", required: true },
  { name: "city", label: "City", type: "text", required: true },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "classification", label: "Classification", type: "select", required: true, options: [
    { label: "A - High Priority", value: "A" }, { label: "B - Medium", value: "B" }, { label: "C - Low", value: "C" },
  ]},
  { name: "assignedRep", label: "Assigned Rep", type: "text", required: true },
  { name: "visitFrequency", label: "Visit Frequency", type: "select", options: [
    { label: "Weekly", value: "Weekly" }, { label: "Bi-Weekly", value: "Bi-Weekly" }, { label: "Monthly", value: "Monthly" },
  ]},
];

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState(INITIAL);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);

  const aClass = doctors.filter(d => d.classification === "A").length;
  const bClass = doctors.filter(d => d.classification === "B").length;
  const cClass = doctors.filter(d => d.classification === "C").length;

  const filtered = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty.toLowerCase().includes(search.toLowerCase()) ||
    d.city.toLowerCase().includes(search.toLowerCase())
  );

  const bySpecialty = SPECIALTIES.map(s => ({
    specialty: s,
    count: doctors.filter(d => d.specialty === s).length,
    aCount: doctors.filter(d => d.specialty === s && d.classification === "A").length,
  })).filter(s => s.count > 0);

  const coverage = doctors.map(d => {
    const required = d.classification === "A" ? 4 : d.classification === "B" ? 2 : 1;
    const actual = d.lastVisit !== "N/A" ? required - 1 : 0;
    const pct = Math.round((actual / required) * 100);
    return { ...d, required, actual, pct, gap: pct < 100 ? "Gap" : "On Track" };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Directory"
        description="Central directory of all healthcare professionals"
        actions={<Button onClick={() => setShow(true)}><Plus className="mr-2 h-4 w-4" />Add Doctor</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Stethoscope} title="Total Doctors" value={doctors.length} iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={Star} title="A-Class" value={aClass} subtitle="High prescribers" iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={Users} title="B-Class" value={bClass} subtitle="Medium" iconColor="bg-amber-100 text-amber-700" />
        <StatsCard icon={Users} title="C-Class" value={cClass} subtitle="Low" iconColor="bg-gray-100 text-gray-700" />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Doctors</TabsTrigger>
          <TabsTrigger value="specialty">By Specialty</TabsTrigger>
          <TabsTrigger value="class">By Classification</TabsTrigger>
          <TabsTrigger value="coverage">Visit Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader><CardTitle>All Doctors ({filtered.length})</CardTitle></CardHeader>
            <CardContent>
              <Input placeholder="Search by name, specialty, or city..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3 max-w-sm" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">ID</th><th className="p-3">Name</th><th className="p-3">Specialty</th><th className="p-3">Hospital</th><th className="p-3">City</th><th className="p-3">Phone</th><th className="p-3">Class</th><th className="p-3">Rep</th><th className="p-3">Frequency</th><th className="p-3">Last Visit</th><th className="p-3">Products</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr key={d.id} className="border-t">
                        <td className="p-3 font-mono text-xs">{d.id}</td>
                        <td className="p-3 font-medium">{d.name}</td>
                        <td className="p-3">{d.specialty}</td>
                        <td className="p-3">{d.hospital}</td>
                        <td className="p-3">{d.city}</td>
                        <td className="p-3 text-xs">{d.phone}</td>
                        <td className="p-3"><Badge variant={d.classification === "A" ? "default" : "secondary"}>{d.classification}</Badge></td>
                        <td className="p-3">{d.assignedRep}</td>
                        <td className="p-3">{d.visitFrequency}</td>
                        <td className="p-3">{d.lastVisit}</td>
                        <td className="p-3 text-xs">{d.products}</td>
                        <td className="p-3"><StatusBadge status={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialty">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bySpecialty.map((s, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4" />{s.specialty}</CardTitle>
                  <CardDescription>{s.count} doctors • {s.aCount} A-Class</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{s.count}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total in specialty</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="class">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>A-Class</CardTitle><CardDescription>High prescribers • Weekly visits</CardDescription></CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">{aClass}</div>
                <div className="text-xs text-muted-foreground mt-1">{Math.round((aClass / doctors.length) * 100)}% of total</div>
                <div className="mt-3 space-y-1 text-sm">
                  {doctors.filter(d => d.classification === "A").slice(0, 5).map(d => (
                    <div key={d.id} className="flex justify-between"><span>{d.name}</span><span className="text-muted-foreground text-xs">{d.specialty}</span></div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>B-Class</CardTitle><CardDescription>Medium prescribers • Bi-Weekly visits</CardDescription></CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-600">{bClass}</div>
                <div className="text-xs text-muted-foreground mt-1">{Math.round((bClass / doctors.length) * 100)}% of total</div>
                <div className="mt-3 space-y-1 text-sm">
                  {doctors.filter(d => d.classification === "B").slice(0, 5).map(d => (
                    <div key={d.id} className="flex justify-between"><span>{d.name}</span><span className="text-muted-foreground text-xs">{d.specialty}</span></div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>C-Class</CardTitle><CardDescription>Low prescribers • Monthly visits</CardDescription></CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-600">{cClass}</div>
                <div className="text-xs text-muted-foreground mt-1">{Math.round((cClass / doctors.length) * 100)}% of total</div>
                <div className="mt-3 space-y-1 text-sm">
                  {doctors.filter(d => d.classification === "C").slice(0, 5).map(d => (
                    <div key={d.id} className="flex justify-between"><span>{d.name}</span><span className="text-muted-foreground text-xs">{d.specialty}</span></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="coverage">
          <Card>
            <CardHeader><CardTitle>Visit Coverage Analysis</CardTitle><CardDescription>Required vs actual visits per doctor</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Doctor</th><th className="p-3">Class</th><th className="p-3">Required/Mo</th><th className="p-3">Actual</th><th className="p-3">Coverage</th><th className="p-3">Last Visit</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {coverage.map(d => (
                      <tr key={d.id} className="border-t">
                        <td className="p-3 font-medium">{d.name}</td>
                        <td className="p-3"><Badge variant={d.classification === "A" ? "default" : "secondary"}>{d.classification}</Badge></td>
                        <td className="p-3">{d.required}</td>
                        <td className="p-3">{d.actual}</td>
                        <td className="p-3">
                          <span className={d.pct >= 100 ? "text-green-600" : d.pct >= 50 ? "text-amber-600" : "text-red-600"}>{d.pct}%</span>
                        </td>
                        <td className="p-3">{d.lastVisit}</td>
                        <td className="p-3"><StatusBadge status={d.gap} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormModal open={show} onOpenChange={setShow} title="Add Doctor" fields={doctorFields}
        onSubmit={(d) => setDoctors(prev => [{
          id: `DR-${String(prev.length + 21).padStart(3, "0")}`, name: d.name, specialty: d.specialty,
          hospital: d.hospital, city: d.city, phone: d.phone || "", classification: (d.classification || "B") as "A" | "B" | "C",
          assignedRep: d.assignedRep, visitFrequency: d.visitFrequency || "Monthly", lastVisit: "-", products: "-", status: "Active",
        }, ...prev])} />
    </div>
  );
}
