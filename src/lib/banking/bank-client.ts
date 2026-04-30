// ─── Banking Integration Client ─────────────────────────────────────────────

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  swift: string;
  currency: string;
  balance: number;
  lastSynced: string;
  isActive: boolean;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  type: "credit" | "debit";
  balance: number;
  category?: string;
  matchedInvoiceId?: string;
  matchStatus: "unmatched" | "matched" | "partial" | "excluded";
}

export interface ReconciliationAdjustment {
  id: string;
  type: "bank_charge" | "interest" | "correction" | "timing" | "other";
  description: string;
  amount: number;
  side: "bank" | "book";
  createdAt: string;
}

export interface ReconciliationSession {
  id: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  bankBalance: number;
  bookBalance: number;
  difference: number;
  status: "in_progress" | "completed" | "discrepancy";
  matchedCount: number;
  unmatchedCount: number;
  adjustments: ReconciliationAdjustment[];
  createdAt: string;
  completedAt?: string;
}

export interface PaymentLink {
  id: string;
  amount: number;
  currency: string;
  description: string;
  method: "bank_transfer" | "credit_card" | "mobile_wallet";
  status: "active" | "paid" | "expired";
  url: string;
  qrData: string;
  createdAt: string;
  expiresAt: string;
}

// ─── Storage keys ───────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  accounts: "banking_accounts",
  transactions: "banking_transactions",
  reconciliations: "banking_reconciliations",
  paymentLinks: "banking_payment_links",
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T[] = []): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const SEED_ACCOUNTS: BankAccount[] = [
  {
    id: "bk-001",
    bankName: "CIB",
    accountNumber: "1001-2345-6789-01",
    iban: "EG380010100012345678901",
    swift: "CIBEEGCX",
    currency: "EGP",
    balance: 12450000,
    lastSynced: daysAgo(0),
    isActive: true,
  },
  {
    id: "bk-002",
    bankName: "National Bank of Egypt",
    accountNumber: "2002-3456-7890-02",
    iban: "EG380020200023456789002",
    swift: "NBEGEGCX",
    currency: "EGP",
    balance: 4820000,
    lastSynced: daysAgo(1),
    isActive: true,
  },
  {
    id: "bk-003",
    bankName: "HSBC Egypt",
    accountNumber: "3003-4567-8901-03",
    iban: "EG380030300034567890103",
    swift: "BBMEEGCX",
    currency: "USD",
    balance: 285000,
    lastSynced: daysAgo(2),
    isActive: true,
  },
  {
    id: "bk-004",
    bankName: "Banque Misr",
    accountNumber: "4004-5678-9012-04",
    iban: "EG380040400045678901204",
    swift: "BMISEGCX",
    currency: "EGP",
    balance: 2150000,
    lastSynced: daysAgo(3),
    isActive: false,
  },
];

const SEED_TRANSACTIONS: BankTransaction[] = [
  { id: "bt-001", accountId: "bk-001", date: daysAgo(1), description: "Payment from Alpha Pharma Distributors", reference: "INV-2026-0001", amount: 500000, type: "credit", balance: 12450000, category: "Sales Receipt", matchedInvoiceId: "inv-001", matchStatus: "matched" },
  { id: "bt-002", accountId: "bk-001", date: daysAgo(2), description: "BASF excipient shipment payment", reference: "PO-2026-0003", amount: 620000, type: "debit", balance: 11950000, category: "Supplier Payment", matchStatus: "matched" },
  { id: "bt-003", accountId: "bk-001", date: daysAgo(3), description: "Bank charges Q2", reference: "CHG-042026", amount: 4500, type: "debit", balance: 12570000, category: "Bank Charges", matchStatus: "excluded" },
  { id: "bt-004", accountId: "bk-002", date: daysAgo(2), description: "Cleopatra Hospital cheque clearance", reference: "CHQ-2026-0004", amount: 340000, type: "credit", balance: 4820000, category: "Cheque Clearance", matchStatus: "matched" },
  { id: "bt-005", accountId: "bk-002", date: daysAgo(4), description: "Seif Pharmacies partial payment", reference: "INV-2026-0002", amount: 300000, type: "credit", balance: 4480000, category: "Sales Receipt", matchedInvoiceId: "inv-002", matchStatus: "partial" },
  { id: "bt-006", accountId: "bk-001", date: daysAgo(5), description: "Staff salary transfer — April batch", reference: "SAL-042026", amount: 1850000, type: "debit", balance: 12574500, category: "Payroll", matchStatus: "matched" },
  { id: "bt-007", accountId: "bk-003", date: daysAgo(3), description: "USD import payment — raw materials", reference: "IMP-2026-0012", amount: 45000, type: "debit", balance: 285000, category: "Import Payment", matchStatus: "unmatched" },
  { id: "bt-008", accountId: "bk-001", date: daysAgo(6), description: "Unknown deposit", reference: "DEP-UNKNOWN-001", amount: 75000, type: "credit", balance: 14424500, category: undefined, matchStatus: "unmatched" },
  { id: "bt-009", accountId: "bk-002", date: daysAgo(1), description: "Medicare Hospitals payment", reference: "INV-2026-0005", amount: 220000, type: "credit", balance: 5040000, category: "Sales Receipt", matchStatus: "unmatched" },
  { id: "bt-010", accountId: "bk-001", date: daysAgo(0), description: "Interest earned — April", reference: "INT-042026", amount: 18500, type: "credit", balance: 12468500, category: "Interest Income", matchStatus: "excluded" },
  { id: "bt-011", accountId: "bk-003", date: daysAgo(7), description: "Wire transfer from EU distributor", reference: "WT-EU-2026-008", amount: 32000, type: "credit", balance: 330000, category: "Export Receipt", matchStatus: "unmatched" },
  { id: "bt-012", accountId: "bk-002", date: daysAgo(5), description: "Utility payment — factory", reference: "UTIL-042026", amount: 85000, type: "debit", balance: 4180000, category: "Utilities", matchStatus: "matched" },
];

const SEED_RECONCILIATIONS: ReconciliationSession[] = [
  {
    id: "rec-001",
    accountId: "bk-001",
    periodStart: daysAgo(30),
    periodEnd: daysAgo(0),
    bankBalance: 12450000,
    bookBalance: 12445500,
    difference: 4500,
    status: "completed",
    matchedCount: 18,
    unmatchedCount: 0,
    adjustments: [
      { id: "adj-001", type: "bank_charge", description: "Q1 bank maintenance fee", amount: 4500, side: "book", createdAt: daysAgo(5) },
    ],
    createdAt: daysAgo(5),
    completedAt: daysAgo(4),
  },
];

const SEED_PAYMENT_LINKS: PaymentLink[] = [
  {
    id: "pl-001",
    amount: 150000,
    currency: "EGP",
    description: "Invoice INV-2026-0010 — Delta Pharma",
    method: "bank_transfer",
    status: "active",
    url: "https://pay.pharmaerp.com/pl-001",
    qrData: "pharmaerp://pay/pl-001/150000/EGP",
    createdAt: daysAgo(2),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
];

// ─── Account Functions ──────────────────────────────────────────────────────

export function getAccounts(): BankAccount[] {
  const stored = loadFromStorage<BankAccount>(STORAGE_KEYS.accounts);
  if (stored.length === 0) {
    saveToStorage(STORAGE_KEYS.accounts, SEED_ACCOUNTS);
    return SEED_ACCOUNTS;
  }
  return stored;
}

export function addAccount(account: Omit<BankAccount, "id" | "lastSynced">): BankAccount {
  const accounts = getAccounts();
  const newAccount: BankAccount = {
    ...account,
    id: generateId("bk"),
    lastSynced: new Date().toISOString(),
  };
  accounts.push(newAccount);
  saveToStorage(STORAGE_KEYS.accounts, accounts);
  return newAccount;
}

export function syncAccount(accountId: string): BankAccount | null {
  const accounts = getAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return null;
  accounts[idx].lastSynced = new Date().toISOString();
  // Simulate small balance fluctuation
  accounts[idx].balance += Math.round((Math.random() - 0.5) * 10000);
  saveToStorage(STORAGE_KEYS.accounts, accounts);
  return accounts[idx];
}

// ─── Transaction Functions ──────────────────────────────────────────────────

export function getTransactions(filters?: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  matchStatus?: string;
  type?: string;
}): BankTransaction[] {
  let transactions = loadFromStorage<BankTransaction>(STORAGE_KEYS.transactions);
  if (transactions.length === 0) {
    saveToStorage(STORAGE_KEYS.transactions, SEED_TRANSACTIONS);
    transactions = SEED_TRANSACTIONS;
  }

  if (filters?.accountId) {
    transactions = transactions.filter((tx) => tx.accountId === filters.accountId);
  }
  if (filters?.dateFrom) {
    transactions = transactions.filter((tx) => tx.date >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    transactions = transactions.filter((tx) => tx.date <= filters.dateTo!);
  }
  if (filters?.matchStatus) {
    transactions = transactions.filter((tx) => tx.matchStatus === filters.matchStatus);
  }
  if (filters?.type) {
    transactions = transactions.filter((tx) => tx.type === filters.type);
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function importBankStatement(csvData: string, accountId: string): BankTransaction[] {
  const transactions = getTransactions();
  const lines = csvData.trim().split("\n");
  const imported: BankTransaction[] = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim().replace(/"/g, ""));
    if (parts.length < 4) continue;

    const [date, description, reference, amountStr] = parts;
    const amount = Math.abs(parseFloat(amountStr));
    if (isNaN(amount)) continue;

    const tx: BankTransaction = {
      id: generateId("bt"),
      accountId,
      date: new Date(date).toISOString(),
      description,
      reference: reference || `IMP-${Date.now()}`,
      amount,
      type: parseFloat(amountStr) >= 0 ? "credit" : "debit",
      balance: 0, // Will be calculated
      matchStatus: "unmatched",
    };
    imported.push(tx);
  }

  // Calculate running balances
  const account = getAccounts().find((a) => a.id === accountId);
  let runningBalance = account?.balance ?? 0;
  for (const tx of imported) {
    if (tx.type === "credit") {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.amount;
    }
    tx.balance = runningBalance;
  }

  const allTransactions = [...transactions, ...imported];
  saveToStorage(STORAGE_KEYS.transactions, allTransactions);
  return imported;
}

// ─── Auto-Match Algorithm ───────────────────────────────────────────────────

interface MatchableEntry {
  id: string;
  reference: string;
  amount: number;
  type: "invoice" | "payment";
}

export function autoMatchTransactions(
  accountId: string,
  invoices: MatchableEntry[],
  payments: MatchableEntry[]
): { matched: number; unmatched: number } {
  const transactions = getTransactions({ accountId });
  let matchedCount = 0;
  let unmatchedCount = 0;

  const allEntries = [...invoices, ...payments];

  for (const tx of transactions) {
    if (tx.matchStatus === "matched" || tx.matchStatus === "excluded") continue;

    // Strategy 1: Exact reference match
    let matched = allEntries.find(
      (entry) =>
        entry.reference.toLowerCase() === tx.reference.toLowerCase() &&
        Math.abs(entry.amount - tx.amount) < 0.01
    );

    // Strategy 2: Partial reference match + exact amount
    if (!matched) {
      matched = allEntries.find(
        (entry) =>
          (tx.reference.toLowerCase().includes(entry.reference.toLowerCase()) ||
            entry.reference.toLowerCase().includes(tx.reference.toLowerCase())) &&
          Math.abs(entry.amount - tx.amount) < 0.01
      );
    }

    // Strategy 3: Exact amount match (within same day tolerance)
    if (!matched) {
      matched = allEntries.find(
        (entry) => Math.abs(entry.amount - tx.amount) < 0.01
      );
    }

    if (matched) {
      tx.matchStatus = "matched";
      tx.matchedInvoiceId = matched.id;
      matchedCount++;
      // Remove from available entries to prevent double-matching
      const idx = allEntries.indexOf(matched);
      if (idx > -1) allEntries.splice(idx, 1);
    } else {
      // Check for partial amount matches
      const partialMatch = allEntries.find(
        (entry) =>
          (tx.reference.toLowerCase().includes(entry.reference.toLowerCase()) ||
            entry.reference.toLowerCase().includes(tx.reference.toLowerCase())) &&
          tx.amount < entry.amount
      );
      if (partialMatch) {
        tx.matchStatus = "partial";
        tx.matchedInvoiceId = partialMatch.id;
        matchedCount++;
      } else {
        unmatchedCount++;
      }
    }
  }

  // Save updated transactions
  const allTx = loadFromStorage<BankTransaction>(STORAGE_KEYS.transactions);
  for (const tx of transactions) {
    const idx = allTx.findIndex((t) => t.id === tx.id);
    if (idx > -1) allTx[idx] = tx;
  }
  saveToStorage(STORAGE_KEYS.transactions, allTx);

  return { matched: matchedCount, unmatched: unmatchedCount };
}

export function manualMatchTransaction(transactionId: string, invoiceId: string): boolean {
  const transactions = loadFromStorage<BankTransaction>(STORAGE_KEYS.transactions);
  const idx = transactions.findIndex((tx) => tx.id === transactionId);
  if (idx === -1) return false;

  transactions[idx].matchStatus = "matched";
  transactions[idx].matchedInvoiceId = invoiceId;
  saveToStorage(STORAGE_KEYS.transactions, transactions);
  return true;
}

export function excludeTransaction(transactionId: string): boolean {
  const transactions = loadFromStorage<BankTransaction>(STORAGE_KEYS.transactions);
  const idx = transactions.findIndex((tx) => tx.id === transactionId);
  if (idx === -1) return false;

  transactions[idx].matchStatus = "excluded";
  saveToStorage(STORAGE_KEYS.transactions, transactions);
  return true;
}

// ─── Reconciliation Functions ───────────────────────────────────────────────

export function getReconciliations(): ReconciliationSession[] {
  const stored = loadFromStorage<ReconciliationSession>(STORAGE_KEYS.reconciliations);
  if (stored.length === 0) {
    saveToStorage(STORAGE_KEYS.reconciliations, SEED_RECONCILIATIONS);
    return SEED_RECONCILIATIONS;
  }
  return stored;
}

export function createReconciliation(
  accountId: string,
  periodStart: string,
  periodEnd: string
): ReconciliationSession {
  const reconciliations = getReconciliations();
  const account = getAccounts().find((a) => a.id === accountId);
  const transactions = getTransactions({ accountId, dateFrom: periodStart, dateTo: periodEnd });

  const matchedCount = transactions.filter((tx) => tx.matchStatus === "matched").length;
  const unmatchedCount = transactions.filter(
    (tx) => tx.matchStatus === "unmatched" || tx.matchStatus === "partial"
  ).length;

  const bankBalance = account?.balance ?? 0;
  // Book balance simulation: sum of matched transactions
  const bookBalance = transactions.reduce((sum, tx) => {
    if (tx.matchStatus !== "excluded") {
      return sum + (tx.type === "credit" ? tx.amount : -tx.amount);
    }
    return sum;
  }, bankBalance - (Math.random() * 50000));

  const difference = Math.round((bankBalance - bookBalance) * 100) / 100;

  const session: ReconciliationSession = {
    id: generateId("rec"),
    accountId,
    periodStart,
    periodEnd,
    bankBalance,
    bookBalance: Math.round(bookBalance),
    difference: Math.round(difference),
    status: Math.abs(difference) < 100 ? "in_progress" : "discrepancy",
    matchedCount,
    unmatchedCount,
    adjustments: [],
    createdAt: new Date().toISOString(),
  };

  reconciliations.push(session);
  saveToStorage(STORAGE_KEYS.reconciliations, reconciliations);
  return session;
}

export function addReconciliationAdjustment(
  sessionId: string,
  adjustment: Omit<ReconciliationAdjustment, "id" | "createdAt">
): ReconciliationSession | null {
  const reconciliations = getReconciliations();
  const idx = reconciliations.findIndex((r) => r.id === sessionId);
  if (idx === -1) return null;

  const newAdj: ReconciliationAdjustment = {
    ...adjustment,
    id: generateId("adj"),
    createdAt: new Date().toISOString(),
  };
  reconciliations[idx].adjustments.push(newAdj);

  // Recalculate difference
  const totalAdjustments = reconciliations[idx].adjustments.reduce((sum, a) => {
    return sum + (a.side === "bank" ? -a.amount : a.amount);
  }, 0);
  reconciliations[idx].difference = Math.round(
    reconciliations[idx].bankBalance - reconciliations[idx].bookBalance - totalAdjustments
  );

  saveToStorage(STORAGE_KEYS.reconciliations, reconciliations);
  return reconciliations[idx];
}

export function completeReconciliation(sessionId: string): ReconciliationSession | null {
  const reconciliations = getReconciliations();
  const idx = reconciliations.findIndex((r) => r.id === sessionId);
  if (idx === -1) return null;

  reconciliations[idx].status = "completed";
  reconciliations[idx].completedAt = new Date().toISOString();
  saveToStorage(STORAGE_KEYS.reconciliations, reconciliations);
  return reconciliations[idx];
}

export function exportReconciliationReport(sessionId: string): string {
  const reconciliations = getReconciliations();
  const session = reconciliations.find((r) => r.id === sessionId);
  if (!session) return "";

  const account = getAccounts().find((a) => a.id === session.accountId);
  const transactions = getTransactions({
    accountId: session.accountId,
    dateFrom: session.periodStart,
    dateTo: session.periodEnd,
  });

  const lines = [
    "BANK RECONCILIATION REPORT",
    "=".repeat(60),
    `Account: ${account?.bankName ?? "Unknown"} - ${account?.accountNumber ?? "N/A"}`,
    `Period: ${new Date(session.periodStart).toLocaleDateString()} to ${new Date(session.periodEnd).toLocaleDateString()}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    "",
    "SUMMARY",
    "-".repeat(40),
    `Bank Statement Balance: ${session.bankBalance.toLocaleString()} ${account?.currency ?? "EGP"}`,
    `Book Balance: ${session.bookBalance.toLocaleString()} ${account?.currency ?? "EGP"}`,
    `Difference: ${session.difference.toLocaleString()} ${account?.currency ?? "EGP"}`,
    `Status: ${session.status.toUpperCase()}`,
    "",
    `Matched Transactions: ${session.matchedCount}`,
    `Unmatched Transactions: ${session.unmatchedCount}`,
    "",
    "ADJUSTMENTS",
    "-".repeat(40),
  ];

  if (session.adjustments.length === 0) {
    lines.push("  No adjustments recorded.");
  } else {
    for (const adj of session.adjustments) {
      lines.push(`  [${adj.type.toUpperCase()}] ${adj.description}: ${adj.amount.toLocaleString()} (${adj.side})`);
    }
  }

  lines.push("");
  lines.push("TRANSACTIONS");
  lines.push("-".repeat(40));
  for (const tx of transactions) {
    lines.push(
      `  ${new Date(tx.date).toLocaleDateString()} | ${tx.type === "credit" ? "CR" : "DR"} | ${tx.amount.toLocaleString().padStart(12)} | ${tx.matchStatus.padEnd(10)} | ${tx.description}`
    );
  }

  return lines.join("\n");
}

// ─── Payment Link Functions ─────────────────────────────────────────────────

export function getPaymentLinks(): PaymentLink[] {
  const stored = loadFromStorage<PaymentLink>(STORAGE_KEYS.paymentLinks);
  if (stored.length === 0) {
    saveToStorage(STORAGE_KEYS.paymentLinks, SEED_PAYMENT_LINKS);
    return SEED_PAYMENT_LINKS;
  }
  return stored;
}

export function createPaymentLink(
  data: Pick<PaymentLink, "amount" | "currency" | "description" | "method">
): PaymentLink {
  const links = getPaymentLinks();
  const linkId = generateId("pl");
  const link: PaymentLink = {
    ...data,
    id: linkId,
    status: "active",
    url: `https://pay.pharmaerp.com/${linkId}`,
    qrData: `pharmaerp://pay/${linkId}/${data.amount}/${data.currency}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
  links.push(link);
  saveToStorage(STORAGE_KEYS.paymentLinks, links);
  return link;
}

export function markPaymentLinkPaid(linkId: string): PaymentLink | null {
  const links = getPaymentLinks();
  const idx = links.findIndex((l) => l.id === linkId);
  if (idx === -1) return null;
  links[idx].status = "paid";
  saveToStorage(STORAGE_KEYS.paymentLinks, links);
  return links[idx];
}
