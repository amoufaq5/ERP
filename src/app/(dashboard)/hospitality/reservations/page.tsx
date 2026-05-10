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
  CalendarDays,
  BookOpen,
  TrendingUp,
  XCircle,
  Search,
  Plus,
  Edit,
  Mail,
  Users,
} from "lucide-react";

// ─── Mock Data ─────────────────────────────────────────────────────────────

const stats = [
  { label: "Reservations Today", value: "38", icon: BookOpen, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "This Week", value: "214", icon: CalendarDays, color: "text-green-600", bg: "bg-green-100" },
  { label: "Occupancy Forecast", value: "91.2%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
  { label: "Cancellations", value: "7", icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
];

const reservations = [
  { confirmation: "CNF-20261001", guest: "Mr. Robert Chen", roomType: "Deluxe King", arrival: "May 10, 2026", departure: "May 13, 2026", nights: 3, rate: "$220/night", source: "Direct", status: "Confirmed" },
  { confirmation: "CNF-20261002", guest: "Ms. Sarah Williams", roomType: "Standard Twin", arrival: "May 10, 2026", departure: "May 12, 2026", nights: 2, rate: "$150/night", source: "OTA", status: "Confirmed" },
  { confirmation: "CNF-20261003", guest: "Dr. Elena Volkov", roomType: "Suite", arrival: "May 10, 2026", departure: "May 15, 2026", nights: 5, rate: "$420/night", source: "Corporate", status: "Confirmed" },
  { confirmation: "CNF-20261004", guest: "Mr. Carlos Reyes", roomType: "Standard Twin", arrival: "May 10, 2026", departure: "May 11, 2026", nights: 1, rate: "$150/night", source: "Travel Agent", status: "Confirmed" },
  { confirmation: "CNF-20261005", guest: "Ms. Priya Sharma", roomType: "Deluxe King", arrival: "May 10, 2026", departure: "May 12, 2026", nights: 2, rate: "$220/night", source: "OTA", status: "No Show" },
  { confirmation: "CNF-20261006", guest: "Mr. Thomas Lee", roomType: "Standard King", arrival: "May 11, 2026", departure: "May 14, 2026", nights: 3, rate: "$180/night", source: "Direct", status: "Confirmed" },
  { confirmation: "CNF-20261007", guest: "Mrs. Angela Foster", roomType: "Suite", arrival: "May 12, 2026", departure: "May 16, 2026", nights: 4, rate: "$420/night", source: "Corporate", status: "Tentative" },
  { confirmation: "CNF-20261008", guest: "Mr. Kevin Brown", roomType: "Standard Twin", arrival: "May 11, 2026", departure: "May 13, 2026", nights: 2, rate: "$150/night", source: "OTA", status: "Cancelled" },
  { confirmation: "CNF-20261009", guest: "Ms. Yuki Tanaka", roomType: "Deluxe King", arrival: "May 13, 2026", departure: "May 17, 2026", nights: 4, rate: "$220/night", source: "Travel Agent", status: "Confirmed" },
  { confirmation: "CNF-20261010", guest: "Mr. Martin Schmidt", roomType: "Standard King", arrival: "May 14, 2026", departure: "May 16, 2026", nights: 2, rate: "$180/night", source: "Direct", status: "Confirmed" },
];

const groupBookings = [
  { group: "TechCorp Annual Meeting", contact: "Jane Smith", rooms: 25, arrival: "May 18, 2026", departure: "May 21, 2026", totalValue: "$45,000", status: "Confirmed" },
  { group: "Williams Wedding Party", contact: "John Williams", rooms: 15, arrival: "May 22, 2026", departure: "May 24, 2026", totalValue: "$22,500", status: "Confirmed" },
  { group: "Medical Conference 2026", contact: "Dr. Patel", rooms: 40, arrival: "Jun 1, 2026", departure: "Jun 4, 2026", totalValue: "$96,000", status: "Tentative" },
  { group: "Sports Team - Nationals", contact: "Coach Rivera", rooms: 20, arrival: "May 25, 2026", departure: "May 28, 2026", totalValue: "$36,000", status: "Confirmed" },
  { group: "University Alumni Reunion", contact: "Alumni Office", rooms: 30, arrival: "Jun 10, 2026", departure: "Jun 12, 2026", totalValue: "$54,000", status: "Tentative" },
];

const waitlist = [
  { guest: "Mr. Ivan Petrov", roomType: "Suite", requestedDates: "May 10-13", priority: 1, addedDate: "May 2, 2026", notes: "VIP return guest" },
  { guest: "Ms. Rachel Green", roomType: "Deluxe King", requestedDates: "May 11-14", priority: 2, addedDate: "May 4, 2026", notes: "Corporate account" },
  { guest: "Mr. Sam Taylor", roomType: "Suite", requestedDates: "May 12-15", priority: 3, addedDate: "May 5, 2026", notes: "Anniversary celebration" },
  { guest: "Mrs. Linda Park", roomType: "Deluxe King", requestedDates: "May 10-12", priority: 4, addedDate: "May 6, 2026", notes: "Flexible on dates" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Confirmed: "bg-green-100 text-green-800",
    Tentative: "bg-yellow-100 text-yellow-800",
    Cancelled: "bg-red-100 text-red-800",
    "No Show": "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function sourceBadge(source: string) {
  const map: Record<string, string> = {
    Direct: "bg-blue-100 text-blue-800",
    OTA: "bg-purple-100 text-purple-800",
    Corporate: "bg-green-100 text-green-800",
    "Travel Agent": "bg-orange-100 text-orange-800",
  };
  return <Badge className={map[source] || "bg-gray-100 text-gray-800"}>{source}</Badge>;
}

export default function ReservationsPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reservations</h1>
          <p className="text-muted-foreground">Manage bookings, group reservations, and availability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Modify</Button>
          <Button variant="outline"><XCircle className="h-4 w-4 mr-2" />Cancel</Button>
          <Button variant="outline"><Mail className="h-4 w-4 mr-2" />Send Confirmation</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Create Reservation</Button>
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
          <Input placeholder="Search reservations, guests..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">Reservations List</TabsTrigger>
          <TabsTrigger value="groups">Group Bookings</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader><CardTitle>Occupancy Calendar</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-center text-sm font-medium text-muted-foreground p-2">{d}</div>
                ))}
                {Array.from({ length: 28 }, (_, i) => {
                  const day = i + 1;
                  const occupancy = Math.floor(Math.random() * 30 + 70);
                  const bgColor = occupancy >= 95 ? "bg-red-100 border-red-300" : occupancy >= 85 ? "bg-yellow-100 border-yellow-300" : "bg-green-100 border-green-300";
                  return (
                    <div key={day} className={`p-2 rounded border text-center ${bgColor}`}>
                      <div className="text-sm font-medium">May {day}</div>
                      <div className="text-xs text-muted-foreground">{occupancy}%</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader><CardTitle>All Reservations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Confirmation #</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Nights</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.filter((r) => r.guest.toLowerCase().includes(search.toLowerCase()) || r.confirmation.toLowerCase().includes(search.toLowerCase())).map((r) => (
                    <TableRow key={r.confirmation}>
                      <TableCell className="font-mono">{r.confirmation}</TableCell>
                      <TableCell className="font-medium">{r.guest}</TableCell>
                      <TableCell>{r.roomType}</TableCell>
                      <TableCell>{r.arrival}</TableCell>
                      <TableCell>{r.departure}</TableCell>
                      <TableCell>{r.nights}</TableCell>
                      <TableCell>{r.rate}</TableCell>
                      <TableCell>{sourceBadge(r.source)}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader><CardTitle>Group Bookings</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Rooms</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupBookings.map((g) => (
                    <TableRow key={g.group}>
                      <TableCell className="font-medium">{g.group}</TableCell>
                      <TableCell>{g.contact}</TableCell>
                      <TableCell>{g.rooms}</TableCell>
                      <TableCell>{g.arrival}</TableCell>
                      <TableCell>{g.departure}</TableCell>
                      <TableCell className="font-medium">{g.totalValue}</TableCell>
                      <TableCell>{statusBadge(g.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waitlist">
          <Card>
            <CardHeader><CardTitle>Waitlist</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Requested Dates</TableHead>
                    <TableHead>Added Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitlist.map((w) => (
                    <TableRow key={w.guest}>
                      <TableCell><Badge className="bg-blue-100 text-blue-800">#{w.priority}</Badge></TableCell>
                      <TableCell className="font-medium">{w.guest}</TableCell>
                      <TableCell>{w.roomType}</TableCell>
                      <TableCell>{w.requestedDates}</TableCell>
                      <TableCell>{w.addedDate}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.notes}</TableCell>
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
