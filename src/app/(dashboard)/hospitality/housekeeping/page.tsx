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
  SprayCan,
  Clock,
  CheckCircle2,
  Loader2,
  Search,
  Plus,
  ClipboardCheck,
  Wrench,
  UserCheck,
  Sparkles,
} from "lucide-react";

// ─── Mock Data ─────────────────────────────────────────────────────────────

const stats = [
  { label: "Rooms to Clean", value: "28", icon: SprayCan, color: "text-red-600", bg: "bg-red-100" },
  { label: "In Progress", value: "12", icon: Loader2, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Completed Today", value: "45", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
  { label: "Avg Turn Time (mins)", value: "32", icon: Clock, color: "text-purple-600", bg: "bg-purple-100" },
];

// Room status board
const roomFloors = [
  {
    floor: "Floor 1",
    rooms: [
      { number: "101", status: "Clean", housekeeper: "Maria G." },
      { number: "102", status: "Inspected", housekeeper: "Maria G." },
      { number: "103", status: "Dirty", housekeeper: "—" },
      { number: "104", status: "Clean", housekeeper: "Ana R." },
      { number: "105", status: "In Progress", housekeeper: "Ana R." },
      { number: "106", status: "Inspected", housekeeper: "Maria G." },
      { number: "107", status: "Dirty", housekeeper: "—" },
      { number: "108", status: "Clean", housekeeper: "Fatima K." },
      { number: "109", status: "Out of Order", housekeeper: "—" },
      { number: "110", status: "Inspected", housekeeper: "Maria G." },
    ],
  },
  {
    floor: "Floor 2",
    rooms: [
      { number: "201", status: "In Progress", housekeeper: "Fatima K." },
      { number: "202", status: "Dirty", housekeeper: "—" },
      { number: "203", status: "Clean", housekeeper: "Rosa L." },
      { number: "204", status: "Inspected", housekeeper: "Rosa L." },
      { number: "205", status: "Dirty", housekeeper: "—" },
      { number: "206", status: "Dirty", housekeeper: "—" },
      { number: "207", status: "In Progress", housekeeper: "Rosa L." },
      { number: "208", status: "Clean", housekeeper: "Fatima K." },
      { number: "209", status: "Inspected", housekeeper: "Ana R." },
      { number: "210", status: "In Progress", housekeeper: "Ana R." },
    ],
  },
  {
    floor: "Floor 3",
    rooms: [
      { number: "301", status: "Dirty", housekeeper: "—" },
      { number: "302", status: "In Progress", housekeeper: "Jung S." },
      { number: "303", status: "Dirty", housekeeper: "—" },
      { number: "304", status: "Clean", housekeeper: "Jung S." },
      { number: "305", status: "Inspected", housekeeper: "Jung S." },
      { number: "306", status: "In Progress", housekeeper: "Fatima K." },
      { number: "307", status: "Dirty", housekeeper: "—" },
      { number: "308", status: "Clean", housekeeper: "Maria G." },
      { number: "309", status: "Dirty", housekeeper: "—" },
      { number: "310", status: "In Progress", housekeeper: "Rosa L." },
    ],
  },
  {
    floor: "Floor 4 (Suites)",
    rooms: [
      { number: "401", status: "In Progress", housekeeper: "Jung S." },
      { number: "402", status: "Inspected", housekeeper: "Jung S." },
      { number: "403", status: "Clean", housekeeper: "Maria G." },
      { number: "404", status: "Inspected", housekeeper: "Maria G." },
      { number: "405", status: "Dirty", housekeeper: "—" },
      { number: "406", status: "In Progress", housekeeper: "Ana R." },
    ],
  },
];

const assignments = [
  { housekeeper: "Maria G.", roomsAssigned: 12, completed: 8, remaining: 4, avgTime: 28 },
  { housekeeper: "Ana R.", roomsAssigned: 10, completed: 6, remaining: 4, avgTime: 34 },
  { housekeeper: "Fatima K.", roomsAssigned: 11, completed: 7, remaining: 4, avgTime: 30 },
  { housekeeper: "Rosa L.", roomsAssigned: 10, completed: 5, remaining: 5, avgTime: 36 },
  { housekeeper: "Jung S.", roomsAssigned: 9, completed: 6, remaining: 3, avgTime: 32 },
];

const inspections = [
  { room: "102", inspector: "Supervisor Linda", score: 9, issues: 0, status: "Passed" },
  { room: "106", inspector: "Supervisor Linda", score: 10, issues: 0, status: "Passed" },
  { room: "110", inspector: "Supervisor Linda", score: 8, issues: 1, status: "Passed" },
  { room: "204", inspector: "Supervisor Marco", score: 9, issues: 0, status: "Passed" },
  { room: "209", inspector: "Supervisor Marco", score: 7, issues: 2, status: "Failed" },
  { room: "305", inspector: "Supervisor Linda", score: 10, issues: 0, status: "Passed" },
  { room: "402", inspector: "Supervisor Marco", score: 9, issues: 0, status: "Passed" },
  { room: "404", inspector: "Supervisor Marco", score: 8, issues: 1, status: "Passed" },
  { room: "301", inspector: "—", score: 0, issues: 0, status: "Pending" },
  { room: "303", inspector: "—", score: 0, issues: 0, status: "Pending" },
];

const minibar = [
  { room: "101", lastChecked: "May 9", itemsConsumed: 3, charge: "$18.00", restocked: true },
  { room: "203", lastChecked: "May 9", itemsConsumed: 1, charge: "$8.00", restocked: true },
  { room: "302", lastChecked: "May 10", itemsConsumed: 5, charge: "$42.00", restocked: false },
  { room: "405", lastChecked: "May 9", itemsConsumed: 2, charge: "$15.00", restocked: true },
  { room: "401", lastChecked: "May 10", itemsConsumed: 4, charge: "$35.00", restocked: false },
];

const laundry = [
  { type: "Guest Laundry", room: "301", items: 5, status: "Washing", eta: "3:00 PM" },
  { type: "Guest Laundry", room: "405", items: 3, status: "Ready", eta: "—" },
  { type: "Linens - Floor 1", room: "—", items: 120, status: "Drying", eta: "2:30 PM" },
  { type: "Linens - Floor 2", room: "—", items: 95, status: "Folding", eta: "2:00 PM" },
  { type: "Guest Laundry", room: "204", items: 8, status: "Pressing", eta: "4:00 PM" },
  { type: "Towels - Pool", room: "—", items: 200, status: "Washing", eta: "3:30 PM" },
];

function roomStatusColor(status: string) {
  const map: Record<string, string> = {
    Dirty: "bg-red-500 text-white",
    "In Progress": "bg-yellow-500 text-white",
    Clean: "bg-green-500 text-white",
    Inspected: "bg-blue-500 text-white",
    "Out of Order": "bg-gray-500 text-white",
  };
  return map[status] || "bg-gray-300 text-gray-800";
}

function inspectionStatusBadge(status: string) {
  const map: Record<string, string> = {
    Passed: "bg-green-100 text-green-800",
    Failed: "bg-red-100 text-red-800",
    Pending: "bg-yellow-100 text-yellow-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function laundryStatusBadge(status: string) {
  const map: Record<string, string> = {
    Washing: "bg-blue-100 text-blue-800",
    Drying: "bg-yellow-100 text-yellow-800",
    Folding: "bg-purple-100 text-purple-800",
    Pressing: "bg-orange-100 text-orange-800",
    Ready: "bg-green-100 text-green-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

export default function HousekeepingPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Housekeeping</h1>
          <p className="text-muted-foreground">Manage room cleaning, inspections, minibar, and laundry</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><UserCheck className="h-4 w-4 mr-2" />Assign Rooms</Button>
          <Button variant="outline"><Sparkles className="h-4 w-4 mr-2" />Mark Clean</Button>
          <Button variant="outline"><ClipboardCheck className="h-4 w-4 mr-2" />Start Inspection</Button>
          <Button><Wrench className="h-4 w-4 mr-2" />Report Maintenance</Button>
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
          <Input placeholder="Search rooms, housekeepers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="board" className="space-y-4">
        <TabsList>
          <TabsTrigger value="board">Room Status Board</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="minibar">Minibar</TabsTrigger>
          <TabsTrigger value="laundry">Laundry</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <Card>
            <CardHeader>
              <CardTitle>Room Status Board</CardTitle>
              <div className="flex gap-3 flex-wrap mt-2">
                {["Dirty", "In Progress", "Clean", "Inspected", "Out of Order"].map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${roomStatusColor(s)}`} />
                    <span className="text-xs text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {roomFloors.map((floor) => (
                <div key={floor.floor}>
                  <h4 className="text-sm font-medium mb-2">{floor.floor}</h4>
                  <div className="flex gap-2 flex-wrap">
                    {floor.rooms.map((room) => (
                      <div
                        key={room.number}
                        className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer hover:opacity-80 transition-opacity ${roomStatusColor(room.status)}`}
                        title={`Room ${room.number} - ${room.status}${room.housekeeper !== "—" ? ` (${room.housekeeper})` : ""}`}
                      >
                        <span className="font-medium">{room.number}</span>
                        <span className="text-[10px] opacity-80 truncate w-full text-center">{room.housekeeper !== "—" ? room.housekeeper.split(" ")[0] : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader><CardTitle>Housekeeper Assignments</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Housekeeper</TableHead>
                    <TableHead>Rooms Assigned</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Avg Time (mins)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.housekeeper}>
                      <TableCell className="font-medium">{a.housekeeper}</TableCell>
                      <TableCell>{a.roomsAssigned}</TableCell>
                      <TableCell className="text-green-600">{a.completed}</TableCell>
                      <TableCell className={a.remaining > 4 ? "text-red-600" : ""}>{a.remaining}</TableCell>
                      <TableCell>{a.avgTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections">
          <Card>
            <CardHeader><CardTitle>Room Inspections</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Score (1-10)</TableHead>
                    <TableHead>Issues Found</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((i) => (
                    <TableRow key={i.room}>
                      <TableCell className="font-mono">{i.room}</TableCell>
                      <TableCell>{i.inspector}</TableCell>
                      <TableCell className={i.score >= 9 ? "text-green-600 font-medium" : i.score >= 7 ? "text-yellow-600" : i.score > 0 ? "text-red-600" : "text-muted-foreground"}>{i.score || "—"}</TableCell>
                      <TableCell>{i.issues}</TableCell>
                      <TableCell>{inspectionStatusBadge(i.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minibar">
          <Card>
            <CardHeader><CardTitle>Minibar Status</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Items Consumed</TableHead>
                    <TableHead>Charge</TableHead>
                    <TableHead>Restocked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {minibar.map((m) => (
                    <TableRow key={m.room}>
                      <TableCell className="font-mono">{m.room}</TableCell>
                      <TableCell>{m.lastChecked}</TableCell>
                      <TableCell>{m.itemsConsumed}</TableCell>
                      <TableCell className="font-medium">{m.charge}</TableCell>
                      <TableCell>{m.restocked ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge className="bg-red-100 text-red-800">No</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="laundry">
          <Card>
            <CardHeader><CardTitle>Laundry Operations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laundry.map((l, i) => (
                    <TableRow key={`${l.type}-${l.room}-${i}`}>
                      <TableCell className="font-medium">{l.type}</TableCell>
                      <TableCell className="font-mono">{l.room}</TableCell>
                      <TableCell>{l.items}</TableCell>
                      <TableCell>{laundryStatusBadge(l.status)}</TableCell>
                      <TableCell>{l.eta}</TableCell>
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
