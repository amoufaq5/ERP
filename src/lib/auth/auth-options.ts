import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";
import { DEMO_CREDENTIALS_LIST } from "./auth-utils";
import { env } from "../env";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  territory?: string;
  tenantId?: string;
};

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

        // 1. Check demo users (plain-text match for dev convenience)
        // Demo credentials are completely disabled in production
        if (process.env.NODE_ENV !== 'production') {
          const demo = DEMO_CREDENTIALS_LIST.find(
            (u) => u.username === trimUser && u.password === trimPass,
          );
          if (demo) {
            return {
              id: demo.profile.id,
              name: demo.profile.name,
              email: demo.profile.email,
              role: demo.profile.role,
              department: demo.profile.department,
              territory: demo.profile.territory,
            };
          }
        }

        // 2. Check Prisma database users (if available)
        try {
          const { PrismaClient } = await import("@prisma/client");
          const prisma = new PrismaClient();
          try {
            const dbUser = await prisma.user.findFirst({
              where: {
                OR: [{ email: trimUser }, { name: trimUser }],
                isActive: true,
              },
            });

            if (dbUser && compareSync(trimPass, dbUser.passwordHash)) {
              return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
                department: dbUser.department || undefined,
              };
            }
          } finally {
            await prisma.$disconnect();
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
        token.role = user.role;
        token.department = user.department;
        token.territory = user.territory;
        token.tenantId = user.tenantId;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.department = token.department as string | undefined;
        session.user.territory = token.territory as string | undefined;
        session.user.tenantId = token.tenantId as string | undefined;
      }
      return session;
    },
  },

  secret: env.NEXTAUTH_SECRET,
};
