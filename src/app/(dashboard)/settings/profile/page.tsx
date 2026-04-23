"use client"

import { useState, useEffect } from "react"
import {
  User,
  Shield,
  Bell,
  Activity,
  Save,
  Camera,
  Monitor,
  Smartphone,
  MapPin,
  Calendar,
  Mail,
  Building2,
  Lock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface UserData {
  id?: string
  name?: string
  email?: string
  role?: string
  department?: string
  createdAt?: string
  phone?: string
  position?: string
  location?: string
  bio?: string
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  location: string
  bio: string
}

interface NotificationPrefs {
  newMessages: boolean
  taskAssignments: boolean
  reportReady: boolean
  systemUpdates: boolean
  mentions: boolean
  weeklyDigest: boolean
  desktopNotifications: boolean
  mobileNotifications: boolean
}

const departments = [
  "Engineering",
  "Sales",
  "Finance",
  "HR",
  "Operations",
  "Marketing",
  "Legal",
  "IT",
]

const activityLog = [
  { date: "2026-04-04 09:15", action: "Login", description: "Signed in from Chrome on macOS", ip: "192.168.1.42" },
  { date: "2026-04-03 16:30", action: "Report Generated", description: "Exported Q1 2026 Financial Summary", ip: "192.168.1.42" },
  { date: "2026-04-03 11:00", action: "Profile Updated", description: "Changed department to Engineering", ip: "192.168.1.42" },
  { date: "2026-04-02 14:22", action: "Password Changed", description: "Password successfully updated", ip: "192.168.1.38" },
  { date: "2026-04-02 09:05", action: "Login", description: "Signed in from Safari on iPhone", ip: "10.0.0.15" },
  { date: "2026-04-01 17:45", action: "Document Uploaded", description: "Uploaded project-proposal-v3.pdf", ip: "192.168.1.42" },
  { date: "2026-04-01 10:30", action: "Task Completed", description: 'Marked "Database Migration" as done', ip: "192.168.1.42" },
  { date: "2026-03-31 15:10", action: "Settings Changed", description: "Enabled two-factor authentication", ip: "192.168.1.42" },
  { date: "2026-03-31 09:00", action: "Login", description: "Signed in from Chrome on Windows", ip: "172.16.0.5" },
  { date: "2026-03-30 13:55", action: "Report Generated", description: "Exported Inventory Status Report", ip: "192.168.1.42" },
  { date: "2026-03-30 08:45", action: "Login", description: "Signed in from Firefox on Linux", ip: "192.168.1.50" },
  { date: "2026-03-29 16:20", action: "User Invited", description: "Sent invitation to new-hire@enterprise.com", ip: "192.168.1.42" },
]

const sessions = [
  { device: "Chrome on macOS", location: "San Francisco, CA", lastActive: "Active now", current: true, icon: Monitor },
  { device: "Safari on iPhone 15", location: "San Francisco, CA", lastActive: "2 hours ago", current: false, icon: Smartphone },
  { device: "Chrome on Windows", location: "New York, NY", lastActive: "3 days ago", current: false, icon: Monitor },
]

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    location: "",
    bio: "",
  })
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    newMessages: true,
    taskAssignments: true,
    reportReady: false,
    systemUpdates: true,
    mentions: true,
    weeklyDigest: false,
    desktopNotifications: true,
    mobileNotifications: false,
  })
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activityPage, setActivityPage] = useState(1)
  const activityPerPage = 8

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user")
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        const nameParts = (parsed.name || "").split(" ")
        setFormData({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: parsed.email || "",
          phone: parsed.phone || "",
          department: parsed.department || "",
          position: parsed.position || "",
          location: parsed.location || "",
          bio: parsed.bio || "",
        })
        if (parsed.twoFactorEnabled !== undefined) {
          setTwoFactorEnabled(parsed.twoFactorEnabled)
        }
      }
    } catch {
      // silently handle parse errors
    }
  }, [])

  const handleSaveProfile = () => {
    const updatedUser: UserData = {
      ...user,
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      position: formData.position,
      location: formData.location,
      bio: formData.bio,
    }
    setUser(updatedUser)
    localStorage.setItem("user", JSON.stringify(updatedUser))
    window.dispatchEvent(new Event("storage"))
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleSaveNotifications = () => {
    const updatedUser = { ...user, notifications }
    localStorage.setItem("user", JSON.stringify(updatedUser))
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "January 2024"

  const displayName = user?.name || "User"
  const displayRole = user?.role || "Employee"
  const displayEmail = user?.email || "user@enterprise.com"
  const displayDepartment = user?.department || formData.department || "Not set"

  const totalActivityPages = Math.ceil(activityLog.length / activityPerPage)
  const paginatedActivity = activityLog.slice(
    (activityPage - 1) * activityPerPage,
    activityPage * activityPerPage
  )

  const roleColorMap: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    MANAGER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    EMPLOYEE: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  }

  const actionColorMap: Record<string, string> = {
    Login: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Password Changed": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    "Profile Updated": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "Report Generated": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    "Document Uploaded": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    "Task Completed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Settings Changed": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    "User Invited": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  }

  return (
    <div className="space-y-6 p-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-3xl font-bold text-white shadow-lg">
                {getInitials(displayName)}
              </div>
              <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground shadow-sm transition-colors hover:bg-muted/80">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <Badge
                  className={
                    roleColorMap[displayRole.toUpperCase()] ||
                    "bg-gray-100 text-gray-800"
                  }
                  variant="secondary"
                >
                  {displayRole}
                </Badge>
              </div>
              <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {displayEmail}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {displayDepartment}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal Info</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and profile information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Enter last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position / Title</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    placeholder="e.g. Senior Engineer"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    placeholder="Write a short bio about yourself..."
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleSaveProfile}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Changes saved successfully
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Ensure your account stays secure by using a strong password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords({ ...passwords, current: e.target.value })
                    }
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwords.new}
                    onChange={(e) =>
                      setPasswords({ ...passwords, new: e.target.value })
                    }
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirm: e.target.value })
                    }
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <Button>
                <Lock className="mr-2 h-4 w-4" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {twoFactorEnabled ? "2FA is enabled" : "2FA is disabled"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {twoFactorEnabled
                      ? "Your account is protected with two-factor authentication."
                      : "Enable two-factor authentication for enhanced security."}
                  </p>
                </div>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    twoFactorEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  role="switch"
                  aria-checked={twoFactorEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                      twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage your active sessions across devices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessions.map((session, idx) => {
                const Icon = session.icon
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {session.device}
                          {session.current && (
                            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Current
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <MapPin className="mr-1 inline h-3 w-3" />
                          {session.location} &middot; {session.lastActive}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <Button variant="destructive" className="mt-2">
                <LogOut className="mr-2 h-4 w-4" />
                Revoke All Sessions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how and when you want to be notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Email Notifications */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Notifications
                </h3>
                <div className="space-y-3">
                  {[
                    { key: "newMessages" as const, label: "New Messages", desc: "Get notified when you receive a new message" },
                    { key: "taskAssignments" as const, label: "Task Assignments", desc: "Get notified when a task is assigned to you" },
                    { key: "reportReady" as const, label: "Report Ready", desc: "Get notified when a requested report is generated" },
                    { key: "systemUpdates" as const, label: "System Updates", desc: "Receive important system update notifications" },
                    { key: "mentions" as const, label: "Mentions", desc: "Get notified when someone mentions you" },
                    { key: "weeklyDigest" as const, label: "Weekly Digest", desc: "Receive a weekly summary of your activity" },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            [item.key]: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Push Notifications */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Push Notifications
                </h3>
                <div className="space-y-3">
                  {[
                    { key: "desktopNotifications" as const, label: "Desktop Notifications", desc: "Show notifications on your desktop browser", icon: Monitor },
                    { key: "mobileNotifications" as const, label: "Mobile Notifications", desc: "Send push notifications to your mobile device", icon: Smartphone },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <label
                        key={item.key}
                        className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications[item.key]}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>

              <Button onClick={handleSaveNotifications}>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                A log of your recent account activity and actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Action</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Description</th>
                      <th className="pb-3 font-medium text-muted-foreground">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedActivity.map((entry, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                          {entry.date}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="secondary"
                            className={
                              actionColorMap[entry.action] ||
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            {entry.action}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">{entry.description}</td>
                        <td className="py-3 font-mono text-xs text-muted-foreground">
                          {entry.ip}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(activityPage - 1) * activityPerPage + 1} to{" "}
                  {Math.min(activityPage * activityPerPage, activityLog.length)} of{" "}
                  {activityLog.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activityPage === 1}
                    onClick={() => setActivityPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalActivityPages }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={activityPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivityPage(i + 1)}
                      className="h-8 w-8 p-0"
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activityPage === totalActivityPages}
                    onClick={() => setActivityPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}