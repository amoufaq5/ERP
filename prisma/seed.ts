import { PrismaClient } from "@prisma/client"
import { hashSync } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Users
  const admin = await prisma.user.create({
    data: { name: "Admin User", email: "admin@enterprise.com", passwordHash: hashSync("admin123", 10), role: "ADMIN", department: "Management" },
  })
  const manager = await prisma.user.create({
    data: { name: "Sarah Johnson", email: "manager@enterprise.com", passwordHash: hashSync("manager123", 10), role: "MANAGER", department: "Sales" },
  })
  const employee = await prisma.user.create({
    data: { name: "John Smith", email: "user@enterprise.com", passwordHash: hashSync("user123", 10), role: "EMPLOYEE", department: "Engineering" },
  })

  // API Tokens
  await prisma.apiToken.create({
    data: { userId: admin.id, name: "Production API", token: "sk-prod-ent-xxxx-1234", permissions: '["read","write"]', isActive: true },
  })

  // System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: "company_name", value: "Enterprise Suite Inc.", category: "general" },
      { key: "currency", value: "USD", category: "general" },
      { key: "timezone", value: "America/Los_Angeles", category: "general" },
      { key: "ai_provider", value: "openai", category: "ai" },
    ],
  })

  // Departments
  const eng = await prisma.department.create({ data: { name: "Engineering", managerId: employee.id, budget: 2400000 } })
  const sales = await prisma.department.create({ data: { name: "Sales", managerId: manager.id, budget: 1200000 } })
  const hr = await prisma.department.create({ data: { name: "Human Resources", managerId: admin.id, budget: 400000 } })
  const fin = await prisma.department.create({ data: { name: "Finance", managerId: admin.id, budget: 600000 } })

  // Employees
  const emp1 = await prisma.employee.create({ data: { userId: employee.id, employeeNumber: "EMP001", firstName: "John", lastName: "Smith", email: "john@enterprise.com", departmentId: eng.id, position: "Senior Developer", hireDate: new Date("2022-03-15"), salary: 95000, status: "ACTIVE" } })
  const emp2 = await prisma.employee.create({ data: { userId: manager.id, employeeNumber: "EMP002", firstName: "Sarah", lastName: "Johnson", email: "sarah@enterprise.com", departmentId: sales.id, position: "Sales Manager", hireDate: new Date("2021-06-01"), salary: 85000, status: "ACTIVE" } })
  const emp3 = await prisma.employee.create({ data: { employeeNumber: "EMP003", firstName: "Michael", lastName: "Chen", email: "michael@enterprise.com", departmentId: fin.id, position: "Financial Analyst", hireDate: new Date("2023-01-10"), salary: 75000, status: "ACTIVE" } })

  // Chart of Accounts
  await prisma.chartOfAccount.createMany({
    data: [
      { code: "1000", name: "Cash", type: "ASSET", balance: 500000 },
      { code: "1100", name: "Accounts Receivable", type: "ASSET", balance: 245000 },
      { code: "2000", name: "Accounts Payable", type: "LIABILITY", balance: 125000 },
      { code: "3000", name: "Owner Equity", type: "EQUITY", balance: 800000 },
      { code: "4000", name: "Sales Revenue", type: "REVENUE", balance: 2845000 },
      { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", balance: 1200000 },
      { code: "5100", name: "Salaries Expense", type: "EXPENSE", balance: 680000 },
      { code: "5200", name: "Rent Expense", type: "EXPENSE", balance: 120000 },
    ],
  })

  // Accounts (CRM)
  const acme = await prisma.account.create({ data: { name: "Acme Corporation", industry: "Technology", website: "https://acme.com", phone: "(555) 100-2000", email: "info@acme.com", type: "CUSTOMER", city: "San Francisco", country: "USA", annualRevenue: 5000000, employeeCount: 250, ownerId: manager.id, latitude: 37.7749, longitude: -122.4194 } })
  const globex = await prisma.account.create({ data: { name: "Globex Industries", industry: "Manufacturing", phone: "(555) 200-3000", type: "CUSTOMER", city: "Chicago", country: "USA", annualRevenue: 12000000, employeeCount: 800, ownerId: manager.id, latitude: 41.8781, longitude: -87.6298 } })
  const wayne = await prisma.account.create({ data: { name: "Wayne Enterprises", industry: "Defense", phone: "(555) 300-4000", type: "PROSPECT", city: "New York", country: "USA", annualRevenue: 50000000, employeeCount: 5000, ownerId: admin.id, latitude: 40.7128, longitude: -74.006 } })

  // Contacts
  await prisma.contact.createMany({
    data: [
      { firstName: "Alice", lastName: "Williams", email: "alice@acme.com", phone: "(555) 100-2001", title: "CTO", accountId: acme.id, ownerId: manager.id },
      { firstName: "Bob", lastName: "Brown", email: "bob@globex.com", phone: "(555) 200-3001", title: "Procurement Director", accountId: globex.id, ownerId: manager.id },
      { firstName: "Carol", lastName: "White", email: "carol@wayne.com", phone: "(555) 300-4001", title: "VP Operations", accountId: wayne.id, ownerId: admin.id },
    ],
  })

  // Suppliers
  const supplier1 = await prisma.supplier.create({ data: { name: "TechParts Inc.", email: "orders@techparts.com", phone: "(555) 500-1000", city: "Austin", country: "USA", status: "ACTIVE", rating: 4.5, paymentTerms: "Net 30" } })
  const supplier2 = await prisma.supplier.create({ data: { name: "Global Materials Co.", email: "sales@globalmaterials.com", phone: "(555) 500-2000", city: "Detroit", country: "USA", status: "ACTIVE", rating: 4.0, paymentTerms: "Net 45" } })

  // Products
  const prod1 = await prisma.product.create({ data: { sku: "WK-2000", name: "Wireless Keyboard", category: "Electronics", unitPrice: 79.99, costPrice: 35.00, quantity: 500, reorderLevel: 50, status: "ACTIVE" } })
  const prod2 = await prisma.product.create({ data: { sku: "MON-27X", name: "27\" LED Monitor", category: "Electronics", unitPrice: 349.99, costPrice: 180.00, quantity: 120, reorderLevel: 20, status: "ACTIVE" } })
  const prod3 = await prisma.product.create({ data: { sku: "EM-500", name: "Ergonomic Mouse", category: "Electronics", unitPrice: 49.99, costPrice: 18.00, quantity: 800, reorderLevel: 100, status: "ACTIVE" } })

  // Invoices
  await prisma.invoice.create({
    data: { invoiceNumber: "INV-2024-001", customerId: acme.id, date: new Date("2024-03-01"), dueDate: new Date("2024-03-31"), status: "PAID", subtotal: 15000, tax: 1350, total: 16350, items: { create: [{ description: "Consulting Services - March", quantity: 1, unitPrice: 15000, total: 15000 }] } },
  })
  await prisma.invoice.create({
    data: { invoiceNumber: "INV-2024-002", customerId: globex.id, date: new Date("2024-03-15"), dueDate: new Date("2024-04-15"), status: "SENT", subtotal: 25000, tax: 2250, total: 27250, items: { create: [{ description: "Product Supply - Q1", quantity: 100, unitPrice: 250, total: 25000 }] } },
  })

  // Leads
  await prisma.lead.createMany({
    data: [
      { firstName: "Tom", lastName: "Harris", email: "tom@startup.io", company: "StartupIO", source: "WEB", status: "NEW", score: 72, value: 50000, assignedToId: manager.id },
      { firstName: "Jane", lastName: "Cooper", email: "jane@techfirm.com", company: "TechFirm LLC", source: "REFERRAL", status: "QUALIFIED", score: 88, value: 120000, assignedToId: manager.id },
      { firstName: "Mike", lastName: "Ross", email: "mike@bigco.com", company: "BigCo Inc", source: "EVENT", status: "CONTACTED", score: 65, value: 75000, assignedToId: admin.id },
    ],
  })

  // Opportunities
  await prisma.opportunity.createMany({
    data: [
      { title: "Acme Enterprise License", accountId: acme.id, stage: "PROPOSAL", value: 150000, probability: 70, assignedToId: manager.id, expectedCloseDate: new Date("2024-04-30") },
      { title: "Globex Equipment Supply", accountId: globex.id, stage: "NEGOTIATION", value: 280000, probability: 60, assignedToId: manager.id, expectedCloseDate: new Date("2024-05-15") },
      { title: "Wayne Security Upgrade", accountId: wayne.id, stage: "PROSPECTING", value: 500000, probability: 20, assignedToId: admin.id, expectedCloseDate: new Date("2024-06-30") },
    ],
  })

  // Tickets
  await prisma.ticket.createMany({
    data: [
      { ticketNumber: "TK-001", subject: "Login issues after update", description: "Cannot access dashboard", accountId: acme.id, status: "OPEN", priority: "HIGH", assignedToId: employee.id, category: "Technical" },
      { ticketNumber: "TK-002", subject: "Invoice discrepancy", description: "Amount doesn't match PO", accountId: globex.id, status: "IN_PROGRESS", priority: "MEDIUM", assignedToId: admin.id, category: "Billing" },
    ],
  })

  // Campaigns
  await prisma.campaign.createMany({
    data: [
      { name: "Spring Product Launch", type: "EMAIL", status: "ACTIVE", budget: 15000, spent: 8500, leads: 245, conversions: 32, ownerId: manager.id, startDate: new Date("2024-03-01"), endDate: new Date("2024-04-30") },
      { name: "Tech Conference 2024", type: "EVENT", status: "SCHEDULED", budget: 50000, spent: 12000, leads: 0, conversions: 0, ownerId: admin.id, startDate: new Date("2024-05-15"), endDate: new Date("2024-05-17") },
    ],
  })

  // Projects
  const proj = await prisma.project.create({ data: { name: "ERP System v2.0", description: "Major platform upgrade", managerId: employee.id, status: "ACTIVE", startDate: new Date("2024-01-15"), endDate: new Date("2024-06-30"), budget: 250000, spent: 85000, progress: 35 } })
  await prisma.projectTask.createMany({
    data: [
      { projectId: proj.id, title: "Database migration", assigneeId: employee.id, status: "DONE", priority: "HIGH", dueDate: new Date("2024-02-28"), estimatedHours: 40, actualHours: 38 },
      { projectId: proj.id, title: "API redesign", assigneeId: employee.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: new Date("2024-04-15"), estimatedHours: 80, actualHours: 32 },
      { projectId: proj.id, title: "Frontend rebuild", status: "TODO", priority: "MEDIUM", dueDate: new Date("2024-05-30"), estimatedHours: 120 },
    ],
  })

  // Jobs
  const job1 = await prisma.job.create({ data: { title: "Senior Full Stack Developer", departmentId: eng.id, location: "San Francisco, CA", type: "FULL_TIME", status: "OPEN", description: "We are looking for an experienced full stack developer", requirements: "5+ years React, Node.js, PostgreSQL", salaryMin: 120000, salaryMax: 160000, postedDate: new Date("2024-03-01"), hiringManagerId: employee.id } })
  const job2 = await prisma.job.create({ data: { title: "Sales Development Representative", departmentId: sales.id, location: "Remote", type: "FULL_TIME", status: "OPEN", description: "Join our growing sales team", requirements: "2+ years B2B sales", salaryMin: 55000, salaryMax: 75000, postedDate: new Date("2024-03-10"), hiringManagerId: manager.id } })

  // Candidates
  const cand1 = await prisma.candidate.create({ data: { firstName: "Emily", lastName: "Chen", email: "emily.chen@email.com", phone: "(555) 600-1001", source: "LINKEDIN", status: "INTERVIEW", currentCompany: "Google", currentTitle: "Software Engineer", expectedSalary: 145000, rating: 4 } })
  const cand2 = await prisma.candidate.create({ data: { firstName: "James", lastName: "Park", email: "james.park@email.com", phone: "(555) 600-1002", source: "REFERRAL", status: "SCREENING", currentCompany: "Salesforce", currentTitle: "SDR", expectedSalary: 65000, rating: 3 } })

  // Applications
  const app1 = await prisma.application.create({ data: { candidateId: cand1.id, jobId: job1.id, status: "INTERVIEW", coverLetter: "I am excited to apply...", score: 88 } })
  await prisma.application.create({ data: { candidateId: cand2.id, jobId: job2.id, status: "SCREENING", score: 72 } })

  // Interviews
  await prisma.interview.create({ data: { applicationId: app1.id, interviewerIds: employee.id, scheduledDate: new Date("2024-04-01T14:00:00"), duration: 60, type: "VIDEO", status: "SCHEDULED" } })

  // Workflows
  await prisma.workflow.createMany({
    data: [
      { name: "Auto-assign new leads", module: "CRM", triggerType: "RECORD_CREATE", triggerConfig: '{"entity":"Lead"}', conditions: '{"source":["WEB","SOCIAL"]}', actions: '{"type":"ASSIGN","to":"round_robin"}', isActive: true, createdById: admin.id, runCount: 342 },
      { name: "Invoice overdue reminder", module: "ERP", triggerType: "SCHEDULE", triggerConfig: '{"cron":"0 9 * * *"}', conditions: '{"status":"SENT","daysOverdue":7}', actions: '{"type":"EMAIL","template":"overdue_reminder"}', isActive: true, createdById: admin.id, runCount: 156 },
      { name: "Low stock alert", module: "ERP", triggerType: "FIELD_CHANGE", triggerConfig: '{"entity":"Product","field":"quantity"}', conditions: '{"quantity_below":"reorderLevel"}', actions: '{"type":"NOTIFY","to":"procurement_team"}', isActive: true, createdById: admin.id, runCount: 412 },
    ],
  })

  // Loyalty
  const loyaltyProg = await prisma.loyaltyProgram.create({ data: { name: "Enterprise Rewards", description: "Earn points on every purchase", pointsPerDollar: 10, redemptionRate: 0.01, status: "ACTIVE" } })
  await prisma.loyaltyMember.create({ data: { programId: loyaltyProg.id, accountId: acme.id, points: 15000, tier: "GOLD" } })

  // Territories
  await prisma.territory.createMany({
    data: [
      { name: "West Coast", description: "CA, OR, WA", assignedToId: manager.id, color: "#3b82f6" },
      { name: "East Coast", description: "NY, NJ, CT, MA", assignedToId: admin.id, color: "#10b981" },
    ],
  })

  // Training Courses
  const course = await prisma.trainingCourse.create({ data: { title: "Security Awareness", description: "Annual security training", category: "Compliance", duration: "2 hours", format: "ONLINE", status: "PUBLISHED" } })
  await prisma.trainingEnrollment.create({ data: { courseId: course.id, employeeId: emp1.id, status: "COMPLETED", completedDate: new Date("2024-03-15"), score: 92 } })

  console.log("Seeding completed!")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
