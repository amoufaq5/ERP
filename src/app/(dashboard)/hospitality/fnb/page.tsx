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
  UtensilsCrossed,
  Users,
  DollarSign,
  Percent,
  Search,
  Plus,
  Edit,
  Power,
  ChefHat,
} from "lucide-react";

// ─── Mock Data ─────────────────────────────────────────────────────────────

const stats = [
  { label: "Today's F&B Revenue", value: "$18,420", icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
  { label: "Covers", value: "234", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Avg Check", value: "$78.72", icon: UtensilsCrossed, color: "text-purple-600", bg: "bg-purple-100" },
  { label: "Food Cost %", value: "28.4%", icon: Percent, color: "text-orange-600", bg: "bg-orange-100" },
];

const outlets = [
  { name: "The Grand Restaurant", type: "Restaurant", status: "Open", covers: 86, revenue: "$8,240" },
  { name: "Skyline Bar", type: "Bar", status: "Open", covers: 52, revenue: "$4,180" },
  { name: "Café Terrace", type: "Café", status: "Open", covers: 64, revenue: "$2,890" },
  { name: "Room Service", type: "Room Service", status: "Open", covers: 28, revenue: "$2,450" },
  { name: "Palm Banquet Hall", type: "Banquet", status: "Closed", covers: 0, revenue: "$0" },
  { name: "Poolside Grill", type: "Restaurant", status: "Open", covers: 4, revenue: "$660" },
];

const menuItems = [
  { item: "Grilled Salmon", category: "Main Course", price: "$32.00", cost: "$9.60", margin: 70, available: true, dietary: "GF" },
  { item: "Caesar Salad", category: "Starter", price: "$16.00", cost: "$3.80", margin: 76, available: true, dietary: "V" },
  { item: "Wagyu Steak 8oz", category: "Main Course", price: "$58.00", cost: "$24.00", margin: 59, available: true, dietary: "GF" },
  { item: "Mushroom Risotto", category: "Main Course", price: "$26.00", cost: "$5.20", margin: 80, available: true, dietary: "V, GF" },
  { item: "Lobster Bisque", category: "Starter", price: "$22.00", cost: "$8.80", margin: 60, available: false, dietary: "GF" },
  { item: "Chocolate Fondant", category: "Dessert", price: "$14.00", cost: "$3.50", margin: 75, available: true, dietary: "V" },
  { item: "Truffle Fries", category: "Side", price: "$12.00", cost: "$2.40", margin: 80, available: true, dietary: "V, GF" },
  { item: "Tuna Tartare", category: "Starter", price: "$24.00", cost: "$10.80", margin: 55, available: true, dietary: "GF" },
  { item: "Panna Cotta", category: "Dessert", price: "$12.00", cost: "$2.50", margin: 79, available: true, dietary: "V, GF" },
  { item: "Club Sandwich", category: "Main Course", price: "$18.00", cost: "$4.50", margin: 75, available: true, dietary: "" },
];

const kitchenOrders = [
  { order: "KO-1042", outlet: "The Grand Restaurant", table: "Table 12", items: "2x Wagyu, 1x Salmon, 2x Caesar", status: "Preparing", time: "12 min" },
  { order: "KO-1041", outlet: "Café Terrace", table: "Table 5", items: "3x Club Sandwich, 2x Truffle Fries", status: "Ready", time: "18 min" },
  { order: "KO-1040", outlet: "Room Service", table: "Room 405", items: "1x Mushroom Risotto, 1x Panna Cotta", status: "Preparing", time: "8 min" },
  { order: "KO-1039", outlet: "The Grand Restaurant", table: "Table 8", items: "1x Tuna Tartare, 1x Wagyu, 1x Fondant", status: "Received", time: "2 min" },
  { order: "KO-1038", outlet: "Skyline Bar", table: "Bar Seat 4", items: "2x Truffle Fries, 1x Caesar", status: "Served", time: "25 min" },
  { order: "KO-1037", outlet: "Room Service", table: "Room 301", items: "2x Club Sandwich, 1x Caesar", status: "Preparing", time: "15 min" },
  { order: "KO-1036", outlet: "Poolside Grill", table: "Lounger 7", items: "1x Grilled Salmon, 1x Truffle Fries", status: "Ready", time: "20 min" },
  { order: "KO-1035", outlet: "The Grand Restaurant", table: "Table 3", items: "4x Set Menu", status: "Served", time: "35 min" },
];

const fnbReservations = [
  { guest: "Mr. Chen", outlet: "The Grand Restaurant", time: "7:00 PM", covers: 4, status: "Confirmed", notes: "Anniversary dinner" },
  { guest: "Ms. Williams", outlet: "The Grand Restaurant", time: "7:30 PM", covers: 2, status: "Confirmed", notes: "Window seat requested" },
  { guest: "Corporate - TechCorp", outlet: "Palm Banquet Hall", time: "12:00 PM", covers: 50, status: "Confirmed", notes: "Lunch meeting, AV setup" },
  { guest: "Mr. Hassan", outlet: "Skyline Bar", time: "9:00 PM", covers: 6, status: "Confirmed", notes: "VIP, reserved section" },
  { guest: "Walk-in Available", outlet: "Café Terrace", time: "All Day", covers: 0, status: "Open", notes: "No reservation needed" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Open: "bg-green-100 text-green-800",
    Closed: "bg-red-100 text-red-800",
    Confirmed: "bg-green-100 text-green-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function orderStatusBadge(status: string) {
  const map: Record<string, string> = {
    Received: "bg-yellow-100 text-yellow-800",
    Preparing: "bg-blue-100 text-blue-800",
    Ready: "bg-green-100 text-green-800",
    Served: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function outletTypeBadge(type: string) {
  const map: Record<string, string> = {
    Restaurant: "bg-blue-100 text-blue-800",
    Bar: "bg-purple-100 text-purple-800",
    Café: "bg-orange-100 text-orange-800",
    "Room Service": "bg-green-100 text-green-800",
    Banquet: "bg-pink-100 text-pink-800",
  };
  return <Badge className={map[type] || "bg-gray-100 text-gray-800"}>{type}</Badge>;
}

export default function FoodBeveragePage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Food & Beverage</h1>
          <p className="text-muted-foreground">Manage outlets, menus, orders, and F&B reservations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Update Menu Item</Button>
          <Button variant="outline"><Power className="h-4 w-4 mr-2" />Open/Close Outlet</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Create Order</Button>
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
          <Input placeholder="Search menu items, orders..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="outlets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
          <TabsTrigger value="menu">Menu Management</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="kitchen">Kitchen Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="outlets">
          <Card>
            <CardHeader><CardTitle>F&B Outlets</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outlet Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Covers Today</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outlets.map((o) => (
                    <TableRow key={o.name}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>{outletTypeBadge(o.type)}</TableCell>
                      <TableCell>{statusBadge(o.status)}</TableCell>
                      <TableCell>{o.covers}</TableCell>
                      <TableCell className="text-right font-medium">{o.revenue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu">
          <Card>
            <CardHeader><CardTitle>Menu Items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Margin %</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Dietary Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.filter((m) => m.item.toLowerCase().includes(search.toLowerCase())).map((m) => (
                    <TableRow key={m.item}>
                      <TableCell className="font-medium">{m.item}</TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell>{m.price}</TableCell>
                      <TableCell>{m.cost}</TableCell>
                      <TableCell className={m.margin >= 70 ? "text-green-600" : m.margin >= 60 ? "text-yellow-600" : "text-red-600"}>{m.margin}%</TableCell>
                      <TableCell>{m.available ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge className="bg-red-100 text-red-800">No</Badge>}</TableCell>
                      <TableCell>{m.dietary ? <span className="text-xs">{m.dietary}</span> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations">
          <Card>
            <CardHeader><CardTitle>F&B Reservations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Covers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fnbReservations.map((r) => (
                    <TableRow key={`${r.guest}-${r.outlet}`}>
                      <TableCell className="font-medium">{r.guest}</TableCell>
                      <TableCell>{r.outlet}</TableCell>
                      <TableCell>{r.time}</TableCell>
                      <TableCell>{r.covers || "—"}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kitchen">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />Kitchen Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Table/Room</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kitchenOrders.map((o) => (
                    <TableRow key={o.order}>
                      <TableCell className="font-mono">{o.order}</TableCell>
                      <TableCell>{o.outlet}</TableCell>
                      <TableCell>{o.table}</TableCell>
                      <TableCell className="max-w-xs text-sm">{o.items}</TableCell>
                      <TableCell>{orderStatusBadge(o.status)}</TableCell>
                      <TableCell>{o.time}</TableCell>
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
