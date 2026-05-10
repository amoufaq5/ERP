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
  Hotel,
  BedDouble,
  LogIn,
  LogOut,
  DollarSign,
  Search,
  Plus,
  ArrowRightLeft,
  Ban,
  Wrench,
  UserCheck,
} from "lucide-react";

// ─── Mock Data ─────────────────────────────────────────────────────────────

const stats = [
  { label: "Occupancy Rate", value: "87.3%", icon: Hotel, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Rooms Available Tonight", value: "24", icon: BedDouble, color: "text-green-600", bg: "bg-green-100" },
  { label: "Check-ins Today", value: "38", icon: LogIn, color: "text-purple-600", bg: "bg-purple-100" },
  { label: "Check-outs Today", value: "31", icon: LogOut, color: "text-orange-600", bg: "bg-orange-100" },
  { label: "RevPAR", value: "$185.40", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100" },
];

// Room grid data - floors and rooms with statuses
const floors = [
  {
    floor: "Floor 1",
    rooms: [
      { number: "101", status: "Occupied" }, { number: "102", status: "Occupied" }, { number: "103", status: "Vacant" },
      { number: "104", status: "Reserved" }, { number: "105", status: "Occupied" }, { number: "106", status: "Clean" },
      { number: "107", status: "Dirty" }, { number: "108", status: "Occupied" }, { number: "109", status: "Out of Order" }, { number: "110", status: "Occupied" },
    ],
  },
  {
    floor: "Floor 2",
    rooms: [
      { number: "201", status: "Occupied" }, { number: "202", status: "Clean" }, { number: "203", status: "Occupied" },
      { number: "204", status: "Occupied" }, { number: "205", status: "Reserved" }, { number: "206", status: "Dirty" },
      { number: "207", status: "Occupied" }, { number: "208", status: "Vacant" }, { number: "209", status: "Occupied" }, { number: "210", status: "Occupied" },
    ],
  },
  {
    floor: "Floor 3",
    rooms: [
      { number: "301", status: "Reserved" }, { number: "302", status: "Occupied" }, { number: "303", status: "Occupied" },
      { number: "304", status: "Clean" }, { number: "305", status: "Occupied" }, { number: "306", status: "Occupied" },
      { number: "307", status: "Dirty" }, { number: "308", status: "Occupied" }, { number: "309", status: "Reserved" }, { number: "310", status: "Vacant" },
    ],
  },
  {
    floor: "Floor 4 (Suites)",
    rooms: [
      { number: "401", status: "Occupied" }, { number: "402", status: "Occupied" }, { number: "403", status: "Reserved" },
      { number: "404", status: "Vacant" }, { number: "405", status: "Occupied" }, { number: "406", status: "Occupied" },
    ],
  },
];

const arrivals = [
  { guest: "Mr. Robert Chen", roomType: "Deluxe King", room: "103", eta: "2:00 PM", vip: true, specialRequests: "High floor, extra pillows", status: "Expected" },
  { guest: "Ms. Sarah Williams", roomType: "Standard Twin", room: "208", eta: "3:00 PM", vip: false, specialRequests: "Near elevator", status: "Expected" },
  { guest: "Mr. Ahmed Hassan", roomType: "Suite", room: "404", eta: "1:30 PM", vip: true, specialRequests: "Champagne, late checkout pre-approved", status: "Checked In" },
  { guest: "Mrs. Lisa Park", roomType: "Deluxe King", room: "304", eta: "4:00 PM", vip: false, specialRequests: "None", status: "Expected" },
  { guest: "Mr. James Morrison", roomType: "Standard King", room: "106", eta: "12:00 PM", vip: false, specialRequests: "Ground floor", status: "Checked In" },
  { guest: "Dr. Elena Volkov", roomType: "Suite", room: "403", eta: "5:00 PM", vip: true, specialRequests: "Allergen-free room, welcome fruit basket", status: "Expected" },
  { guest: "Mr. Carlos Reyes", roomType: "Standard Twin", room: "310", eta: "2:30 PM", vip: false, specialRequests: "Crib needed", status: "Expected" },
  { guest: "Ms. Priya Sharma", roomType: "Deluxe King", room: "202", eta: "11:00 AM", vip: false, specialRequests: "None", status: "No Show" },
];

const departures = [
  { guest: "Mr. David Kim", room: "105", checkoutTime: "10:00 AM", balance: "$0.00", status: "Checked Out" },
  { guest: "Ms. Anna Berger", room: "207", checkoutTime: "11:00 AM", balance: "$45.00", status: "Due Out" },
  { guest: "Mr. Thomas Wright", room: "302", checkoutTime: "12:00 PM", balance: "$0.00", status: "Due Out" },
  { guest: "Mrs. Maria Santos", room: "401", checkoutTime: "11:00 AM", balance: "$120.00", status: "Late Checkout" },
  { guest: "Mr. John O'Connor", room: "110", checkoutTime: "10:00 AM", balance: "$0.00", status: "Checked Out" },
];

const maintenance = [
  { room: "109", issue: "AC not cooling", reportedBy: "Guest", priority: "High", assignedTo: "Mike R.", status: "In Progress", reportedAt: "9:00 AM" },
  { room: "206", issue: "Leaking faucet", reportedBy: "Housekeeping", priority: "Medium", assignedTo: "Tom S.", status: "Open", reportedAt: "10:30 AM" },
  { room: "307", issue: "TV remote not working", reportedBy: "Guest", priority: "Low", assignedTo: "—", status: "Open", reportedAt: "11:15 AM" },
  { room: "402", issue: "Smoke detector beeping", reportedBy: "Guest", priority: "High", assignedTo: "Mike R.", status: "Resolved", reportedAt: "8:00 AM" },
];

function roomStatusColor(status: string) {
  const map: Record<string, string> = {
    Occupied: "bg-blue-500 text-white",
    Vacant: "bg-green-500 text-white",
    Reserved: "bg-purple-500 text-white",
    "Out of Order": "bg-red-500 text-white",
    Dirty: "bg-yellow-500 text-white",
    Clean: "bg-emerald-500 text-white",
  };
  return map[status] || "bg-gray-300 text-gray-800";
}

function arrivalStatusBadge(status: string) {
  const map: Record<string, string> = {
    Expected: "bg-blue-100 text-blue-800",
    "Checked In": "bg-green-100 text-green-800",
    "No Show": "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function departureStatusBadge(status: string) {
  const map: Record<string, string> = {
    "Due Out": "bg-yellow-100 text-yellow-800",
    "Checked Out": "bg-green-100 text-green-800",
    "Late Checkout": "bg-orange-100 text-orange-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    High: "bg-red-100 text-red-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[priority] || "bg-gray-100 text-gray-800"}>{priority}</Badge>;
}

export default function PropertyManagementPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Property Management System</h1>
          <p className="text-muted-foreground">Manage rooms, guests, arrivals, and departures</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><LogIn className="h-4 w-4 mr-2" />Check In</Button>
          <Button variant="outline"><LogOut className="h-4 w-4 mr-2" />Check Out</Button>
          <Button variant="outline"><ArrowRightLeft className="h-4 w-4 mr-2" />Change Room</Button>
          <Button variant="outline"><Ban className="h-4 w-4 mr-2" />Block Room</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Add Charge</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search guests, rooms..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline"><UserCheck className="h-4 w-4 mr-2" />Assign Room</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="roomgrid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roomgrid">Room Grid</TabsTrigger>
          <TabsTrigger value="arrivals">Arrivals</TabsTrigger>
          <TabsTrigger value="departures">Departures</TabsTrigger>
          <TabsTrigger value="inhouse">In-House Guests</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="roomgrid">
          <Card>
            <CardHeader>
              <CardTitle>Room Status Grid</CardTitle>
              <div className="flex gap-3 flex-wrap mt-2">
                {["Occupied", "Vacant", "Reserved", "Out of Order", "Dirty", "Clean"].map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${roomStatusColor(s)}`} />
                    <span className="text-xs text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {floors.map((floor) => (
                <div key={floor.floor}>
                  <h4 className="text-sm font-medium mb-2">{floor.floor}</h4>
                  <div className="flex gap-2 flex-wrap">
                    {floor.rooms.map((room) => (
                      <div
                        key={room.number}
                        className={`w-14 h-14 rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${roomStatusColor(room.status)}`}
                        title={`Room ${room.number} - ${room.status}`}
                      >
                        {room.number}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arrivals">
          <Card>
            <CardHeader><CardTitle>Today&apos;s Arrivals</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Room #</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>VIP</TableHead>
                    <TableHead>Special Requests</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrivals.map((a) => (
                    <TableRow key={a.guest}>
                      <TableCell className="font-medium">{a.guest}</TableCell>
                      <TableCell>{a.roomType}</TableCell>
                      <TableCell className="font-mono">{a.room}</TableCell>
                      <TableCell>{a.eta}</TableCell>
                      <TableCell>{a.vip ? <Badge className="bg-amber-100 text-amber-800">VIP</Badge> : "—"}</TableCell>
                      <TableCell className="max-w-xs text-sm">{a.specialRequests}</TableCell>
                      <TableCell>{arrivalStatusBadge(a.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departures">
          <Card>
            <CardHeader><CardTitle>Today&apos;s Departures</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Checkout Time</TableHead>
                    <TableHead>Outstanding Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departures.map((d) => (
                    <TableRow key={d.guest}>
                      <TableCell className="font-medium">{d.guest}</TableCell>
                      <TableCell className="font-mono">{d.room}</TableCell>
                      <TableCell>{d.checkoutTime}</TableCell>
                      <TableCell className={d.balance !== "$0.00" ? "text-red-600 font-medium" : ""}>{d.balance}</TableCell>
                      <TableCell>{departureStatusBadge(d.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inhouse">
          <Card>
            <CardHeader><CardTitle>In-House Guests</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Check-in Date</TableHead>
                    <TableHead>Check-out Date</TableHead>
                    <TableHead>Nights</TableHead>
                    <TableHead>VIP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { guest: "Mr. Ahmed Hassan", room: "404", type: "Suite", checkIn: "May 10", checkOut: "May 14", nights: 4, vip: true },
                    { guest: "Mr. James Morrison", room: "106", type: "Standard King", checkIn: "May 10", checkOut: "May 12", nights: 2, vip: false },
                    { guest: "Ms. Claire Dubois", room: "301", type: "Deluxe King", checkIn: "May 8", checkOut: "May 11", nights: 3, vip: false },
                    { guest: "Mr. Wei Zhang", room: "405", type: "Suite", checkIn: "May 7", checkOut: "May 12", nights: 5, vip: true },
                    { guest: "Mrs. Jennifer Cole", room: "203", type: "Standard Twin", checkIn: "May 9", checkOut: "May 11", nights: 2, vip: false },
                  ].map((g) => (
                    <TableRow key={g.guest}>
                      <TableCell className="font-medium">{g.guest}</TableCell>
                      <TableCell className="font-mono">{g.room}</TableCell>
                      <TableCell>{g.type}</TableCell>
                      <TableCell>{g.checkIn}</TableCell>
                      <TableCell>{g.checkOut}</TableCell>
                      <TableCell>{g.nights}</TableCell>
                      <TableCell>{g.vip ? <Badge className="bg-amber-100 text-amber-800">VIP</Badge> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader><CardTitle>Maintenance Requests</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reported At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance.map((m) => (
                    <TableRow key={`${m.room}-${m.issue}`}>
                      <TableCell className="font-mono">{m.room}</TableCell>
                      <TableCell className="font-medium">{m.issue}</TableCell>
                      <TableCell>{m.reportedBy}</TableCell>
                      <TableCell>{priorityBadge(m.priority)}</TableCell>
                      <TableCell>{m.assignedTo}</TableCell>
                      <TableCell><Badge className={m.status === "Resolved" ? "bg-green-100 text-green-800" : m.status === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}>{m.status}</Badge></TableCell>
                      <TableCell>{m.reportedAt}</TableCell>
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
