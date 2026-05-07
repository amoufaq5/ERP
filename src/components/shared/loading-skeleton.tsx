"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function TableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-gray-200 animate-pulse rounded-md" />
        ))}
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-200/50 p-3 flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 animate-pulse rounded flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3 flex gap-4 border-t">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 bg-gray-200/60 animate-pulse rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mb-1" />
            <div className="h-3 w-20 bg-gray-200/60 animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
            <div className="h-3 w-20 bg-gray-200/60 animate-pulse rounded mt-1" />
          </CardHeader>
          <CardContent>
            <div className="h-6 w-14 bg-gray-200 animate-pulse rounded mb-2" />
            <div className="h-3 w-full bg-gray-200/40 animate-pulse rounded mb-1" />
            <div className="h-3 w-3/4 bg-gray-200/40 animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-9 w-32 bg-gray-200 animate-pulse rounded" />
      </div>
      <StatsSkeleton />
      <TableSkeleton />
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-4 p-6">
      <div className="h-7 w-40 bg-gray-200 animate-pulse rounded mb-6" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
          <div className="h-9 w-full bg-gray-200/60 animate-pulse rounded" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <div className="h-9 w-24 bg-gray-200 animate-pulse rounded" />
        <div className="h-9 w-20 bg-gray-200/60 animate-pulse rounded" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full bg-gray-200/40 animate-pulse rounded flex items-end justify-around p-4 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-200/60 animate-pulse rounded-t w-full"
              style={{ height: `${30 + ((i * 17 + 11) % 60)}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-gray-200 animate-pulse rounded" />
          <div className="h-9 w-28 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>
      <StatsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}

interface LoadingSkeletonProps {
  variant?: "page" | "table" | "cards" | "form" | "dashboard";
  className?: string;
}

export function LoadingSkeleton({ variant = "page", className }: LoadingSkeletonProps) {
  return (
    <div className={cn(className)}>
      {variant === "page" && <PageSkeleton />}
      {variant === "table" && <TableSkeleton />}
      {variant === "cards" && <CardsSkeleton />}
      {variant === "form" && <FormSkeleton />}
      {variant === "dashboard" && <DashboardSkeleton />}
    </div>
  );
}
