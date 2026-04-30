import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    department?: string;
    tenantId?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      department?: string;
      tenantId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    department?: string;
    tenantId?: string;
  }
}
