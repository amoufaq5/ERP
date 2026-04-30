"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface PartnerLinkProps {
  type: "customer" | "vendor";
  id: string;
  children: ReactNode;
  className?: string;
}

export function PartnerLink({ type, id, children, className = "" }: PartnerLinkProps) {
  return (
    <Link
      href={`/erp/partner-detail?type=${type}&id=${id}`}
      className={`font-medium text-blue-700 hover:text-blue-900 hover:underline underline-offset-2 cursor-pointer transition-colors ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}
