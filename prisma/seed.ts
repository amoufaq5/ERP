// @ts-nocheck
import { PrismaClient } from "@prisma/client"
import { hashSync } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding Egyptian Pharma ERP database...")

  // ─── Users ──────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@pharmaerp.eg" },
    update: {},
    create: { name: "Ahmed Hassan", email: "admin@pharmaerp.eg", passwordHash: hashSync("admin123", 10), role: "ADMIN", department: "Management" },
  })
  const manager = await prisma.user.upsert({
    where: { email: "sarah@pharmaerp.eg" },
    update: {},
    create: { name: "Sara El-Masry", email: "sarah@pharmaerp.eg", passwordHash: hashSync("manager123", 10), role: "MANAGER", department: "Commercial" },
  })
  const employee = await prisma.user.upsert({
    where: { email: "omar@pharmaerp.eg" },
    update: {},
    create: { name: "Omar Farouk", email: "omar@pharmaerp.eg", passwordHash: hashSync("user123", 10), role: "EMPLOYEE", department: "Supply Chain" },
  })
  const medRep1 = await prisma.user.upsert({
    where: { email: "mona@pharmaerp.eg" },
    update: {},
    create: { name: "Mona Abdel-Nour", email: "mona@pharmaerp.eg", passwordHash: hashSync("user123", 10), role: "EMPLOYEE", department: "Medical Affairs" },
  })
  const medRep2 = await prisma.user.upsert({
    where: { email: "khaled@pharmaerp.eg" },
    update: {},
    create: { name: "Khaled Mansour", email: "khaled@pharmaerp.eg", passwordHash: hashSync("user123", 10), role: "EMPLOYEE", department: "Sales" },
  })
  const bum = await prisma.user.upsert({
    where: { email: "nadia@pharmaerp.eg" },
    update: {},
    create: { name: "Nadia Rizk", email: "nadia@pharmaerp.eg", passwordHash: hashSync("bum123", 10), role: "MANAGER", department: "Commercial" },
  })

  // ─── API Tokens ─────────────────────────────────────────────────────
  await prisma.apiToken.upsert({
    where: { token: "sk-pharma-prod-xxxx-1234" },
    update: {},
    create: { userId: admin.id, name: "Production API", token: "sk-pharma-prod-xxxx-1234", permissions: '["read","write"]', isActive: true },
  })

  // ─── System Settings ────────────────────────────────────────────────
  const settings = [
    { key: "company_name", value: "PharmaFlow ERP", category: "general" },
    { key: "currency", value: "EGP", category: "general" },
    { key: "timezone", value: "Africa/Cairo", category: "general" },
    { key: "country", value: "Egypt", category: "general" },
    { key: "tax_rate", value: "14", category: "finance" },
    { key: "fiscal_year_start", value: "07-01", category: "finance" },
  ]
  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }

  // ─── Departments ────────────────────────────────────────────────────
  const commercial = await prisma.department.create({ data: { name: "Commercial", managerId: manager.id, budget: 8500000, description: "Sales and marketing operations" } })
  const medAffairs = await prisma.department.create({ data: { name: "Medical Affairs", managerId: medRep1.id, budget: 3200000, description: "Medical information and pharmacovigilance" } })
  const regulatory = await prisma.department.create({ data: { name: "Regulatory Affairs", managerId: admin.id, budget: 1800000, description: "Drug registration and compliance" } })
  const qa = await prisma.department.create({ data: { name: "Quality Assurance", managerId: admin.id, budget: 2400000, description: "GMP compliance and quality control" } })
  const supplyChain = await prisma.department.create({ data: { name: "Supply Chain", managerId: employee.id, budget: 5600000, description: "Procurement, warehousing, distribution" } })
  const rnd = await prisma.department.create({ data: { name: "Research & Development", managerId: admin.id, budget: 6000000, description: "Drug development and formulation" } })
  const hr = await prisma.department.create({ data: { name: "Human Resources", managerId: admin.id, budget: 1200000, description: "People management and development" } })
  const finance = await prisma.department.create({ data: { name: "Finance", managerId: admin.id, budget: 1500000, description: "Accounting and financial planning" } })

  // ─── Employees ──────────────────────────────────────────────────────
  const emp1 = await prisma.employee.create({ data: { userId: admin.id, employeeNumber: "EMP001", firstName: "Ahmed", lastName: "Hassan", email: "ahmed@pharmaerp.eg", departmentId: commercial.id, position: "General Manager", hireDate: new Date("2019-01-15"), salary: 85000, status: "ACTIVE" } })
  const emp2 = await prisma.employee.create({ data: { userId: manager.id, employeeNumber: "EMP002", firstName: "Sara", lastName: "El-Masry", email: "sara@pharmaerp.eg", departmentId: commercial.id, position: "Sales Director", hireDate: new Date("2019-06-01"), salary: 65000, status: "ACTIVE" } })
  const emp3 = await prisma.employee.create({ data: { userId: employee.id, employeeNumber: "EMP003", firstName: "Omar", lastName: "Farouk", email: "omar@pharmaerp.eg", departmentId: supplyChain.id, position: "Supply Chain Manager", hireDate: new Date("2020-03-10"), salary: 55000, status: "ACTIVE" } })
  const emp4 = await prisma.employee.create({ data: { userId: medRep1.id, employeeNumber: "EMP004", firstName: "Mona", lastName: "Abdel-Nour", email: "mona@pharmaerp.eg", departmentId: medAffairs.id, position: "Medical Representative", hireDate: new Date("2021-01-15"), salary: 25000, status: "ACTIVE" } })
  const emp5 = await prisma.employee.create({ data: { userId: medRep2.id, employeeNumber: "EMP005", firstName: "Khaled", lastName: "Mansour", email: "khaled@pharmaerp.eg", departmentId: commercial.id, position: "Senior Medical Rep", hireDate: new Date("2020-09-01"), salary: 30000, status: "ACTIVE" } })
  const emp6 = await prisma.employee.create({ data: { userId: bum.id, employeeNumber: "EMP006", firstName: "Nadia", lastName: "Rizk", email: "nadia@pharmaerp.eg", departmentId: commercial.id, position: "Business Unit Manager", hireDate: new Date("2018-04-01"), salary: 72000, status: "ACTIVE" } })
  const emp7 = await prisma.employee.create({ data: { employeeNumber: "EMP007", firstName: "Youssef", lastName: "Gamal", email: "youssef@pharmaerp.eg", departmentId: qa.id, position: "QA Specialist", hireDate: new Date("2022-02-01"), salary: 28000, status: "ACTIVE" } })
  const emp8 = await prisma.employee.create({ data: { employeeNumber: "EMP008", firstName: "Fatma", lastName: "Ali", email: "fatma@pharmaerp.eg", departmentId: regulatory.id, position: "Regulatory Specialist", hireDate: new Date("2021-08-15"), salary: 32000, status: "ACTIVE" } })
  const emp9 = await prisma.employee.create({ data: { employeeNumber: "EMP009", firstName: "Tarek", lastName: "Ibrahim", email: "tarek@pharmaerp.eg", departmentId: rnd.id, position: "R&D Scientist", hireDate: new Date("2020-11-01"), salary: 42000, status: "ACTIVE" } })
  const emp10 = await prisma.employee.create({ data: { employeeNumber: "EMP010", firstName: "Laila", lastName: "Mahmoud", email: "laila@pharmaerp.eg", departmentId: finance.id, position: "Financial Analyst", hireDate: new Date("2022-06-01"), salary: 35000, status: "ACTIVE" } })

  // ─── Chart of Accounts (EGP) ───────────────────────────────────────
  await prisma.chartOfAccount.createMany({
    data: [
      { code: "1000", name: "Cash & Bank", type: "ASSET", balance: 12500000 },
      { code: "1100", name: "Accounts Receivable", type: "ASSET", balance: 8750000 },
      { code: "1200", name: "Inventory", type: "ASSET", balance: 15200000 },
      { code: "1300", name: "Prepaid Expenses", type: "ASSET", balance: 850000 },
      { code: "1400", name: "Fixed Assets", type: "ASSET", balance: 22000000 },
      { code: "1410", name: "Accumulated Depreciation", type: "ASSET", balance: -5500000 },
      { code: "2000", name: "Accounts Payable", type: "LIABILITY", balance: 6200000 },
      { code: "2100", name: "Accrued Expenses", type: "LIABILITY", balance: 1800000 },
      { code: "2200", name: "VAT Payable", type: "LIABILITY", balance: 2100000 },
      { code: "2300", name: "Employee Benefits Payable", type: "LIABILITY", balance: 950000 },
      { code: "3000", name: "Share Capital", type: "EQUITY", balance: 25000000 },
      { code: "3100", name: "Retained Earnings", type: "EQUITY", balance: 18500000 },
      { code: "4000", name: "Product Sales Revenue", type: "REVENUE", balance: 45800000 },
      { code: "4100", name: "Service Revenue", type: "REVENUE", balance: 3200000 },
      { code: "4200", name: "Export Revenue", type: "REVENUE", balance: 8500000 },
      { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", balance: 28500000 },
      { code: "5100", name: "Salaries & Wages", type: "EXPENSE", balance: 9600000 },
      { code: "5200", name: "Marketing & Promotion", type: "EXPENSE", balance: 4200000 },
      { code: "5300", name: "Distribution Costs", type: "EXPENSE", balance: 2800000 },
      { code: "5400", name: "R&D Expenses", type: "EXPENSE", balance: 3500000 },
      { code: "5500", name: "Administrative Expenses", type: "EXPENSE", balance: 1900000 },
      { code: "5600", name: "Depreciation Expense", type: "EXPENSE", balance: 1100000 },
    ],
  })

  // ─── Suppliers (Pharma) ─────────────────────────────────────────────
  const sup1 = await prisma.supplier.create({ data: { name: "Al Kahira Pharmaceutical Trading", email: "orders@alkahirapharma.eg", phone: "+20 2 2345 6789", city: "Cairo", country: "Egypt", status: "ACTIVE", rating: 4.5, paymentTerms: "Net 30" } })
  const sup2 = await prisma.supplier.create({ data: { name: "EIPICO Raw Materials", email: "supply@eipico.com.eg", phone: "+20 3 456 7890", city: "10th of Ramadan", country: "Egypt", status: "ACTIVE", rating: 4.8, paymentTerms: "Net 45" } })
  const sup3 = await prisma.supplier.create({ data: { name: "India API Suppliers Ltd", email: "export@indiaapi.com", phone: "+91 22 6789 0123", city: "Mumbai", country: "India", status: "ACTIVE", rating: 4.2, paymentTerms: "LC 60" } })
  const sup4 = await prisma.supplier.create({ data: { name: "China Fine Chemicals Co.", email: "sales@chinafine.cn", phone: "+86 21 5678 9012", city: "Shanghai", country: "China", status: "ACTIVE", rating: 3.8, paymentTerms: "LC 90" } })
  const sup5 = await prisma.supplier.create({ data: { name: "Nile Packaging Solutions", email: "info@nilepack.eg", phone: "+20 2 3456 7891", city: "6th of October", country: "Egypt", status: "ACTIVE", rating: 4.0, paymentTerms: "Net 30" } })

  // ─── Products (Pharma) ──────────────────────────────────────────────
  const prod1 = await prisma.product.create({ data: { sku: "AUG-1G", name: "Augmentin 1g", category: "Antibiotics", unitPrice: 185.00, costPrice: 92.00, quantity: 5000, reorderLevel: 1000, unit: "box", description: "Amoxicillin/Clavulanic Acid 1000mg tablets", status: "ACTIVE" } })
  const prod2 = await prisma.product.create({ data: { sku: "PAN-500", name: "Panadol Extra 500mg", category: "Analgesics", unitPrice: 42.50, costPrice: 18.00, quantity: 12000, reorderLevel: 3000, unit: "box", description: "Paracetamol 500mg + Caffeine tablets", status: "ACTIVE" } })
  const prod3 = await prisma.product.create({ data: { sku: "CRD-10", name: "Cardioprex 10mg", category: "Cardiovascular", unitPrice: 225.00, costPrice: 115.00, quantity: 3200, reorderLevel: 800, unit: "box", description: "Atorvastatin 10mg film-coated tablets", status: "ACTIVE" } })
  const prod4 = await prisma.product.create({ data: { sku: "AMX-500", name: "Amoxil 500mg", category: "Antibiotics", unitPrice: 95.00, costPrice: 45.00, quantity: 8000, reorderLevel: 2000, unit: "box", description: "Amoxicillin 500mg capsules", status: "ACTIVE" } })
  const prod5 = await prisma.product.create({ data: { sku: "CRS-20", name: "Crestor 20mg", category: "Cardiovascular", unitPrice: 310.00, costPrice: 155.00, quantity: 2500, reorderLevel: 600, unit: "box", description: "Rosuvastatin 20mg tablets", status: "ACTIVE" } })
  const prod6 = await prisma.product.create({ data: { sku: "OMP-20", name: "Omepak 20mg", category: "Gastrointestinal", unitPrice: 65.00, costPrice: 28.00, quantity: 9500, reorderLevel: 2500, unit: "box", description: "Omeprazole 20mg capsules", status: "ACTIVE" } })
  const prod7 = await prisma.product.create({ data: { sku: "VNT-INH", name: "Ventolin Inhaler", category: "Respiratory", unitPrice: 120.00, costPrice: 55.00, quantity: 4000, reorderLevel: 800, unit: "unit", description: "Salbutamol 100mcg/dose inhaler", status: "ACTIVE" } })
  const prod8 = await prisma.product.create({ data: { sku: "GLM-2", name: "Glimaryl 2mg", category: "Diabetes", unitPrice: 78.00, costPrice: 35.00, quantity: 6000, reorderLevel: 1500, unit: "box", description: "Glimepiride 2mg tablets", status: "ACTIVE" } })
  const prod9 = await prisma.product.create({ data: { sku: "CNC-8", name: "Concor 5mg", category: "Cardiovascular", unitPrice: 195.00, costPrice: 98.00, quantity: 3800, reorderLevel: 900, unit: "box", description: "Bisoprolol 5mg tablets", status: "ACTIVE" } })
  const prod10 = await prisma.product.create({ data: { sku: "ZTH-250", name: "Zithromax 250mg", category: "Antibiotics", unitPrice: 145.00, costPrice: 68.00, quantity: 4200, reorderLevel: 1000, unit: "box", description: "Azithromycin 250mg capsules", status: "ACTIVE" } })
  const prod11 = await prisma.product.create({ data: { sku: "NXM-40", name: "Nexium 40mg", category: "Gastrointestinal", unitPrice: 198.00, costPrice: 95.00, quantity: 3500, reorderLevel: 800, unit: "box", description: "Esomeprazole 40mg tablets", status: "ACTIVE" } })
  const prod12 = await prisma.product.create({ data: { sku: "DPG-75", name: "Plavix 75mg", category: "Cardiovascular", unitPrice: 280.00, costPrice: 140.00, quantity: 2800, reorderLevel: 700, unit: "box", description: "Clopidogrel 75mg film-coated tablets", status: "ACTIVE" } })

  // ─── Warehouses ─────────────────────────────────────────────────────
  const wh1 = await prisma.warehouse.create({ data: { name: "Cairo Central Warehouse", location: "10th of Ramadan Industrial Zone, Cairo", capacity: 50000, managerId: employee.id } })
  const wh2 = await prisma.warehouse.create({ data: { name: "Alexandria Distribution Center", location: "Borg El Arab Industrial Area, Alexandria", capacity: 25000, managerId: employee.id } })
  const wh3 = await prisma.warehouse.create({ data: { name: "Upper Egypt Hub", location: "Assiut Industrial Zone", capacity: 15000, managerId: admin.id } })

  // ─── CRM Accounts (Hospitals, Pharmacies, Chains) ───────────────────
  const acc1 = await prisma.account.create({ data: { name: "Ain Shams University Hospital", industry: "Healthcare", phone: "+20 2 2685 0000", email: "pharmacy@ainshams.edu.eg", type: "CUSTOMER", city: "Cairo", country: "Egypt", annualRevenue: 2500000, employeeCount: 3500, ownerId: manager.id, latitude: 30.0761, longitude: 31.2828 } })
  const acc2 = await prisma.account.create({ data: { name: "El Ezaby Pharmacy Chain", industry: "Retail Pharmacy", phone: "+20 2 1234 5678", email: "procurement@elezaby.com.eg", type: "CUSTOMER", city: "Cairo", country: "Egypt", annualRevenue: 8500000, employeeCount: 1200, ownerId: manager.id, latitude: 30.0444, longitude: 31.2357 } })
  const acc3 = await prisma.account.create({ data: { name: "Dar Al Fouad Hospital", industry: "Healthcare", phone: "+20 2 3837 5555", email: "pharmacy@daralfouad.com", type: "CUSTOMER", city: "6th of October", country: "Egypt", annualRevenue: 5000000, employeeCount: 2000, ownerId: bum.id, latitude: 30.0131, longitude: 31.0087 } })
  const acc4 = await prisma.account.create({ data: { name: "Seif Pharmacies", industry: "Retail Pharmacy", phone: "+20 2 1900 0900", email: "orders@seifpharma.com", type: "CUSTOMER", city: "Cairo", country: "Egypt", annualRevenue: 12000000, employeeCount: 2500, ownerId: manager.id, latitude: 30.0626, longitude: 31.2497 } })
  const acc5 = await prisma.account.create({ data: { name: "Kasr El Aini Hospital", industry: "Healthcare", phone: "+20 2 2792 4455", email: "pharmacy@kasrelaini.edu.eg", type: "CUSTOMER", city: "Cairo", country: "Egypt", annualRevenue: 3200000, employeeCount: 5000, ownerId: bum.id, latitude: 30.0291, longitude: 31.2272 } })
  const acc6 = await prisma.account.create({ data: { name: "Alexandria University Hospital", industry: "Healthcare", phone: "+20 3 4869 000", email: "pharma@alexuni.edu.eg", type: "CUSTOMER", city: "Alexandria", country: "Egypt", annualRevenue: 1800000, employeeCount: 2800, ownerId: manager.id, latitude: 31.2001, longitude: 29.9187 } })
  const acc7 = await prisma.account.create({ data: { name: "Roshdy Pharmacy", industry: "Retail Pharmacy", phone: "+20 2 2580 1234", type: "PROSPECT", city: "Giza", country: "Egypt", annualRevenue: 650000, employeeCount: 45, ownerId: medRep2.id, latitude: 30.0131, longitude: 31.2089 } })
  const acc8 = await prisma.account.create({ data: { name: "Saudi German Hospital Cairo", industry: "Healthcare", website: "https://sghcairo.com", phone: "+20 2 2452 9999", type: "CUSTOMER", city: "Cairo", country: "Egypt", annualRevenue: 7500000, employeeCount: 1500, ownerId: bum.id, latitude: 30.0082, longitude: 31.4092 } })

  // ─── Contacts (Doctors, Pharmacists) ────────────────────────────────
  await prisma.contact.createMany({
    data: [
      { firstName: "Dr. Mohamed", lastName: "El-Sayed", email: "msayed@ainshams.edu.eg", phone: "+20 100 234 5678", title: "Chief Pharmacist", accountId: acc1.id, ownerId: medRep1.id },
      { firstName: "Dr. Heba", lastName: "Kamal", email: "hkamal@ainshams.edu.eg", phone: "+20 101 345 6789", title: "Head of Cardiology", accountId: acc1.id, ownerId: medRep1.id },
      { firstName: "Mahmoud", lastName: "Salem", email: "msalem@elezaby.com.eg", phone: "+20 102 456 7890", title: "Procurement Manager", accountId: acc2.id, ownerId: medRep2.id },
      { firstName: "Dr. Amira", lastName: "Nabil", email: "anabil@daralfouad.com", phone: "+20 103 567 8901", title: "Head of Internal Medicine", accountId: acc3.id, ownerId: medRep1.id },
      { firstName: "Tarek", lastName: "Youssef", email: "tyoussef@seifpharma.com", phone: "+20 104 678 9012", title: "Regional Manager", accountId: acc4.id, ownerId: medRep2.id },
      { firstName: "Dr. Laila", lastName: "Mostafa", email: "lmostafa@kasrelaini.edu.eg", phone: "+20 105 789 0123", title: "Endocrinology Consultant", accountId: acc5.id, ownerId: medRep1.id },
      { firstName: "Dr. Ashraf", lastName: "Zaki", email: "azaki@alexuni.edu.eg", phone: "+20 106 890 1234", title: "Head of Pulmonology", accountId: acc6.id, ownerId: medRep2.id },
      { firstName: "Rania", lastName: "Adel", email: "radel@roshdy.com", phone: "+20 107 901 2345", title: "Pharmacy Owner", accountId: acc7.id, ownerId: medRep2.id },
      { firstName: "Dr. Hussein", lastName: "Fathy", email: "hfathy@sghcairo.com", phone: "+20 108 012 3456", title: "Medical Director", accountId: acc8.id, ownerId: bum.id },
      { firstName: "Dr. Noha", lastName: "Samir", email: "nsamir@sghcairo.com", phone: "+20 109 123 4567", title: "Chief Pharmacist", accountId: acc8.id, ownerId: medRep1.id },
    ],
  })

  // ─── Invoices (EGP) ────────────────────────────────────────────────
  const inv1 = await prisma.invoice.create({
    data: { invoiceNumber: "INV-2025-001", customerId: acc1.id, date: new Date("2025-01-15"), dueDate: new Date("2025-02-15"), status: "PAID", subtotal: 185000, tax: 25900, total: 210900, items: { create: [
      { description: "Augmentin 1g - 500 boxes", quantity: 500, unitPrice: 185, total: 92500 },
      { description: "Amoxil 500mg - 500 boxes", quantity: 500, unitPrice: 95, total: 47500 },
      { description: "Cardioprex 10mg - 200 boxes", quantity: 200, unitPrice: 225, total: 45000 },
    ] } },
  })
  const inv2 = await prisma.invoice.create({
    data: { invoiceNumber: "INV-2025-002", customerId: acc2.id, date: new Date("2025-01-20"), dueDate: new Date("2025-02-20"), status: "PAID", subtotal: 342500, tax: 47950, total: 390450, items: { create: [
      { description: "Panadol Extra - 2000 boxes", quantity: 2000, unitPrice: 42.5, total: 85000 },
      { description: "Augmentin 1g - 800 boxes", quantity: 800, unitPrice: 185, total: 148000 },
      { description: "Omepak 20mg - 500 boxes", quantity: 500, unitPrice: 65, total: 32500 },
      { description: "Ventolin Inhaler - 500 units", quantity: 500, unitPrice: 120, total: 60000 },
      { description: "Zithromax 250mg - 100 boxes", quantity: 100, unitPrice: 145, total: 14500 },
      { description: "Plavix 75mg - 10 boxes", quantity: 10, unitPrice: 280, total: 2500 },
    ] } },
  })
  await prisma.invoice.create({
    data: { invoiceNumber: "INV-2025-003", customerId: acc3.id, date: new Date("2025-02-01"), dueDate: new Date("2025-03-01"), status: "SENT", subtotal: 256000, tax: 35840, total: 291840, items: { create: [
      { description: "Crestor 20mg - 400 boxes", quantity: 400, unitPrice: 310, total: 124000 },
      { description: "Concor 5mg - 300 boxes", quantity: 300, unitPrice: 195, total: 58500 },
      { description: "Nexium 40mg - 200 boxes", quantity: 200, unitPrice: 198, total: 39600 },
      { description: "Glimaryl 2mg - 350 boxes", quantity: 350, unitPrice: 78, total: 27300 },
      { description: "Plavix 75mg - 20 boxes", quantity: 20, unitPrice: 280, total: 5600 },
      { description: "Panadol Extra - 250 boxes", quantity: 250, unitPrice: 42.5, total: 1000 },
    ] } },
  })
  await prisma.invoice.create({
    data: { invoiceNumber: "INV-2025-004", customerId: acc4.id, date: new Date("2025-02-10"), dueDate: new Date("2025-03-10"), status: "SENT", subtotal: 485000, tax: 67900, total: 552900, items: { create: [
      { description: "Bulk order - Mixed pharmaceuticals", quantity: 1, unitPrice: 485000, total: 485000 },
    ] } },
  })
  await prisma.invoice.create({
    data: { invoiceNumber: "INV-2025-005", customerId: acc5.id, date: new Date("2025-02-15"), dueDate: new Date("2025-03-15"), status: "OVERDUE", subtotal: 128000, tax: 17920, total: 145920, items: { create: [
      { description: "Cardioprex 10mg - 300 boxes", quantity: 300, unitPrice: 225, total: 67500 },
      { description: "Glimaryl 2mg - 400 boxes", quantity: 400, unitPrice: 78, total: 31200 },
      { description: "Amoxil 500mg - 200 boxes", quantity: 200, unitPrice: 95, total: 19000 },
      { description: "Omepak 20mg - 150 boxes", quantity: 150, unitPrice: 65, total: 9750 },
      { description: "Augmentin 1g - 3 boxes", quantity: 3, unitPrice: 185, total: 550 },
    ] } },
  })
  await prisma.invoice.create({
    data: { invoiceNumber: "INV-2025-006", customerId: acc6.id, date: new Date("2025-03-01"), dueDate: new Date("2025-04-01"), status: "DRAFT", subtotal: 92000, tax: 12880, total: 104880, items: { create: [
      { description: "Ventolin Inhaler - 200 units", quantity: 200, unitPrice: 120, total: 24000 },
      { description: "Zithromax 250mg - 300 boxes", quantity: 300, unitPrice: 145, total: 43500 },
      { description: "Panadol Extra - 500 boxes", quantity: 500, unitPrice: 42.5, total: 21250 },
      { description: "Amoxil 500mg - 34 boxes", quantity: 34, unitPrice: 95, total: 3250 },
    ] } },
  })

  // ─── Payments (EGP) ────────────────────────────────────────────────
  await prisma.payment.create({ data: { type: "INCOMING", amount: 210900, date: new Date("2025-02-10"), method: "BANK_TRANSFER", reference: "PAY-AIN-001", invoiceId: inv1.id } })
  await prisma.payment.create({ data: { type: "INCOMING", amount: 390450, date: new Date("2025-02-18"), method: "CHECK", reference: "PAY-EZB-001", invoiceId: inv2.id } })
  await prisma.payment.create({ data: { type: "OUTGOING", amount: 850000, date: new Date("2025-01-25"), method: "BANK_TRANSFER", reference: "PAY-SUP-EIPICO-001" } })
  await prisma.payment.create({ data: { type: "OUTGOING", amount: 1200000, date: new Date("2025-02-05"), method: "BANK_TRANSFER", reference: "PAY-SUP-INDIA-001" } })

  // ─── Purchase Orders ────────────────────────────────────────────────
  const po1 = await prisma.purchaseOrder.create({
    data: { poNumber: "PO-2025-001", supplierId: sup2.id, date: new Date("2025-01-10"), expectedDate: new Date("2025-02-10"), status: "RECEIVED", total: 2400000, createdById: employee.id,
      items: { create: [
        { productId: prod1.id, description: "Amoxicillin/Clavulanic Acid API", quantity: 500, unitPrice: 2400, total: 1200000 },
        { productId: prod4.id, description: "Amoxicillin Trihydrate API", quantity: 500, unitPrice: 2400, total: 1200000 },
      ] } },
  })
  await prisma.purchaseOrder.create({
    data: { poNumber: "PO-2025-002", supplierId: sup3.id, date: new Date("2025-01-15"), expectedDate: new Date("2025-03-15"), status: "SENT", total: 3500000, createdById: employee.id,
      items: { create: [
        { productId: prod3.id, description: "Atorvastatin Calcium API", quantity: 200, unitPrice: 8500, total: 1700000 },
        { productId: prod5.id, description: "Rosuvastatin Calcium API", quantity: 150, unitPrice: 12000, total: 1800000 },
      ] } },
  })
  await prisma.purchaseOrder.create({
    data: { poNumber: "PO-2025-003", supplierId: sup5.id, date: new Date("2025-02-01"), expectedDate: new Date("2025-02-20"), status: "APPROVED", total: 450000, createdById: employee.id,
      items: { create: [
        { description: "Blister packing foil - 5000 rolls", quantity: 5000, unitPrice: 50, total: 250000 },
        { description: "Carton boxes - 10000 units", quantity: 10000, unitPrice: 20, total: 200000 },
      ] } },
  })

  // ─── Sales Orders ───────────────────────────────────────────────────
  await prisma.salesOrder.create({
    data: { orderNumber: "SO-2025-001", customerId: acc1.id, date: new Date("2025-01-12"), status: "DELIVERED", total: 210900, shippingAddress: "Ain Shams University Hospital, Abbassia, Cairo",
      items: { create: [
        { productId: prod1.id, quantity: 500, unitPrice: 185, total: 92500 },
        { productId: prod4.id, quantity: 500, unitPrice: 95, total: 47500 },
        { productId: prod3.id, quantity: 200, unitPrice: 225, total: 45000 },
      ] } },
  })
  await prisma.salesOrder.create({
    data: { orderNumber: "SO-2025-002", customerId: acc4.id, date: new Date("2025-02-05"), status: "CONFIRMED", total: 552900, shippingAddress: "Seif Pharmacies Central Warehouse, Nasr City, Cairo",
      items: { create: [
        { productId: prod2.id, quantity: 3000, unitPrice: 42.5, total: 127500 },
        { productId: prod1.id, quantity: 1000, unitPrice: 185, total: 185000 },
        { productId: prod6.id, quantity: 1500, unitPrice: 65, total: 97500 },
        { productId: prod7.id, quantity: 800, unitPrice: 120, total: 96000 },
      ] } },
  })
  await prisma.salesOrder.create({
    data: { orderNumber: "SO-2025-003", customerId: acc2.id, date: new Date("2025-02-20"), status: "PENDING", total: 178500, shippingAddress: "El Ezaby Distribution Center, Heliopolis, Cairo",
      items: { create: [
        { productId: prod10.id, quantity: 300, unitPrice: 145, total: 43500 },
        { productId: prod9.id, quantity: 200, unitPrice: 195, total: 39000 },
        { productId: prod12.id, quantity: 150, unitPrice: 280, total: 42000 },
        { productId: prod8.id, quantity: 400, unitPrice: 78, total: 31200 },
        { productId: prod11.id, quantity: 100, unitPrice: 198, total: 19800 },
        { productId: prod2.id, quantity: 200, unitPrice: 42.5, total: 3000 },
      ] } },
  })

  // ─── Stock Movements ────────────────────────────────────────────────
  await prisma.stockMovement.createMany({
    data: [
      { productId: prod1.id, warehouseId: wh1.id, type: "IN", quantity: 2000, date: new Date("2025-01-15"), reference: "PO-2025-001", notes: "Received from EIPICO", createdById: employee.id },
      { productId: prod1.id, warehouseId: wh1.id, type: "OUT", quantity: 500, date: new Date("2025-01-20"), reference: "SO-2025-001", notes: "Shipped to Ain Shams Hospital", createdById: employee.id },
      { productId: prod2.id, warehouseId: wh1.id, type: "IN", quantity: 5000, date: new Date("2025-01-10"), reference: "MFG-2025-001", notes: "Production batch B2025-01", createdById: employee.id },
      { productId: prod3.id, warehouseId: wh2.id, type: "TRANSFER", quantity: 500, date: new Date("2025-02-01"), reference: "TRF-001", notes: "Transfer from Cairo to Alex", createdById: employee.id },
      { productId: prod7.id, warehouseId: wh1.id, type: "IN", quantity: 1000, date: new Date("2025-02-05"), reference: "IMP-2025-001", notes: "Import shipment from GSK", createdById: employee.id },
      { productId: prod6.id, warehouseId: wh3.id, type: "OUT", quantity: 200, date: new Date("2025-02-10"), reference: "SO-LOCAL-001", notes: "Upper Egypt distribution", createdById: employee.id },
    ],
  })

  // ─── Leads ──────────────────────────────────────────────────────────
  await prisma.lead.createMany({
    data: [
      { firstName: "Dr. Sameh", lastName: "Barakat", email: "sbarakat@clinic.eg", company: "Barakat Medical Center", source: "REFERRAL", status: "QUALIFIED", score: 85, value: 250000, assignedToId: medRep1.id },
      { firstName: "Eng. Hany", lastName: "Shaker", email: "hshaker@newpharmacy.eg", company: "New Cairo Pharmacy", source: "WEB", status: "NEW", score: 62, value: 120000, assignedToId: medRep2.id },
      { firstName: "Dr. Iman", lastName: "Hashim", email: "ihashim@militaryhospital.eg", company: "Military Medical Complex", source: "EVENT", status: "CONTACTED", score: 78, value: 500000, assignedToId: bum.id },
      { firstName: "Ahmed", lastName: "Mostafa", email: "amostafa@pharmacychain.eg", company: "El Nile Pharmacy Chain", source: "COLD_CALL", status: "NEW", score: 55, value: 180000, assignedToId: medRep2.id },
      { firstName: "Dr. Yasmin", lastName: "Tawfik", email: "ytawfik@children.eg", company: "Cairo Children's Hospital", source: "REFERRAL", status: "QUALIFIED", score: 90, value: 350000, assignedToId: medRep1.id },
      { firstName: "Mahmoud", lastName: "Hegazy", email: "mhegazy@deltachain.eg", company: "Delta Pharmacy Group", source: "SOCIAL", status: "CONTACTED", score: 70, value: 220000, assignedToId: medRep2.id },
    ],
  })

  // ─── Opportunities ──────────────────────────────────────────────────
  await prisma.opportunity.createMany({
    data: [
      { title: "Ain Shams Annual Supply Contract", accountId: acc1.id, stage: "NEGOTIATION", value: 2500000, probability: 75, assignedToId: manager.id, expectedCloseDate: new Date("2025-04-30") },
      { title: "El Ezaby New Product Launch", accountId: acc2.id, stage: "PROPOSAL", value: 1800000, probability: 60, assignedToId: bum.id, expectedCloseDate: new Date("2025-05-15") },
      { title: "Dar Al Fouad Cardio Portfolio", accountId: acc3.id, stage: "QUALIFICATION", value: 3200000, probability: 40, assignedToId: medRep1.id, expectedCloseDate: new Date("2025-06-30") },
      { title: "Seif Exclusive Distribution Deal", accountId: acc4.id, stage: "CLOSED_WON", value: 8500000, probability: 100, assignedToId: manager.id, expectedCloseDate: new Date("2025-03-01") },
      { title: "Kasr El Aini Diabetes Care", accountId: acc5.id, stage: "PROSPECTING", value: 750000, probability: 20, assignedToId: medRep1.id, expectedCloseDate: new Date("2025-07-31") },
      { title: "SGH Cairo Respiratory Products", accountId: acc8.id, stage: "PROPOSAL", value: 1200000, probability: 55, assignedToId: bum.id, expectedCloseDate: new Date("2025-05-30") },
    ],
  })

  // ─── Tickets ────────────────────────────────────────────────────────
  await prisma.ticket.createMany({
    data: [
      { ticketNumber: "TK-001", subject: "Augmentin batch recall inquiry", description: "Customer reporting suspected quality issue with batch B2024-12", accountId: acc1.id, status: "IN_PROGRESS", priority: "CRITICAL", assignedToId: admin.id, category: "Quality" },
      { ticketNumber: "TK-002", subject: "Late delivery - SO-2025-003", description: "Order delayed by 3 days, customer requesting compensation", accountId: acc2.id, status: "OPEN", priority: "HIGH", assignedToId: employee.id, category: "Logistics" },
      { ticketNumber: "TK-003", subject: "Invoice discrepancy INV-2025-005", description: "Pricing mismatch on Cardioprex 10mg, agreed price was EGP 210/box", accountId: acc5.id, status: "OPEN", priority: "MEDIUM", assignedToId: manager.id, category: "Billing" },
      { ticketNumber: "TK-004", subject: "Product registration certificate needed", description: "Requesting updated EDA registration for Crestor 20mg", accountId: acc3.id, status: "WAITING", priority: "LOW", assignedToId: medRep1.id, category: "Regulatory" },
      { ticketNumber: "TK-005", subject: "Cold chain temperature excursion", description: "Temperature log shows 12°C spike during transport", accountId: acc4.id, status: "ESCALATED", priority: "CRITICAL", assignedToId: admin.id, category: "Quality" },
    ],
  })

  // ─── Campaigns ──────────────────────────────────────────────────────
  await prisma.campaign.createMany({
    data: [
      { name: "Cardioprex Launch Campaign", type: "EVENT", status: "ACTIVE", budget: 450000, spent: 280000, leads: 45, conversions: 12, ownerId: manager.id, startDate: new Date("2025-01-01"), endDate: new Date("2025-03-31") },
      { name: "Ramadan Health Awareness", type: "SOCIAL", status: "COMPLETED", budget: 150000, spent: 142000, leads: 89, conversions: 28, ownerId: bum.id, startDate: new Date("2025-02-28"), endDate: new Date("2025-03-31") },
      { name: "PharmExpo Egypt 2025", type: "EVENT", status: "SCHEDULED", budget: 800000, spent: 250000, leads: 0, conversions: 0, ownerId: manager.id, startDate: new Date("2025-06-15"), endDate: new Date("2025-06-18") },
      { name: "Diabetes Care Digital", type: "EMAIL", status: "ACTIVE", budget: 120000, spent: 45000, leads: 34, conversions: 8, ownerId: medRep1.id, startDate: new Date("2025-02-01"), endDate: new Date("2025-05-31") },
    ],
  })

  // ─── Projects ───────────────────────────────────────────────────────
  const proj = await prisma.project.create({
    data: { name: "EDA Registration - New Formulations", description: "Register 5 new drug formulations with Egyptian Drug Authority", managerId: admin.id, status: "ACTIVE", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), budget: 2500000, spent: 450000, progress: 25 },
  })
  await prisma.projectTask.createMany({
    data: [
      { projectId: proj.id, title: "Bioequivalence studies - Cardioprex", assigneeId: employee.id, status: "DONE", priority: "HIGH", dueDate: new Date("2025-03-31"), estimatedHours: 200, actualHours: 185 },
      { projectId: proj.id, title: "Stability testing - Omepak reformulation", assigneeId: employee.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: new Date("2025-06-30"), estimatedHours: 160, actualHours: 65 },
      { projectId: proj.id, title: "Dossier preparation - Glimaryl XR", status: "TODO", priority: "MEDIUM", dueDate: new Date("2025-08-31"), estimatedHours: 120 },
      { projectId: proj.id, title: "GMP audit preparation", assigneeId: admin.id, status: "IN_PROGRESS", priority: "URGENT", dueDate: new Date("2025-04-15"), estimatedHours: 80, actualHours: 40 },
    ],
  })

  // ─── Jobs (ATS) ─────────────────────────────────────────────────────
  const job1 = await prisma.job.create({ data: { title: "Medical Representative - Cairo", departmentId: commercial.id, location: "Cairo, Egypt", type: "FULL_TIME", status: "OPEN", description: "Promote pharma products to healthcare professionals in Cairo region", requirements: "Pharmacy/Science degree, 1+ years pharma sales", salaryMin: 15000, salaryMax: 25000, postedDate: new Date("2025-02-01"), hiringManagerId: manager.id } })
  const job2 = await prisma.job.create({ data: { title: "Quality Control Analyst", departmentId: qa.id, location: "10th of Ramadan, Egypt", type: "FULL_TIME", status: "OPEN", description: "Perform QC testing on raw materials and finished products", requirements: "Pharmacy/Chemistry degree, HPLC experience", salaryMin: 18000, salaryMax: 28000, postedDate: new Date("2025-02-15"), hiringManagerId: admin.id } })
  const job3 = await prisma.job.create({ data: { title: "Regulatory Affairs Specialist", departmentId: regulatory.id, location: "Cairo, Egypt", type: "FULL_TIME", status: "OPEN", description: "Handle drug registration with EDA", requirements: "Pharmacy degree, 3+ years regulatory experience", salaryMin: 25000, salaryMax: 40000, postedDate: new Date("2025-03-01"), hiringManagerId: admin.id } })

  // ─── Candidates ─────────────────────────────────────────────────────
  const cand1 = await prisma.candidate.create({ data: { firstName: "Yasser", lastName: "Mahmoud", email: "yasser.mahmoud@gmail.com", phone: "+20 111 234 5678", source: "LINKEDIN", status: "INTERVIEW", currentCompany: "Eva Pharma", currentTitle: "Medical Rep", expectedSalary: 22000, rating: 4 } })
  const cand2 = await prisma.candidate.create({ data: { firstName: "Dina", lastName: "Fawzy", email: "dina.fawzy@outlook.com", phone: "+20 112 345 6789", source: "REFERRAL", status: "SCREENING", currentCompany: "Pharco", currentTitle: "QC Analyst", expectedSalary: 25000, rating: 3 } })
  const cand3 = await prisma.candidate.create({ data: { firstName: "Kareem", lastName: "Abdel-Rahman", email: "kareem.ar@hotmail.com", phone: "+20 113 456 7890", source: "WEBSITE", status: "NEW", currentCompany: "Amoun Pharmaceutical", currentTitle: "Regulatory Coordinator", expectedSalary: 35000, rating: 4 } })

  // ─── Applications ───────────────────────────────────────────────────
  const app1 = await prisma.application.create({ data: { candidateId: cand1.id, jobId: job1.id, status: "INTERVIEW", coverLetter: "Experienced medical rep with 3 years in cardiovascular portfolio", score: 82 } })
  await prisma.application.create({ data: { candidateId: cand2.id, jobId: job2.id, status: "SCREENING", score: 75 } })
  await prisma.application.create({ data: { candidateId: cand3.id, jobId: job3.id, status: "APPLIED", score: 68 } })

  // ─── Interviews ─────────────────────────────────────────────────────
  await prisma.interview.create({ data: { applicationId: app1.id, interviewerIds: manager.id, scheduledDate: new Date("2025-04-01T10:00:00"), duration: 45, type: "ONSITE", status: "SCHEDULED", location: "Head Office - Nasr City, Cairo" } })

  // ─── Workflows ──────────────────────────────────────────────────────
  await prisma.workflow.createMany({
    data: [
      { name: "Auto-assign leads by territory", module: "CRM", triggerType: "RECORD_CREATE", triggerConfig: '{"entity":"Lead"}', conditions: '{"source":["WEB","SOCIAL"]}', actions: '{"type":"ASSIGN","to":"territory_based"}', isActive: true, createdById: admin.id, runCount: 234 },
      { name: "Invoice overdue reminder", module: "ERP", triggerType: "SCHEDULE", triggerConfig: '{"cron":"0 9 * * *"}', conditions: '{"status":"SENT","daysOverdue":7}', actions: '{"type":"EMAIL","template":"overdue_reminder_ar"}', isActive: true, createdById: admin.id, runCount: 89 },
      { name: "Low stock alert", module: "ERP", triggerType: "FIELD_CHANGE", triggerConfig: '{"entity":"Product","field":"quantity"}', conditions: '{"quantity_below":"reorderLevel"}', actions: '{"type":"NOTIFY","to":"supply_chain_team"}', isActive: true, createdById: admin.id, runCount: 156 },
      { name: "Expiry date warning", module: "ERP", triggerType: "SCHEDULE", triggerConfig: '{"cron":"0 8 * * 1"}', conditions: '{"daysToExpiry":90}', actions: '{"type":"NOTIFY","to":"qa_team"}', isActive: true, createdById: admin.id, runCount: 45 },
    ],
  })

  // ─── Loyalty Program ────────────────────────────────────────────────
  const loyalty = await prisma.loyaltyProgram.create({ data: { name: "PharmaFlow Rewards", description: "Earn points on every order - redeem for discounts", pointsPerDollar: 10, redemptionRate: 0.005, status: "ACTIVE" } })
  await prisma.loyaltyMember.create({ data: { programId: loyalty.id, accountId: acc2.id, points: 45000, tier: "PLATINUM" } })
  await prisma.loyaltyMember.create({ data: { programId: loyalty.id, accountId: acc4.id, points: 38000, tier: "GOLD" } })
  await prisma.loyaltyMember.create({ data: { programId: loyalty.id, accountId: acc1.id, points: 22000, tier: "SILVER" } })

  // ─── Territories ────────────────────────────────────────────────────
  await prisma.territory.createMany({
    data: [
      { name: "Greater Cairo", description: "Cairo, Giza, Qalyubia", assignedToId: medRep1.id, color: "#3b82f6" },
      { name: "Alexandria & Delta", description: "Alexandria, Beheira, Kafr El-Sheikh, Gharbia, Dakahlia", assignedToId: medRep2.id, color: "#10b981" },
      { name: "Upper Egypt", description: "Minya, Assiut, Sohag, Qena, Luxor, Aswan", assignedToId: bum.id, color: "#f59e0b" },
      { name: "Canal Zone", description: "Suez, Ismailia, Port Said", assignedToId: medRep2.id, color: "#8b5cf6" },
    ],
  })

  // ─── Training Courses ───────────────────────────────────────────────
  const course1 = await prisma.trainingCourse.create({ data: { title: "GMP Compliance Fundamentals", description: "Good Manufacturing Practice standards for pharma", category: "Compliance", duration: "8 hours", format: "CLASSROOM", status: "PUBLISHED" } })
  const course2 = await prisma.trainingCourse.create({ data: { title: "Cardiovascular Product Knowledge", description: "Deep dive into CV portfolio: Cardioprex, Crestor, Concor, Plavix", category: "Product Training", duration: "4 hours", format: "ONLINE", status: "PUBLISHED" } })
  await prisma.trainingCourse.create({ data: { title: "EDA Regulatory Updates 2025", description: "Latest regulatory changes from Egyptian Drug Authority", category: "Regulatory", duration: "2 hours", format: "ONLINE", status: "PUBLISHED" } })

  await prisma.trainingEnrollment.create({ data: { courseId: course1.id, employeeId: emp7.id, status: "COMPLETED", completedDate: new Date("2025-02-15"), score: 94 } })
  await prisma.trainingEnrollment.create({ data: { courseId: course2.id, employeeId: emp4.id, status: "COMPLETED", completedDate: new Date("2025-03-01"), score: 88 } })
  await prisma.trainingEnrollment.create({ data: { courseId: course2.id, employeeId: emp5.id, status: "IN_PROGRESS" } })

  // ─── BOM (Bill of Materials) ────────────────────────────────────────
  const bom1 = await prisma.billOfMaterials.create({ data: { productId: prod1.id, name: "Augmentin 1g Manufacturing BOM", version: "2.1", status: "ACTIVE" } })
  await prisma.bOMItem.createMany({
    data: [
      { bomId: bom1.id, materialId: prod4.id, quantity: 0.5, unit: "kg", wastagePercent: 2 },
      { bomId: bom1.id, materialId: prod2.id, quantity: 0.1, unit: "kg", wastagePercent: 1 },
    ],
  })

  // ─── Assets ─────────────────────────────────────────────────────────
  const asset1 = await prisma.asset.create({ data: { name: "HPLC System - Agilent 1260", assetTag: "AST-LAB-001", category: "Laboratory Equipment", status: "ACTIVE", purchaseDate: new Date("2022-06-15"), purchasePrice: 1500000, currentValue: 1125000, location: "QC Lab - 10th of Ramadan", assignedToId: emp7.id, depreciationRate: 10 } })
  await prisma.asset.create({ data: { name: "Tablet Press - Korsch XL400", assetTag: "AST-MFG-001", category: "Manufacturing Equipment", status: "ACTIVE", purchaseDate: new Date("2021-03-01"), purchasePrice: 3200000, currentValue: 2240000, location: "Production Hall A", depreciationRate: 10 } })
  await prisma.asset.create({ data: { name: "Cold Storage Unit - Thermo Fisher", assetTag: "AST-WH-001", category: "Warehouse Equipment", status: "ACTIVE", purchaseDate: new Date("2023-01-10"), purchasePrice: 450000, currentValue: 382500, location: "Cairo Central Warehouse", depreciationRate: 15 } })

  await prisma.assetMaintenance.create({ data: { assetId: asset1.id, type: "PREVENTIVE", description: "Annual HPLC calibration and validation", scheduledDate: new Date("2025-06-15"), cost: 35000, status: "SCHEDULED" } })

  // ─── Business Units ─────────────────────────────────────────────────
  const bu1 = await prisma.businessUnit.create({
    data: { name: "Cardiovascular Business Unit", code: "BU-CV", description: "Heart & circulatory system products", managerId: bum.id, color: "#ef4444" }
  })
  const bu2 = await prisma.businessUnit.create({
    data: { name: "Anti-Infectives Business Unit", code: "BU-AI", description: "Antibiotics and antiviral products", managerId: manager.id, color: "#3b82f6" }
  })
  const bu3 = await prisma.businessUnit.create({
    data: { name: "GI & Metabolic Business Unit", code: "BU-GI", description: "Gastrointestinal and diabetes products", managerId: bum.id, color: "#10b981" }
  })

  // BU Members
  await prisma.businessUnitMember.createMany({
    data: [
      { businessUnitId: bu1.id, userId: bum.id, role: "BUM" },
      { businessUnitId: bu1.id, userId: medRep1.id, role: "MEDICAL_REP" },
      { businessUnitId: bu1.id, userId: medRep2.id, role: "MEDICAL_REP" },
      { businessUnitId: bu2.id, userId: manager.id, role: "BUM" },
      { businessUnitId: bu2.id, userId: medRep1.id, role: "MEDICAL_REP" },
      { businessUnitId: bu3.id, userId: bum.id, role: "BUM" },
      { businessUnitId: bu3.id, userId: medRep2.id, role: "MEDICAL_REP" },
    ]
  })

  // BU Products (prod3=Cardioprex, prod5=Crestor, prod9=Concor, prod12=Plavix for CV)
  await prisma.businessUnitProduct.createMany({
    data: [
      { businessUnitId: bu1.id, productId: prod3.id },
      { businessUnitId: bu1.id, productId: prod5.id },
      { businessUnitId: bu1.id, productId: prod9.id },
      { businessUnitId: bu1.id, productId: prod12.id },
      { businessUnitId: bu2.id, productId: prod1.id },
      { businessUnitId: bu2.id, productId: prod4.id },
      { businessUnitId: bu2.id, productId: prod10.id },
      { businessUnitId: bu3.id, productId: prod6.id },
      { businessUnitId: bu3.id, productId: prod8.id },
      { businessUnitId: bu3.id, productId: prod11.id },
    ]
  })

  // Sample approval logs
  await prisma.approvalLog.createMany({
    data: [
      { entityType: "EXPENSE", entityId: "exp-001", action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING", performedById: medRep1.id, level: 1, businessUnitId: bu1.id },
      { entityType: "EXPENSE", entityId: "exp-001", action: "APPROVED", fromStatus: "PENDING", toStatus: "APPROVED", performedById: bum.id, comment: "Within budget", level: 3, businessUnitId: bu1.id },
      { entityType: "WEEKLY_PLAN", entityId: "wp-001", action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "SUBMITTED", performedById: medRep2.id, level: 1, businessUnitId: bu2.id },
      { entityType: "MARKET_REQUEST", entityId: "mr-001", action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING", performedById: medRep1.id, level: 1, businessUnitId: bu1.id },
      { entityType: "MARKET_REQUEST", entityId: "mr-001", action: "APPROVED", fromStatus: "PENDING", toStatus: "APPROVED", performedById: manager.id, comment: "Approved - conference sponsorship", level: 2, businessUnitId: bu1.id },
    ]
  })

  // ==================== PHARMA CRM ENTITIES ====================

  // ─── Additional users matching DEMO_USERS from user-context ────────
  const nsm = await prisma.user.upsert({
    where: { email: "tarek.mansour@pharmaerp.eg" },
    update: {},
    create: { name: "Eng. Tarek Mansour", email: "tarek.mansour@pharmaerp.eg", passwordHash: hashSync("nsm123", 10), role: "MANAGER", department: "Sales & Marketing", territory: "National" },
  })
  const dm1 = await prisma.user.upsert({
    where: { email: "ahmed.mostafa@pharmaerp.eg" },
    update: {},
    create: { name: "Ahmed Mostafa", email: "ahmed.mostafa@pharmaerp.eg", passwordHash: hashSync("dm123", 10), role: "EMPLOYEE", department: "Sales", territory: "Cairo North" },
  })
  const rep2 = await prisma.user.upsert({
    where: { email: "mohamed.elsayed@pharmaerp.eg" },
    update: {},
    create: { name: "Mohamed El-Sayed", email: "mohamed.elsayed@pharmaerp.eg", passwordHash: hashSync("rep123", 10), role: "EMPLOYEE", department: "Sales", territory: "Giza" },
  })

  // ─── Doctors ────────────────────────────────────────────────────────
  const doctors = await Promise.all([
    prisma.doctor.create({ data: { name: "Dr. Ahmed El-Sayed", specialty: "Cardiology", hospital: "Ain Shams University Hospital", city: "Cairo", phone: "+20 100 111 2233", classification: "A", potentialRevenue: 25000, isKOL: true, buyingLadderStage: "CHAMPION", visitFrequency: 4, assignedRepId: medRep1.id, buId: bu1.id, lat: 30.0761, lng: 31.2832 } }),
    prisma.doctor.create({ data: { name: "Dr. Fatima Hassan", specialty: "Internal Medicine", hospital: "Dar Al Fouad Hospital", city: "Giza", phone: "+20 100 222 3344", classification: "A", potentialRevenue: 20000, isKOL: true, buyingLadderStage: "REGULAR", visitFrequency: 4, assignedRepId: medRep1.id, buId: bu3.id, lat: 30.0210, lng: 31.0135 } }),
    prisma.doctor.create({ data: { name: "Dr. Mohamed Nabil", specialty: "Endocrinology", hospital: "Kasr El Aini Hospital", city: "Cairo", phone: "+20 100 333 4455", classification: "A", potentialRevenue: 18000, isKOL: false, buyingLadderStage: "REGULAR", visitFrequency: 3, assignedRepId: medRep1.id, buId: bu3.id, lat: 30.0291, lng: 31.2272 } }),
    prisma.doctor.create({ data: { name: "Dr. Hanan Kamel", specialty: "General Practice", hospital: "Heliopolis Medical Center", city: "Cairo", phone: "+20 100 444 5566", classification: "B", potentialRevenue: 12000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 2, assignedRepId: medRep2.id, buId: bu2.id, lat: 30.0889, lng: 31.3312 } }),
    prisma.doctor.create({ data: { name: "Dr. Youssef Tarek", specialty: "Cardiology", hospital: "Saudi German Hospital", city: "Cairo", phone: "+20 100 555 6677", classification: "A", potentialRevenue: 30000, isKOL: true, buyingLadderStage: "CHAMPION", visitFrequency: 4, assignedRepId: medRep1.id, buId: bu1.id, lat: 30.0082, lng: 31.4092 } }),
    prisma.doctor.create({ data: { name: "Dr. Laila Mostafa", specialty: "Gastroenterology", hospital: "Ain Shams University Hospital", city: "Cairo", phone: "+20 100 666 7788", classification: "B", potentialRevenue: 15000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 2, assignedRepId: medRep2.id, buId: bu3.id, lat: 30.0761, lng: 31.2828 } }),
    prisma.doctor.create({ data: { name: "Dr. Khaled Adel", specialty: "Pulmonology", hospital: "As-Salam International Hospital", city: "Cairo", phone: "+20 100 777 8899", classification: "B", potentialRevenue: 14000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 2, assignedRepId: medRep2.id, buId: bu2.id, lat: 29.9672, lng: 31.2390 } }),
    prisma.doctor.create({ data: { name: "Dr. Samira Ezzat", specialty: "Pediatrics", hospital: "Cairo Children's Hospital", city: "Cairo", phone: "+20 100 888 9900", classification: "B", potentialRevenue: 10000, isKOL: false, buyingLadderStage: "REGULAR", visitFrequency: 2, assignedRepId: medRep1.id, buId: bu2.id, lat: 30.0500, lng: 31.2400 } }),
    prisma.doctor.create({ data: { name: "Dr. Omar Sherif", specialty: "Neurology", hospital: "Dar Al Fouad Hospital", city: "Giza", phone: "+20 100 999 0011", classification: "C", potentialRevenue: 8000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 1, assignedRepId: medRep2.id, buId: bu1.id, lat: 30.0210, lng: 31.0135 } }),
    prisma.doctor.create({ data: { name: "Dr. Rania Ibrahim", specialty: "Dermatology", hospital: "Heliopolis Medical Center", city: "Cairo", phone: "+20 101 000 1122", classification: "C", potentialRevenue: 6000, isKOL: false, buyingLadderStage: "UNAWARE", visitFrequency: 1, assignedRepId: medRep2.id, lat: 30.0889, lng: 31.3312 } }),
    // Additional doctors to reach 50+
    prisma.doctor.create({ data: { name: "Dr. Tarek Fawzy", specialty: "Cardiology", hospital: "National Heart Institute", city: "Cairo", phone: "+20 101 111 2233", classification: "A", potentialRevenue: 22000, isKOL: true, buyingLadderStage: "CHAMPION", visitFrequency: 4, assignedRepId: medRep1.id, buId: bu1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Mona El-Naggar", specialty: "Endocrinology", hospital: "Alexandria University Hospital", city: "Alexandria", phone: "+20 101 222 3344", classification: "A", potentialRevenue: 19000, isKOL: true, buyingLadderStage: "REGULAR", visitFrequency: 3, assignedRepId: medRep2.id, buId: bu3.id } }),
    prisma.doctor.create({ data: { name: "Dr. Ashraf Nour", specialty: "Orthopedics", hospital: "Ain Shams University Hospital", city: "Cairo", phone: "+20 101 333 4455", classification: "B", potentialRevenue: 11000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 2, assignedRepId: medRep1.id, buId: bu2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Dina Samir", specialty: "Obstetrics & Gynecology", hospital: "Kasr El Aini Hospital", city: "Cairo", phone: "+20 101 444 5566", classification: "B", potentialRevenue: 13000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 2, assignedRepId: medRep2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Amr Hassan", specialty: "General Surgery", hospital: "Nasser Institute", city: "Cairo", phone: "+20 101 555 6677", classification: "C", potentialRevenue: 7000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 1, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Nadia Kamel", specialty: "Rheumatology", hospital: "Cairo University Hospital", city: "Cairo", phone: "+20 101 666 7788", classification: "B", potentialRevenue: 14000, isKOL: false, buyingLadderStage: "REGULAR", visitFrequency: 2, assignedRepId: medRep2.id, buId: bu1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Hazem Ali", specialty: "Urology", hospital: "Saudi German Hospital", city: "Cairo", phone: "+20 101 777 8899", classification: "C", potentialRevenue: 9000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 1, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Sahar Mahmoud", specialty: "Nephrology", hospital: "Dar Al Fouad Hospital", city: "Giza", phone: "+20 101 888 9900", classification: "B", potentialRevenue: 16000, isKOL: false, buyingLadderStage: "REGULAR", visitFrequency: 2, assignedRepId: medRep2.id, buId: bu3.id } }),
    prisma.doctor.create({ data: { name: "Dr. Wael Abdel-Fattah", specialty: "Oncology", hospital: "National Cancer Institute", city: "Cairo", phone: "+20 101 999 0011", classification: "A", potentialRevenue: 28000, isKOL: true, buyingLadderStage: "REGULAR", visitFrequency: 3, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Iman Zaki", specialty: "Hematology", hospital: "Ain Shams University Hospital", city: "Cairo", phone: "+20 102 000 1122", classification: "B", potentialRevenue: 12000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 2, assignedRepId: medRep2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Hossam Barakat", specialty: "Psychiatry", hospital: "Abbassia Mental Hospital", city: "Cairo", phone: "+20 102 111 2233", classification: "C", potentialRevenue: 5000, isKOL: false, buyingLadderStage: "UNAWARE", visitFrequency: 1, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Ghada Osman", specialty: "ENT", hospital: "As-Salam International Hospital", city: "Cairo", phone: "+20 102 222 3344", classification: "C", potentialRevenue: 6000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 1, assignedRepId: medRep2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Adel Rashwan", specialty: "Cardiothoracic Surgery", hospital: "National Heart Institute", city: "Cairo", phone: "+20 102 333 4455", classification: "A", potentialRevenue: 35000, isKOL: true, buyingLadderStage: "CHAMPION", visitFrequency: 4, assignedRepId: medRep1.id, buId: bu1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Noha Saad", specialty: "Family Medicine", hospital: "Helwan General Hospital", city: "Cairo", phone: "+20 102 444 5566", classification: "C", potentialRevenue: 4000, isKOL: false, buyingLadderStage: "UNAWARE", visitFrequency: 1, assignedRepId: medRep2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Mahmoud Tawfik", specialty: "Geriatrics", hospital: "Cairo University Hospital", city: "Cairo", phone: "+20 102 555 6677", classification: "C", potentialRevenue: 5500, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 1, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Heba Shaker", specialty: "Internal Medicine", hospital: "Ain Shams University Hospital", city: "Cairo", phone: "+20 102 666 7788", classification: "A", potentialRevenue: 21000, isKOL: false, buyingLadderStage: "REGULAR", visitFrequency: 3, assignedRepId: medRep2.id, buId: bu3.id } }),
    prisma.doctor.create({ data: { name: "Dr. Tamer Galal", specialty: "Ophthalmology", hospital: "Research Institute of Ophthalmology", city: "Cairo", phone: "+20 102 777 8899", classification: "B", potentialRevenue: 10000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 2, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Asmaa Fahmy", specialty: "Infectious Disease", hospital: "Abbassia Fever Hospital", city: "Cairo", phone: "+20 102 888 9900", classification: "B", potentialRevenue: 11000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 2, assignedRepId: medRep2.id, buId: bu2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Sherif Gamal", specialty: "Anesthesiology", hospital: "Dar Al Fouad Hospital", city: "Giza", phone: "+20 102 999 0011", classification: "C", potentialRevenue: 7500, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 1, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Yasmin Helmy", specialty: "Clinical Pathology", hospital: "Ain Shams University Hospital", city: "Cairo", phone: "+20 103 000 1122", classification: "D", potentialRevenue: 3000, isKOL: false, buyingLadderStage: "UNAWARE", visitFrequency: 1, assignedRepId: medRep2.id } }),
    // Additional doctors from Delta & Alexandria
    prisma.doctor.create({ data: { name: "Dr. Alaa El-Din", specialty: "Cardiology", hospital: "Alexandria University Hospital", city: "Alexandria", phone: "+20 103 111 2233", classification: "A", potentialRevenue: 24000, isKOL: true, buyingLadderStage: "REGULAR", visitFrequency: 3, assignedRepId: medRep2.id, buId: bu1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Magdy Amin", specialty: "General Practice", hospital: "Tanta University Hospital", city: "Tanta", phone: "+20 103 222 3344", classification: "B", potentialRevenue: 9000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 2, assignedRepId: medRep2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Salwa Nasr", specialty: "Pediatrics", hospital: "Mansoura Children's Hospital", city: "Mansoura", phone: "+20 103 333 4455", classification: "B", potentialRevenue: 11000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 2, assignedRepId: medRep2.id, buId: bu2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Fady Rizk", specialty: "Neurosurgery", hospital: "Ain Shams University Hospital", city: "Cairo", phone: "+20 103 444 5566", classification: "A", potentialRevenue: 32000, isKOL: true, buyingLadderStage: "TRIAL", visitFrequency: 3, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Nesreen Fouad", specialty: "Dermatology", hospital: "Cairo University Hospital", city: "Cairo", phone: "+20 103 555 6677", classification: "C", potentialRevenue: 5000, isKOL: false, buyingLadderStage: "UNAWARE", visitFrequency: 1, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Ehab Saeed", specialty: "Internal Medicine", hospital: "Suez Canal University Hospital", city: "Ismailia", phone: "+20 103 666 7788", classification: "B", potentialRevenue: 13000, isKOL: false, buyingLadderStage: "REGULAR", visitFrequency: 2, assignedRepId: medRep2.id, buId: bu3.id } }),
    prisma.doctor.create({ data: { name: "Dr. Manal Hosny", specialty: "Endocrinology", hospital: "Assiut University Hospital", city: "Assiut", phone: "+20 103 777 8899", classification: "B", potentialRevenue: 10000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 2, assignedRepId: medRep1.id, buId: bu3.id } }),
    prisma.doctor.create({ data: { name: "Dr. Bassem Wahba", specialty: "Cardiology", hospital: "Luxor International Hospital", city: "Luxor", phone: "+20 103 888 9900", classification: "C", potentialRevenue: 7000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 1, assignedRepId: medRep2.id, buId: bu1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Lamia Abdou", specialty: "Gastroenterology", hospital: "Alexandria University Hospital", city: "Alexandria", phone: "+20 103 999 0011", classification: "B", potentialRevenue: 14000, isKOL: false, buyingLadderStage: "REGULAR", visitFrequency: 2, assignedRepId: medRep2.id, buId: bu3.id } }),
    prisma.doctor.create({ data: { name: "Dr. Hisham Galal", specialty: "Pulmonology", hospital: "Chest Diseases Hospital", city: "Cairo", phone: "+20 104 000 1122", classification: "A", potentialRevenue: 20000, isKOL: true, buyingLadderStage: "CHAMPION", visitFrequency: 4, assignedRepId: medRep1.id, buId: bu2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Sonia Mikhail", specialty: "Rheumatology", hospital: "Cairo University Hospital", city: "Cairo", phone: "+20 104 111 2233", classification: "B", potentialRevenue: 12000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 2, assignedRepId: medRep2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Karim Abdel-Aziz", specialty: "General Practice", hospital: "Port Said General Hospital", city: "Port Said", phone: "+20 104 222 3344", classification: "C", potentialRevenue: 6000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 1, assignedRepId: medRep2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Amira Selim", specialty: "Nephrology", hospital: "Mansoura Kidney Center", city: "Mansoura", phone: "+20 104 333 4455", classification: "A", potentialRevenue: 26000, isKOL: true, buyingLadderStage: "REGULAR", visitFrequency: 3, assignedRepId: medRep2.id, buId: bu3.id } }),
    prisma.doctor.create({ data: { name: "Dr. Reda Hamdy", specialty: "Orthopedics", hospital: "Nasser Institute", city: "Cairo", phone: "+20 104 444 5566", classification: "B", potentialRevenue: 11000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 2, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Nevine Fathi", specialty: "Pediatrics", hospital: "Abu El-Reesh Children's Hospital", city: "Cairo", phone: "+20 104 555 6677", classification: "A", potentialRevenue: 17000, isKOL: true, buyingLadderStage: "CHAMPION", visitFrequency: 3, assignedRepId: medRep1.id, buId: bu2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Mostafa Kamal", specialty: "Cardiology", hospital: "Kobri El-Kobba Military Hospital", city: "Cairo", phone: "+20 104 666 7788", classification: "A", potentialRevenue: 23000, isKOL: false, buyingLadderStage: "REGULAR", visitFrequency: 3, assignedRepId: medRep1.id, buId: bu1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Hala Sami", specialty: "Internal Medicine", hospital: "Beni Suef University Hospital", city: "Beni Suef", phone: "+20 104 777 8899", classification: "C", potentialRevenue: 6500, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 1, assignedRepId: medRep2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Waleed Saad", specialty: "Emergency Medicine", hospital: "As-Salam International Hospital", city: "Cairo", phone: "+20 104 888 9900", classification: "C", potentialRevenue: 5000, isKOL: false, buyingLadderStage: "UNAWARE", visitFrequency: 1, assignedRepId: medRep1.id } }),
    prisma.doctor.create({ data: { name: "Dr. Sawsan Helal", specialty: "Obstetrics & Gynecology", hospital: "Galaa Military Hospital", city: "Cairo", phone: "+20 104 999 0011", classification: "B", potentialRevenue: 12000, isKOL: false, buyingLadderStage: "TRIAL", visitFrequency: 2, assignedRepId: medRep2.id } }),
    prisma.doctor.create({ data: { name: "Dr. Ayman Reda", specialty: "Plastic Surgery", hospital: "Dar Al Fouad Hospital", city: "Giza", phone: "+20 105 000 1122", classification: "C", potentialRevenue: 8000, isKOL: false, buyingLadderStage: "AWARE", visitFrequency: 1, assignedRepId: medRep1.id } }),
  ])
  console.log(`  Created ${doctors.length} doctors`)

  // ─── Sample Visits ──────────────────────────────────────────────────
  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000)

  await prisma.visit.createMany({
    data: [
      { repId: medRep1.id, doctorId: doctors[0].id, dateTime: daysAgo(1), session: "AM", type: "SINGLE", status: "LOGGED", gpsVerified: true, lat: 30.0761, lng: 31.2832, durationMin: 25, notes: "Discussed Cardioprex efficacy data", products: JSON.stringify(["prod-cv-001"]), samplesGiven: JSON.stringify([{ productId: "prod-cv-001", quantity: 5 }]), samplesDistributed: 5, buId: bu1.id },
      { repId: medRep1.id, doctorId: doctors[1].id, dateTime: daysAgo(1), session: "PM", type: "SINGLE", status: "LOGGED", gpsVerified: true, lat: 30.0210, lng: 31.0135, durationMin: 20, notes: "Follow-up on Diabetex prescription feedback", products: JSON.stringify(["prod-dm-001"]), samplesGiven: JSON.stringify([]), samplesDistributed: 0, buId: bu3.id },
      { repId: medRep2.id, doctorId: doctors[3].id, dateTime: daysAgo(1), session: "AM", type: "SINGLE", status: "LOGGED", gpsVerified: true, lat: 30.0889, lng: 31.3312, durationMin: 15, notes: "Introduced Antibio-Z to GP practice", products: JSON.stringify(["prod-ai-001"]), samplesGiven: JSON.stringify([{ productId: "prod-ai-001", quantity: 10 }]), samplesDistributed: 10, buId: bu2.id },
      { repId: medRep1.id, doctorId: doctors[4].id, dateTime: daysAgo(2), session: "AM", type: "DOUBLE", partnerId: medRep2.id, status: "APPROVED", gpsVerified: true, lat: 30.0082, lng: 31.4092, durationMin: 30, notes: "Joint call - presented new clinical trial results", products: JSON.stringify(["prod-cv-001", "prod-cv-002"]), samplesGiven: JSON.stringify([{ productId: "prod-cv-001", quantity: 3 }]), samplesDistributed: 3, buId: bu1.id },
      { repId: medRep2.id, doctorId: doctors[5].id, dateTime: daysAgo(2), session: "PM", type: "SINGLE", status: "LOGGED", gpsVerified: false, durationMin: 18, notes: "Doctor interested in GI portfolio samples", buId: bu3.id },
      { repId: medRep1.id, doctorId: doctors[2].id, dateTime: daysAgo(3), session: "AM", type: "SINGLE", status: "APPROVED", gpsVerified: true, lat: 30.0291, lng: 31.2272, durationMin: 22, notes: "Reviewed latest A1C data for Diabetex", buId: bu3.id },
      { repId: medRep2.id, doctorId: doctors[6].id, dateTime: daysAgo(3), session: "PM", type: "SINGLE", status: "LOGGED", gpsVerified: true, lat: 29.9672, lng: 31.2390, durationMin: 20, notes: "Discussed respiratory product line expansion", buId: bu2.id },
      { repId: medRep1.id, doctorId: doctors[7].id, dateTime: daysAgo(5), session: "AM", type: "SINGLE", status: "APPROVED", gpsVerified: true, durationMin: 15, notes: "Pediatric formulation discussion", buId: bu2.id },
      { repId: medRep2.id, doctorId: doctors[8].id, dateTime: daysAgo(5), session: "PM", type: "SINGLE", status: "REJECTED", gpsVerified: false, durationMin: 10, notes: "Short visit - doctor was busy", buId: bu1.id },
      { repId: medRep1.id, doctorId: doctors[9].id, dateTime: daysAgo(7), session: "AM", type: "SINGLE", status: "LOGGED", gpsVerified: true, durationMin: 12, notes: "Initial introduction visit", isUnplanned: true },
    ],
  })
  console.log("  Created 10 sample visits")

  // ─── Weekly Plans ───────────────────────────────────────────────────
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // start of current week (Sunday)
  weekStart.setHours(0, 0, 0, 0)

  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const sampleDays = JSON.stringify([
    { date: new Date(weekStart.getTime()).toISOString().split("T")[0], visits: [{ doctorId: doctors[0].id, timeSlot: "09:00", session: "AM", visitType: "SINGLE" }, { doctorId: doctors[1].id, timeSlot: "11:00", session: "AM", visitType: "SINGLE" }, { doctorId: doctors[2].id, timeSlot: "14:00", session: "PM", visitType: "SINGLE" }] },
    { date: new Date(weekStart.getTime() + 86400000).toISOString().split("T")[0], visits: [{ doctorId: doctors[4].id, timeSlot: "09:30", session: "AM", visitType: "DOUBLE", partnerId: medRep2.id }, { doctorId: doctors[7].id, timeSlot: "14:30", session: "PM", visitType: "SINGLE" }] },
    { date: new Date(weekStart.getTime() + 2 * 86400000).toISOString().split("T")[0], visits: [{ doctorId: doctors[0].id, timeSlot: "10:00", session: "AM", visitType: "SINGLE" }] },
  ])

  await prisma.weeklyPlan.createMany({
    data: [
      { repId: medRep1.id, weekStartDate: weekStart, days: sampleDays, status: "SUBMITTED", submittedAt: new Date(), approvalLevel: 1 },
      { repId: medRep2.id, weekStartDate: weekStart, days: JSON.stringify([{ date: new Date(weekStart.getTime()).toISOString().split("T")[0], visits: [{ doctorId: doctors[3].id, timeSlot: "09:00", session: "AM", visitType: "SINGLE" }] }]), status: "DRAFT" },
      { repId: medRep1.id, weekStartDate: lastWeekStart, days: sampleDays, status: "APPROVED", submittedAt: new Date(lastWeekStart.getTime() + 86400000), approvedById: bum.id, approvedAt: new Date(lastWeekStart.getTime() + 2 * 86400000), approvalLevel: 3 },
    ],
  })
  console.log("  Created 3 weekly plans")

  // ─── Market Requests ────────────────────────────────────────────────
  await prisma.marketRequest.createMany({
    data: [
      { type: "SAMPLE", requestedById: medRep1.id, doctorId: doctors[0].id, description: "Dr. Ahmed requested Cardioprex samples for clinical evaluation", quantity: 20, priority: "HIGH", status: "APPROVED", approvedById: bum.id, approvedAt: daysAgo(3), buId: bu1.id },
      { type: "EVENT", requestedById: medRep1.id, description: "Request sponsorship for Cardiology CME at Ain Shams - 50 doctors expected", amount: 25000, priority: "HIGH", status: "PENDING", buId: bu1.id },
      { type: "LITERATURE", requestedById: medRep2.id, doctorId: doctors[3].id, description: "Dr. Hanan requested product brochures for Antibio-Z", quantity: 50, priority: "MEDIUM", status: "APPROVED", approvedById: manager.id, approvedAt: daysAgo(5), buId: bu2.id },
      { type: "DISCOUNT", requestedById: medRep2.id, description: "Special pricing request for El Ezaby chain - 500 boxes Omepak", amount: 5000, priority: "MEDIUM", status: "PENDING", buId: bu3.id },
      { type: "DOCTOR_EDIT", requestedById: medRep1.id, doctorId: doctors[8].id, description: "Update Dr. Omar Sherif classification from C to B based on prescription volume increase", priority: "LOW", status: "PENDING", proposedChanges: JSON.stringify({ classification: "B" }), targetEntityId: doctors[8].id },
      { type: "OTHER", requestedById: medRep1.id, description: "Request for additional promotional materials for Ramadan campaign", priority: "LOW", status: "REJECTED", approvedById: bum.id, rejectionReason: "Budget exhausted for Q1", buId: bu1.id },
    ],
  })
  console.log("  Created 6 market requests")

  // ─── Expenses ───────────────────────────────────────────────────────
  await prisma.expense.createMany({
    data: [
      { type: "TRAVEL", amount: 350, date: daysAgo(1), description: "Cairo to Giza round trip - doctor visits", status: "SUBMITTED", submittedById: medRep1.id, startOdometer: 45230, endOdometer: 45310, totalKm: 80, ratePerKm: 4.375 },
      { type: "TRAVEL", amount: 520, date: daysAgo(2), description: "Heliopolis to 6th October - hospital visits", status: "APPROVED", submittedById: medRep2.id, approvedById: dm1.id, startOdometer: 32100, endOdometer: 32220, totalKm: 120, ratePerKm: 4.333 },
      { type: "MEALS", amount: 180, date: daysAgo(3), description: "Lunch meeting with Dr. Youssef Tarek at Saudi German Hospital", status: "APPROVED", submittedById: medRep1.id, approvedById: bum.id },
      { type: "CONFERENCE", amount: 2500, date: daysAgo(10), description: "Registration fee - Egyptian Cardiology Society Annual Meeting", status: "APPROVED", submittedById: medRep1.id, approvedById: bum.id },
      { type: "SAMPLES", amount: 800, date: daysAgo(5), description: "Sample courier delivery to Alexandria", status: "SUBMITTED", submittedById: medRep2.id },
      { type: "TRAVEL", amount: 1200, date: daysAgo(7), description: "Alexandria trip - 2 day field visit", status: "DRAFT", submittedById: medRep2.id, startOdometer: 32220, endOdometer: 32520, totalKm: 300, ratePerKm: 4.0 },
    ],
  })
  console.log("  Created 6 expenses")

  // ─── KPIs ───────────────────────────────────────────────────────────
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const lastPeriod = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`

  await prisma.kPI.createMany({
    data: [
      { userId: medRep1.id, metric: "Visits", value: 42, target: 60, period: currentPeriod, setById: bum.id },
      { userId: medRep1.id, metric: "New Doctors", value: 3, target: 5, period: currentPeriod, setById: bum.id },
      { userId: medRep1.id, metric: "Samples Distributed", value: 180, target: 250, period: currentPeriod, setById: bum.id },
      { userId: medRep2.id, metric: "Visits", value: 38, target: 60, period: currentPeriod, setById: bum.id },
      { userId: medRep2.id, metric: "New Doctors", value: 2, target: 5, period: currentPeriod, setById: bum.id },
      { userId: medRep2.id, metric: "Samples Distributed", value: 150, target: 250, period: currentPeriod, setById: bum.id },
      // Last month (completed)
      { userId: medRep1.id, metric: "Visits", value: 58, target: 60, period: lastPeriod, setById: bum.id },
      { userId: medRep1.id, metric: "New Doctors", value: 4, target: 5, period: lastPeriod, setById: bum.id },
      { userId: medRep2.id, metric: "Visits", value: 55, target: 60, period: lastPeriod, setById: bum.id },
      { userId: medRep2.id, metric: "New Doctors", value: 6, target: 5, period: lastPeriod, setById: bum.id },
    ],
  })
  console.log("  Created 10 KPI records")

  // ─── Standalone Tasks ───────────────────────────────────────────────
  await prisma.standaloneTask.createMany({
    data: [
      { title: "Submit weekly visit report", description: "Compile and submit last week's visit summary", assignedById: bum.id, assignedToId: medRep1.id, dueDate: daysAgo(-2), status: "IN_PROGRESS", priority: "HIGH", kpiMetric: "Visits", buId: bu1.id },
      { title: "Update doctor database for Nasr City", description: "Verify contact info for all assigned doctors in Nasr City district", assignedById: dm1.id, assignedToId: medRep2.id, dueDate: daysAgo(-5), status: "TODO", priority: "MEDIUM" },
      { title: "Prepare CME presentation", description: "Create 20-slide presentation on Cardioprex clinical data for CME event", assignedById: bum.id, assignedToId: medRep1.id, dueDate: daysAgo(-14), status: "TODO", priority: "HIGH", buId: bu1.id },
      { title: "Follow up with Dr. Laila on sample feedback", description: "Get feedback on Omepak samples provided last week", assignedById: manager.id, assignedToId: medRep2.id, dueDate: daysAgo(-3), status: "DONE", priority: "LOW", buId: bu3.id },
      { title: "Attend product training - Diabetes module", description: "Complete online training module for new Diabetex XR formulation", assignedById: bum.id, assignedToId: medRep1.id, dueDate: daysAgo(-7), status: "TODO", priority: "MEDIUM", buId: bu3.id },
    ],
  })
  console.log("  Created 5 standalone tasks")

  // ─── Messages ───────────────────────────────────────────────────────
  await prisma.message.createMany({
    data: [
      { subject: "Weekly Plan Reminder", body: "Please submit your weekly plan for next week by Thursday EOD.", senderId: bum.id, recipientId: medRep1.id, isRead: true },
      { subject: "Re: Weekly Plan Reminder", body: "Noted, will submit today. I have 3 double visits planned with Dr. Youssef.", senderId: medRep1.id, recipientId: bum.id, isRead: true },
      { subject: "New Product Launch - Cardioprex Plus", body: "Launching next month. Training session scheduled for April 15. Please confirm attendance.", senderId: manager.id, recipientId: medRep1.id, isRead: false },
      { subject: "Sample Inventory Low", body: "Antibio-Z samples running low. Please reorder from warehouse.", senderId: medRep2.id, recipientId: employee.id, isRead: false },
      { subject: "Congratulations - Top Rep Q1", body: "Great performance this quarter! You achieved 97% of visit target. Keep it up!", senderId: nsm.id, recipientId: medRep1.id, isRead: false },
    ],
  })
  console.log("  Created 5 messages")

  console.log("\nSeeding completed! Egyptian Pharma ERP database ready.")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
