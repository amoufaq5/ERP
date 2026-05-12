import { PrismaClient } from "@prisma/client"
import { hashSync } from "bcryptjs"

const prisma = new PrismaClient()

// Helper to generate a cuid-like ID
function genId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let id = "cl"
  for (let i = 0; i < 23; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

// Helper to get a random date within the past N months
function pastDate(monthsBack: number): Date {
  const now = new Date()
  const past = new Date(now)
  past.setMonth(past.getMonth() - Math.floor(Math.random() * monthsBack))
  past.setDate(Math.floor(Math.random() * 28) + 1)
  return past
}

// Helper to get a future date
function futureDate(monthsAhead: number): Date {
  const now = new Date()
  const future = new Date(now)
  future.setMonth(future.getMonth() + Math.floor(Math.random() * monthsAhead) + 1)
  future.setDate(Math.floor(Math.random() * 28) + 1)
  return future
}

async function main() {
  console.log("🏭 Seeding PharmaCorp Egypt ERP database...")
  console.log("──────────────────────────────────────────────")

  const TENANT_ID = "tenant_pharmacorp_eg"

  // ═══════════════════════════════════════════════════════════════════════
  // 1. USERS (5 users with different roles)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("👤 Creating users...")

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: TENANT_ID, email: "admin@pharmacorp.eg" } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      name: "Ahmed Hassan",
      email: "admin@pharmacorp.eg",
      passwordHash: hashSync("Admin@2024!", 10),
      role: "ADMIN",
      department: "Management",
      territory: "Egypt-National",
      isActive: true,
    },
  })

  const salesManager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: TENANT_ID, email: "sara.elmasry@pharmacorp.eg" } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      name: "Sara El-Masry",
      email: "sara.elmasry@pharmacorp.eg",
      passwordHash: hashSync("Sales@2024!", 10),
      role: "MANAGER",
      department: "Sales",
      territory: "Egypt-North",
      isActive: true,
    },
  })

  const warehouseManager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: TENANT_ID, email: "omar.farouk@pharmacorp.eg" } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      name: "Omar Farouk",
      email: "omar.farouk@pharmacorp.eg",
      passwordHash: hashSync("Warehouse@2024!", 10),
      role: "MANAGER",
      department: "Warehouse",
      territory: "Egypt-Central",
      isActive: true,
    },
  })

  const qualityManager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: TENANT_ID, email: "nadia.rizk@pharmacorp.eg" } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      name: "Nadia Rizk",
      email: "nadia.rizk@pharmacorp.eg",
      passwordHash: hashSync("Quality@2024!", 10),
      role: "MANAGER",
      department: "Quality",
      territory: "Egypt-National",
      isActive: true,
    },
  })

  const hrManager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: TENANT_ID, email: "khaled.mansour@pharmacorp.eg" } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      name: "Khaled Mansour",
      email: "khaled.mansour@pharmacorp.eg",
      passwordHash: hashSync("HR@2024!", 10),
      role: "MANAGER",
      department: "Human Resources",
      territory: "Egypt-National",
      isActive: true,
    },
  })

  const users = [adminUser, salesManager, warehouseManager, qualityManager, hrManager]
  console.log(`   ✓ Created ${users.length} users`)

  // ═══════════════════════════════════════════════════════════════════════
  // 2. CUSTOMERS (10 - Hospitals, Pharmacies, Distributors)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("🏥 Creating customers (Accounts)...")

  const customerData = [
    { name: "Kasr El-Aini Hospital", industry: "Healthcare", type: "CUSTOMER", city: "Cairo", phone: "+20-2-2364-1234", email: "procurement@kasrelaini.org.eg", address: "Kasr El-Aini St, Old Cairo" },
    { name: "Ain Shams University Hospital", industry: "Healthcare", type: "CUSTOMER", city: "Cairo", phone: "+20-2-2685-5555", email: "pharmacy@ainshams.edu.eg", address: "Ramses St, Abbassia" },
    { name: "Alexandria University Hospital", industry: "Healthcare", type: "CUSTOMER", city: "Alexandria", phone: "+20-3-4862-000", email: "supply@alexuni.edu.eg", address: "Khartoum Square, Azarita" },
    { name: "El-Ezaby Pharmacy Chain", industry: "Retail Pharmacy", type: "CUSTOMER", city: "Cairo", phone: "+20-2-2516-4444", email: "orders@elezaby.com.eg", address: "26 July St, Zamalek" },
    { name: "Seif Pharmacies", industry: "Retail Pharmacy", type: "CUSTOMER", city: "Cairo", phone: "+20-2-3338-9000", email: "purchase@seifpharmacy.com", address: "Mohandessin, Giza" },
    { name: "Roshdy Pharmacy Group", industry: "Retail Pharmacy", type: "CUSTOMER", city: "Alexandria", phone: "+20-3-5445-123", email: "supply@roshdy-pharma.com", address: "Victoria Square, Alexandria" },
    { name: "IBNSINA Pharma Distribution", industry: "Distribution", type: "CUSTOMER", city: "Cairo", phone: "+20-2-2480-1111", email: "orders@ibnsina.com.eg", address: "10th of Ramadan City, Industrial Zone" },
    { name: "Pharma Overseas", industry: "Distribution", type: "CUSTOMER", city: "Cairo", phone: "+20-2-3573-6000", email: "procurement@pharma-overseas.com", address: "Smart Village, October City" },
    { name: "Mansoura University Hospital", industry: "Healthcare", type: "CUSTOMER", city: "Mansoura", phone: "+20-50-222-7000", email: "pharmacy@mans.edu.eg", address: "El-Gomhoria St, Mansoura" },
    { name: "Assiut University Hospital", industry: "Healthcare", type: "CUSTOMER", city: "Assiut", phone: "+20-88-241-1000", email: "procurement@aun.edu.eg", address: "University Campus, Assiut" },
  ]

  const customers: Array<{ id: string; name: string }> = []
  for (const c of customerData) {
    const account = await prisma.account.upsert({
      where: { id: `acc_${c.name.toLowerCase().replace(/\s+/g, "_").slice(0, 20)}` },
      update: {},
      create: {
        id: `acc_${c.name.toLowerCase().replace(/\s+/g, "_").slice(0, 20)}`,
        tenantId: TENANT_ID,
        name: c.name,
        industry: c.industry,
        type: c.type,
        city: c.city,
        country: "Egypt",
        phone: c.phone,
        email: c.email,
        address: c.address,
        ownerId: salesManager.id,
      },
    })
    customers.push(account)
  }
  console.log(`   ✓ Created ${customers.length} customer accounts`)

  // ═══════════════════════════════════════════════════════════════════════
  // 3. SUPPLIERS (10 - Raw Materials & Packaging)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("🏗️  Creating suppliers...")

  const supplierData = [
    { name: "Egyptian Chemical Industries (KIMA)", email: "sales@kima.com.eg", phone: "+20-97-231-2000", city: "Aswan", country: "Egypt", paymentTerms: "Net 60" },
    { name: "Nile Pharmaceutical Chemicals", email: "orders@nilechem.com.eg", phone: "+20-2-2633-8000", city: "Cairo", country: "Egypt", paymentTerms: "Net 45" },
    { name: "Alexandria Packaging Industries", email: "sales@alex-pack.com", phone: "+20-3-4201-555", city: "Alexandria", country: "Egypt", paymentTerms: "Net 30" },
    { name: "Oriental Chemical Industries", email: "supply@oriental-chem.com.eg", phone: "+20-2-2686-3000", city: "Cairo", country: "Egypt", paymentTerms: "Net 45" },
    { name: "Shandong Xinhua Pharmaceutical", email: "export@xinhua-pharma.com", phone: "+86-533-258-8888", city: "Zibo", country: "China", paymentTerms: "LC 90 days" },
    { name: "BASF Pharma Ingredients", email: "pharma-ingredients@basf.com", phone: "+49-621-60-0", city: "Ludwigshafen", country: "Germany", paymentTerms: "Net 60" },
    { name: "Roquette Pharma", email: "pharma@roquette.com", phone: "+33-3-21-63-36-00", city: "Lestrem", country: "France", paymentTerms: "Net 45" },
    { name: "Nile Paper & Packaging Co", email: "sales@nilepaper.com.eg", phone: "+20-2-3530-1200", city: "6th October", country: "Egypt", paymentTerms: "Net 30" },
    { name: "Al-Ahram Glass Manufacturing", email: "orders@ahramglass.com.eg", phone: "+20-2-2577-4000", city: "Cairo", country: "Egypt", paymentTerms: "Net 30" },
    { name: "Colorcon BVBA", email: "orders.emea@colorcon.com", phone: "+32-2-467-4680", city: "Brussels", country: "Belgium", paymentTerms: "Net 60" },
  ]

  const suppliers: Array<{ id: string; name: string }> = []
  for (const s of supplierData) {
    const supplier = await prisma.supplier.upsert({
      where: { id: `sup_${s.name.toLowerCase().replace(/\s+/g, "_").slice(0, 20)}` },
      update: {},
      create: {
        id: `sup_${s.name.toLowerCase().replace(/\s+/g, "_").slice(0, 20)}`,
        tenantId: TENANT_ID,
        name: s.name,
        email: s.email,
        phone: s.phone,
        city: s.city,
        country: s.country,
        paymentTerms: s.paymentTerms,
        status: "ACTIVE",
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
      },
    })
    suppliers.push(supplier)
  }
  console.log(`   ✓ Created ${suppliers.length} suppliers`)

  // ═══════════════════════════════════════════════════════════════════════
  // 4. PRODUCTS (20 Pharmaceutical Products)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("💊 Creating products...")

  const productData = [
    { sku: "PHARM-AMX-500", name: "Amoxicillin 500mg Capsules", category: "Antibiotics", unitPrice: 45.00, costPrice: 22.50, unit: "box" },
    { sku: "PHARM-AZI-250", name: "Azithromycin 250mg Tablets", category: "Antibiotics", unitPrice: 85.00, costPrice: 42.00, unit: "box" },
    { sku: "PHARM-MET-500", name: "Metformin 500mg Tablets", category: "Antidiabetics", unitPrice: 35.00, costPrice: 15.00, unit: "box" },
    { sku: "PHARM-MET-850", name: "Metformin 850mg Tablets", category: "Antidiabetics", unitPrice: 42.00, costPrice: 18.00, unit: "box" },
    { sku: "PHARM-AML-5", name: "Amlodipine 5mg Tablets", category: "Cardiovascular", unitPrice: 55.00, costPrice: 25.00, unit: "box" },
    { sku: "PHARM-AML-10", name: "Amlodipine 10mg Tablets", category: "Cardiovascular", unitPrice: 72.00, costPrice: 32.00, unit: "box" },
    { sku: "PHARM-OME-20", name: "Omeprazole 20mg Capsules", category: "Gastrointestinal", unitPrice: 60.00, costPrice: 28.00, unit: "box" },
    { sku: "PHARM-PAN-40", name: "Pantoprazole 40mg Tablets", category: "Gastrointestinal", unitPrice: 75.00, costPrice: 35.00, unit: "box" },
    { sku: "PHARM-ATV-20", name: "Atorvastatin 20mg Tablets", category: "Cardiovascular", unitPrice: 90.00, costPrice: 40.00, unit: "box" },
    { sku: "PHARM-ATV-40", name: "Atorvastatin 40mg Tablets", category: "Cardiovascular", unitPrice: 120.00, costPrice: 55.00, unit: "box" },
    { sku: "PHARM-CIP-500", name: "Ciprofloxacin 500mg Tablets", category: "Antibiotics", unitPrice: 65.00, costPrice: 30.00, unit: "box" },
    { sku: "PHARM-IBU-400", name: "Ibuprofen 400mg Tablets", category: "Analgesics", unitPrice: 25.00, costPrice: 10.00, unit: "box" },
    { sku: "PHARM-PCM-500", name: "Paracetamol 500mg Tablets", category: "Analgesics", unitPrice: 18.00, costPrice: 7.00, unit: "box" },
    { sku: "PHARM-LOS-50", name: "Losartan 50mg Tablets", category: "Cardiovascular", unitPrice: 68.00, costPrice: 30.00, unit: "box" },
    { sku: "PHARM-CEF-500", name: "Cefuroxime 500mg Tablets", category: "Antibiotics", unitPrice: 110.00, costPrice: 52.00, unit: "box" },
    { sku: "PHARM-CLR-500", name: "Clarithromycin 500mg Tablets", category: "Antibiotics", unitPrice: 95.00, costPrice: 45.00, unit: "box" },
    { sku: "PHARM-ESO-40", name: "Esomeprazole 40mg Capsules", category: "Gastrointestinal", unitPrice: 88.00, costPrice: 40.00, unit: "box" },
    { sku: "PHARM-SLB-100", name: "Sildenafil 100mg Tablets", category: "Urology", unitPrice: 150.00, costPrice: 65.00, unit: "box" },
    { sku: "PHARM-DXM-30", name: "Dextromethorphan 30mg Syrup", category: "Respiratory", unitPrice: 32.00, costPrice: 14.00, unit: "bottle" },
    { sku: "PHARM-FXF-180", name: "Fexofenadine 180mg Tablets", category: "Antihistamines", unitPrice: 58.00, costPrice: 26.00, unit: "box" },
  ]

  const products: Array<{ id: string; sku: string; name: string; unitPrice: number; costPrice: number }> = []
  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        tenantId: TENANT_ID,
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: `${p.name} - Egyptian pharmaceutical product manufactured under GMP standards.`,
        unitPrice: p.unitPrice,
        costPrice: p.costPrice,
        quantity: Math.floor(Math.random() * 5000) + 500,
        reorderLevel: Math.floor(Math.random() * 200) + 50,
        unit: p.unit,
        status: "ACTIVE",
      },
    })
    products.push({ id: product.id, sku: p.sku, name: p.name, unitPrice: p.unitPrice, costPrice: p.costPrice })
  }
  console.log(`   ✓ Created ${products.length} products`)

  // ═══════════════════════════════════════════════════════════════════════
  // 5. WAREHOUSES (5 locations)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("🏪 Creating warehouses...")

  const warehouseData = [
    { name: "Cairo Central Warehouse", location: "10th of Ramadan City, Cairo", capacity: 50000 },
    { name: "Alexandria Distribution Center", location: "Borg El-Arab Industrial Zone, Alexandria", capacity: 30000 },
    { name: "Assiut Regional Warehouse", location: "Assiut Industrial Zone, Upper Egypt", capacity: 15000 },
    { name: "Mansoura Storage Facility", location: "Mansoura Industrial Area, Dakahlia", capacity: 20000 },
    { name: "Hurghada Cold Storage", location: "Hurghada Industrial Zone, Red Sea", capacity: 10000 },
  ]

  const warehouses: Array<{ id: string; name: string }> = []
  for (const w of warehouseData) {
    const warehouse = await prisma.warehouse.upsert({
      where: { id: `wh_${w.name.toLowerCase().replace(/\s+/g, "_").slice(0, 20)}` },
      update: {},
      create: {
        id: `wh_${w.name.toLowerCase().replace(/\s+/g, "_").slice(0, 20)}`,
        tenantId: TENANT_ID,
        name: w.name,
        location: w.location,
        capacity: w.capacity,
        managerId: warehouseManager.id,
      },
    })
    warehouses.push(warehouse)
  }
  console.log(`   ✓ Created ${warehouses.length} warehouses`)

  // ═══════════════════════════════════════════════════════════════════════
  // 6. INVOICES (15 in various statuses)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("🧾 Creating invoices...")

  const invoiceStatuses = ["DRAFT", "DRAFT", "SENT", "SENT", "SENT", "PAID", "PAID", "PAID", "PAID", "PAID", "PAID", "OVERDUE", "OVERDUE", "OVERDUE", "SENT"]

  const invoices: Array<{ id: string }> = []
  for (let i = 0; i < 15; i++) {
    const invoiceDate = pastDate(6)
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + 30)
    const customer = customers[i % customers.length]
    const selectedProducts = products.slice((i * 2) % products.length, ((i * 2) % products.length) + 3)
    const subtotal = selectedProducts.reduce((sum, p) => sum + p.unitPrice * (Math.floor(Math.random() * 50) + 10), 0)
    const tax = subtotal * 0.14 // Egypt VAT is 14%
    const total = subtotal + tax

    const invoiceNumber = `INV-2024-${String(i + 1).padStart(4, "0")}`

    const invoice = await prisma.invoice.upsert({
      where: { invoiceNumber },
      update: {},
      create: {
        tenantId: TENANT_ID,
        invoiceNumber,
        customerId: customer.id,
        date: invoiceDate,
        dueDate,
        status: invoiceStatuses[i],
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        notes: `Invoice for ${customer.name} - Pharmaceutical products supply`,
      },
    })

    // Create invoice items
    for (const product of selectedProducts) {
      const qty = Math.floor(Math.random() * 50) + 10
      const itemTotal = product.unitPrice * qty
      await prisma.invoiceItem.create({
        data: {
          tenantId: TENANT_ID,
          invoiceId: invoice.id,
          description: product.name,
          quantity: qty,
          unitPrice: product.unitPrice,
          tax: itemTotal * 0.14,
          total: itemTotal * 1.14,
        },
      })
    }

    invoices.push(invoice)
  }
  console.log(`   ✓ Created ${invoices.length} invoices with line items`)

  // ═══════════════════════════════════════════════════════════════════════
  // 7. PURCHASE ORDERS (10 in various statuses)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("📋 Creating purchase orders...")

  const poStatuses = ["DRAFT", "APPROVED", "APPROVED", "SENT", "SENT", "RECEIVED", "RECEIVED", "RECEIVED", "APPROVED", "DRAFT"]

  for (let i = 0; i < 10; i++) {
    const poDate = pastDate(5)
    const expectedDate = new Date(poDate)
    expectedDate.setDate(expectedDate.getDate() + 21)
    const supplier = suppliers[i % suppliers.length]
    const selectedProducts = products.slice((i * 2) % products.length, ((i * 2) % products.length) + 2)
    const total = selectedProducts.reduce((sum, p) => sum + p.costPrice * (Math.floor(Math.random() * 200) + 50), 0)

    const poNumber = `PO-2024-${String(i + 1).padStart(4, "0")}`

    const po = await prisma.purchaseOrder.upsert({
      where: { poNumber },
      update: {},
      create: {
        tenantId: TENANT_ID,
        poNumber,
        supplierId: supplier.id,
        date: poDate,
        expectedDate,
        status: poStatuses[i],
        total: parseFloat(total.toFixed(2)),
        notes: `Purchase order for raw materials from ${supplier.name}`,
        createdById: warehouseManager.id,
      },
    })

    // Create PO items
    for (const product of selectedProducts) {
      const qty = Math.floor(Math.random() * 200) + 50
      await prisma.purchaseOrderItem.create({
        data: {
          tenantId: TENANT_ID,
          purchaseOrderId: po.id,
          productId: product.id,
          description: `${product.name} - bulk purchase`,
          quantity: qty,
          unitPrice: product.costPrice,
          total: product.costPrice * qty,
        },
      })
    }
  }
  console.log("   ✓ Created 10 purchase orders with line items")

  // ═══════════════════════════════════════════════════════════════════════
  // 8. DEPARTMENTS (5)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("🏢 Creating departments...")

  const departmentData = [
    { name: "Sales & Marketing", managerId: salesManager.id, description: "Commercial operations, sales force, and marketing campaigns", budget: 5000000 },
    { name: "Manufacturing", managerId: warehouseManager.id, description: "Drug manufacturing, production lines, and packaging", budget: 12000000 },
    { name: "Quality Assurance & Control", managerId: qualityManager.id, description: "QA/QC, compliance, batch release, and regulatory affairs", budget: 3000000 },
    { name: "Warehouse & Logistics", managerId: warehouseManager.id, description: "Storage, distribution, cold chain, and fleet management", budget: 4000000 },
    { name: "Finance & Administration", managerId: adminUser.id, description: "Accounting, budgeting, payroll, and corporate governance", budget: 2000000 },
  ]

  const departments: Array<{ id: string; name: string }> = []
  for (const d of departmentData) {
    const dept = await prisma.department.upsert({
      where: { id: `dept_${d.name.toLowerCase().replace(/[^a-z]/g, "_").slice(0, 20)}` },
      update: {},
      create: {
        id: `dept_${d.name.toLowerCase().replace(/[^a-z]/g, "_").slice(0, 20)}`,
        tenantId: TENANT_ID,
        name: d.name,
        managerId: d.managerId,
        description: d.description,
        budget: d.budget,
      },
    })
    departments.push(dept)
  }
  console.log(`   ✓ Created ${departments.length} departments`)

  // ═══════════════════════════════════════════════════════════════════════
  // 9. EMPLOYEES (10 across departments)
  // ═══════��═══════════════════════════════════════════════════════════════
  console.log("👥 Creating employees...")

  const employeeData = [
    { firstName: "Mohamed", lastName: "Abdallah", email: "m.abdallah@pharmacorp.eg", position: "Senior Sales Rep", departmentIdx: 0, salary: 18000 },
    { firstName: "Fatma", lastName: "El-Sherif", email: "f.elsherif@pharmacorp.eg", position: "Marketing Specialist", departmentIdx: 0, salary: 15000 },
    { firstName: "Youssef", lastName: "Kamal", email: "y.kamal@pharmacorp.eg", position: "Production Supervisor", departmentIdx: 1, salary: 20000 },
    { firstName: "Amira", lastName: "Hossam", email: "a.hossam@pharmacorp.eg", position: "Machine Operator Lead", departmentIdx: 1, salary: 14000 },
    { firstName: "Hassan", lastName: "Ibrahim", email: "h.ibrahim@pharmacorp.eg", position: "QC Analyst", departmentIdx: 2, salary: 16000 },
    { firstName: "Dina", lastName: "Mostafa", email: "d.mostafa@pharmacorp.eg", position: "Regulatory Affairs Specialist", departmentIdx: 2, salary: 17000 },
    { firstName: "Tarek", lastName: "Sayed", email: "t.sayed@pharmacorp.eg", position: "Logistics Coordinator", departmentIdx: 3, salary: 13000 },
    { firstName: "Noha", lastName: "Adel", email: "n.adel@pharmacorp.eg", position: "Inventory Controller", departmentIdx: 3, salary: 12500 },
    { firstName: "Mahmoud", lastName: "Fathy", email: "m.fathy@pharmacorp.eg", position: "Senior Accountant", departmentIdx: 4, salary: 19000 },
    { firstName: "Reem", lastName: "Nabil", email: "r.nabil@pharmacorp.eg", position: "Payroll Specialist", departmentIdx: 4, salary: 14500 },
  ]

  const employees: Array<{ id: string; firstName: string; lastName: string }> = []
  for (let i = 0; i < employeeData.length; i++) {
    const e = employeeData[i]
    const empNumber = `EMP-${String(i + 1).padStart(4, "0")}`

    const employee = await prisma.employee.upsert({
      where: { employeeNumber: empNumber },
      update: {},
      create: {
        tenantId: TENANT_ID,
        employeeNumber: empNumber,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        phone: `+20-10-${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        departmentId: departments[e.departmentIdx].id,
        position: e.position,
        hireDate: pastDate(24),
        salary: e.salary,
        status: "ACTIVE",
      },
    })
    employees.push(employee)
  }
  console.log(`   ✓ Created ${employees.length} employees`)

  // ═══════════════════════════════════════════════════════════════════════
  // 10. QAQC ITEMS (2 Deviations, 2 CAPAs, 1 Batch Release)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("🔬 Creating QAQC items...")

  // Deviations
  await prisma.deviation.upsert({
    where: { id: "dev_001_temperature" },
    update: {},
    create: {
      id: "dev_001_temperature",
      tenantId: TENANT_ID,
      number: "DEV-2024-001",
      title: "Temperature Excursion in Cold Storage Zone B",
      type: "UNPLANNED",
      status: "UNDER_INVESTIGATION",
      severity: "MAJOR",
      department: "Warehouse & Logistics",
      description: "Temperature in Cold Storage Zone B reached 9.2°C for approximately 45 minutes during the night shift on 2024-10-15. Normal operating range is 2-8°C. The excursion was detected by the automated monitoring system.",
      rootCause: "Compressor unit #3 experienced intermittent failure due to worn contactor relay.",
      impactAssessment: "12 pallets of temperature-sensitive insulin products were stored in the affected zone. Products remained within manufacturer-specified stability range per accelerated study data.",
      immediateAction: "Products quarantined pending QA review. Backup compressor activated within 15 minutes of alert.",
      reportedBy: qualityManager.id,
      reportedDate: new Date("2024-10-15"),
    },
  })

  await prisma.deviation.upsert({
    where: { id: "dev_002_labeling" },
    update: {},
    create: {
      id: "dev_002_labeling",
      tenantId: TENANT_ID,
      number: "DEV-2024-002",
      title: "Labeling Error on Batch AMX-2024-1105",
      type: "UNPLANNED",
      status: "CAPA_REQUIRED",
      severity: "MINOR",
      department: "Manufacturing",
      description: "During in-process check, 200 units of Amoxicillin 500mg were found with incorrect expiry date printed (showing 2025-11 instead of 2026-11). Error caught before release to distribution.",
      rootCause: "Printer date code was not updated after maintenance reset. Operator failed to verify print test sample.",
      impactAssessment: "No product reached market. 200 units require relabeling. No patient safety impact.",
      immediateAction: "Affected units segregated and quarantined. Production line stopped for printer verification.",
      reportedBy: warehouseManager.id,
      reportedDate: new Date("2024-11-05"),
    },
  })

  // CAPAs
  const capa1 = await prisma.cAPA.upsert({
    where: { id: "capa_001_compressor" },
    update: {},
    create: {
      id: "capa_001_compressor",
      tenantId: TENANT_ID,
      number: "CAPA-2024-001",
      title: "Cold Storage Compressor Preventive Maintenance Enhancement",
      type: "CORRECTIVE",
      status: "IMPLEMENTATION",
      priority: "HIGH",
      source: "Deviation DEV-2024-001",
      description: "Implement enhanced preventive maintenance schedule for cold storage compressors and install redundant temperature monitoring with SMS alerts.",
      rootCause: "Preventive maintenance interval for compressor contactors was 12 months; actual wear rate requires 6-month replacement cycle.",
      assignedTo: warehouseManager.id,
      dueDate: new Date("2025-01-15"),
      effectivenessCheck: "Monitor temperature excursion events over 6-month period. Target: zero unplanned excursions.",
    },
  })

  await prisma.cAPAAction.createMany({
    data: [
      {
        tenantId: TENANT_ID,
        capaId: capa1.id,
        description: "Replace all compressor contactors in cold storage zones A, B, and C",
        assignedTo: warehouseManager.id,
        dueDate: new Date("2024-12-01"),
        status: "COMPLETED",
        completedDate: new Date("2024-11-28"),
        evidence: "Maintenance work order WO-2024-887 completed. New Schneider LC1D09 contactors installed.",
      },
      {
        tenantId: TENANT_ID,
        capaId: capa1.id,
        description: "Install redundant wireless temperature sensors with SMS gateway",
        assignedTo: warehouseManager.id,
        dueDate: new Date("2025-01-10"),
        status: "IN_PROGRESS",
      },
      {
        tenantId: TENANT_ID,
        capaId: capa1.id,
        description: "Revise PM schedule from 12-month to 6-month cycle for all refrigeration contactors",
        assignedTo: qualityManager.id,
        dueDate: new Date("2024-12-15"),
        status: "COMPLETED",
        completedDate: new Date("2024-12-10"),
        evidence: "SOP-WH-015 Rev 3 approved and effective.",
      },
    ],
    skipDuplicates: true,
  })

  await prisma.cAPA.upsert({
    where: { id: "capa_002_labeling" },
    update: {},
    create: {
      id: "capa_002_labeling",
      tenantId: TENANT_ID,
      number: "CAPA-2024-002",
      title: "Labeling Process Control Improvement",
      type: "PREVENTIVE",
      status: "ACTION_PLAN",
      priority: "MEDIUM",
      source: "Deviation DEV-2024-002",
      description: "Implement automated date code verification system using vision inspection camera on all packaging lines.",
      rootCause: "Manual verification of date codes is error-prone, especially after printer maintenance or line changeover.",
      assignedTo: qualityManager.id,
      dueDate: new Date("2025-03-01"),
      effectivenessCheck: "Zero labeling deviations for 3 consecutive months after implementation.",
    },
  })

  // Batch Release
  await prisma.batchRelease.upsert({
    where: { id: "br_001_metformin" },
    update: {},
    create: {
      id: "br_001_metformin",
      tenantId: TENANT_ID,
      batchNumber: "MET500-2024-B089",
      productId: products[2].id, // Metformin 500mg
      status: "UNDER_REVIEW",
      reviewedBy: qualityManager.id,
      releaseDate: null,
      expiryDate: new Date("2026-11-30"),
      qaDecision: null,
      notes: "Batch of 50,000 units. All in-process controls within specification. Dissolution test results pending final review. Stability indicating assay: 99.8%. Microbial limits: compliant.",
    },
  })

  console.log("   ✓ Created 2 Deviations, 2 CAPAs with actions, 1 Batch Release")

  // ═══════════════════════════════════════════════════════════════════════
  // 11. SYSTEM SETTINGS
  // ═══════════════════════════════════════════════════════════════════════
  console.log("⚙️  Creating system settings...")

  const settings = [
    { key: "company_name", value: "PharmaCorp Egypt", category: "general" },
    { key: "company_name_ar", value: "فارماكورب مصر", category: "general" },
    { key: "currency", value: "EGP", category: "finance" },
    { key: "tax_rate", value: "14", category: "finance" },
    { key: "fiscal_year_start", value: "01-07", category: "finance" },
    { key: "default_payment_terms", value: "30", category: "finance" },
    { key: "invoice_prefix", value: "INV", category: "finance" },
    { key: "po_prefix", value: "PO", category: "procurement" },
    { key: "date_format", value: "DD/MM/YYYY", category: "general" },
    { key: "timezone", value: "Africa/Cairo", category: "general" },
  ]

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: {
        tenantId: TENANT_ID,
        key: s.key,
        value: s.value,
        category: s.category,
      },
    })
  }
  console.log("   ✓ Created system settings")

  // ═══════════════════════════════════════════════════════════════════════
  // 12. STOCK MOVEMENTS (sample movements)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("📦 Creating stock movements...")

  for (let i = 0; i < 10; i++) {
    const product = products[i % products.length]
    const warehouse = warehouses[i % warehouses.length]
    await prisma.stockMovement.create({
      data: {
        tenantId: TENANT_ID,
        productId: product.id,
        warehouseId: warehouse.id,
        type: i % 3 === 0 ? "IN" : i % 3 === 1 ? "OUT" : "TRANSFER",
        quantity: Math.floor(Math.random() * 500) + 50,
        date: pastDate(3),
        reference: `SM-2024-${String(i + 1).padStart(3, "0")}`,
        notes: `Stock movement for ${product.name}`,
        createdById: warehouseManager.id,
      },
    })
  }
  console.log("   ✓ Created 10 stock movements")

  // ═══════════════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════════════
  console.log("")
  console.log("══════════════════════════════════════════════════")
  console.log("✅ Database seeded successfully!")
  console.log("══════════════════════════════════════════════════")
  console.log("")
  console.log("Demo credentials:")
  console.log("  Admin:     admin@pharmacorp.eg / Admin@2024!")
  console.log("  Sales Mgr: sara.elmasry@pharmacorp.eg / Sales@2024!")
  console.log("  WH Mgr:    omar.farouk@pharmacorp.eg / Warehouse@2024!")
  console.log("  QA Mgr:    nadia.rizk@pharmacorp.eg / Quality@2024!")
  console.log("  HR Mgr:    khaled.mansour@pharmacorp.eg / HR@2024!")
  console.log("")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
