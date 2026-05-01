import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg text-muted-foreground mt-2">Page not found</p>
      <Link href="/dashboard" className="mt-4 text-primary hover:underline">
        Back to Dashboard
      </Link>
    </div>
  );
}
