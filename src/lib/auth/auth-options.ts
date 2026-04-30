import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  tenantId?: string;
};

const DEMO_USERS: { username: string; password: string; profile: SessionUser }[] = [
  { username: "admin", password: "admin123", profile: { id: "u-admin", name: "System Administrator", email: "admin@pharma.com", role: "ADMIN", department: "IT" } },
  { username: "bum", password: "bum123", profile: { id: "u-bum", name: "Dr. Hossam Tarek", email: "hossam@pharma.com", role: "BUM", department: "Executive" } },
  { username: "dm", password: "dm123", profile: { id: "u-dm-1", name: "Ahmed Mostafa", email: "ahmed.m@pharma.com", role: "DISTRICT_MANAGER", department: "Sales" } },
  { username: "marketeer", password: "mkt123", profile: { id: "u-mkt-1", name: "Dr. Yasmin Salem", email: "yasmin@pharma.com", role: "MARKETEER", department: "Marketing" } },
  { username: "medrep", password: "rep123", profile: { id: "u-rep-1", name: "Mohamed El-Sayed", email: "mohamed@pharma.com", role: "MEDICAL_REP", department: "Sales" } },
  { username: "accountant", password: "acc123", profile: { id: "u-acc-1", name: "Fatima El-Masry", email: "fatima@pharma.com", role: "ACCOUNTANT", department: "Finance" } },
  { username: "warehouse", password: "wh123", profile: { id: "u-wh-1", name: "Khaled Farouk", email: "khaled@pharma.com", role: "WAREHOUSE", department: "Warehouse" } },
  { username: "hr", password: "hr123", profile: { id: "u-hr-1", name: "Laila Abdel-Rahman", email: "laila@pharma.com", role: "HR", department: "Human Resources" } },
];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const trimUser = credentials.username.trim().toLowerCase();
        const trimPass = credentials.password.trim();

        // 1. Check demo users
        const demo = DEMO_USERS.find((u) => u.username === trimUser && u.password === trimPass);
        if (demo) {
          return {
            id: demo.profile.id,
            name: demo.profile.name,
            email: demo.profile.email,
            role: demo.profile.role,
            department: demo.profile.department,
          };
        }

        // 2. Check Prisma database users (if available)
        try {
          const { PrismaClient } = await import("@prisma/client");
          const prisma = new PrismaClient();
          const dbUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: trimUser },
                { name: trimUser },
              ],
              isActive: true,
            },
          });
          await prisma.$disconnect();

          if (dbUser && compareSync(trimPass, dbUser.passwordHash)) {
            return {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role,
              department: dbUser.department || undefined,
            };
          }
        } catch {
          // DB not available, fall through
        }

        return null;
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as SessionUser).role;
        token.department = (user as SessionUser).department;
        token.tenantId = (user as SessionUser).tenantId;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as SessionUser).id = token.id as string;
        (session.user as SessionUser).role = token.role as string;
        (session.user as SessionUser).department = token.department as string;
        (session.user as SessionUser).tenantId = token.tenantId as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || "pharma-erp-dev-secret-change-in-production",
};
