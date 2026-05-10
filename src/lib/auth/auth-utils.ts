import { hashSync, compareSync } from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password using bcryptjs.
 */
export async function hashPassword(plain: string): Promise<string> {
  return hashSync(plain, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return compareSync(plain, hash);
}

/**
 * Validate password strength requirements.
 * Returns an object with `valid` boolean and array of error messages.
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 12) errors.push('Password must be at least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain a special character');
  return { valid: errors.length === 0, errors };
}

/** Demo credential entry for development quick-login. */
export interface DemoCredential {
  username: string;
  password: string;
  userId: string;
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    territory?: string;
  };
}

/**
 * Map of demo credentials for development/testing.
 * Keys are usernames.
 */
export const DEMO_CREDENTIALS: Record<string, DemoCredential> = {
  admin: {
    username: "admin",
    password: "admin123",
    userId: "admin-001",
    profile: { id: "u-admin", name: "System Administrator", email: "admin@pharma.com", role: "ADMIN", department: "IT" },
  },
  nsm: {
    username: "nsm",
    password: "nsm123",
    userId: "nsm-001",
    profile: { id: "u-nsm", name: "Eng. Tarek Mansour", email: "tarek@pharma.com", role: "NSM", department: "Sales & Marketing" },
  },
  bum: {
    username: "bum",
    password: "bum123",
    userId: "bum-001",
    profile: { id: "u-bum", name: "Dr. Hossam Tarek", email: "hossam@pharma.com", role: "BUM", department: "Executive" },
  },
  marketeer: {
    username: "marketeer",
    password: "mkt123",
    userId: "mkt-001",
    profile: { id: "u-mkt-1", name: "Dr. Yasmin Salem", email: "yasmin@pharma.com", role: "MARKETEER", department: "Marketing", territory: "North Region" },
  },
  dm: {
    username: "dm",
    password: "dm123",
    userId: "dm-001",
    profile: { id: "u-dm-1", name: "Ahmed Mostafa", email: "ahmed.m@pharma.com", role: "DISTRICT_MANAGER", department: "Sales", territory: "Cairo North" },
  },
  medrep: {
    username: "medrep",
    password: "rep123",
    userId: "rep-001",
    profile: { id: "u-rep-1", name: "Mohamed El-Sayed", email: "mohamed@pharma.com", role: "MEDICAL_REP", department: "Sales", territory: "Giza" },
  },
  accountant: {
    username: "accountant",
    password: "acc123",
    userId: "acc-001",
    profile: { id: "u-acc-1", name: "Fatima El-Masry", email: "fatima@pharma.com", role: "ACCOUNTANT", department: "Finance" },
  },
  warehouse: {
    username: "warehouse",
    password: "wh123",
    userId: "wh-001",
    profile: { id: "u-wh-1", name: "Khaled Farouk", email: "khaled@pharma.com", role: "WAREHOUSE", department: "Warehouse" },
  },
  hr: {
    username: "hr",
    password: "hr123",
    userId: "hr-001",
    profile: { id: "u-hr-1", name: "Laila Abdel-Rahman", email: "laila@pharma.com", role: "HR", department: "Human Resources" },
  },
};

/** Flat array of demo credentials for iteration. */
export const DEMO_CREDENTIALS_LIST: DemoCredential[] = Object.values(DEMO_CREDENTIALS);

/**
 * Generate demo users with hashed passwords.
 * Useful for seeding a database.
 */
export function generateDemoUsers(): Array<DemoCredential & { passwordHash: string }> {
  return DEMO_CREDENTIALS_LIST.map((cred) => ({
    ...cred,
    passwordHash: hashSync(cred.password, SALT_ROUNDS),
  }));
}
