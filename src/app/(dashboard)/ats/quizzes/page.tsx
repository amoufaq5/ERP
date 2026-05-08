"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QuizzesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ats/training");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Redirecting to Training Quizzes...</p>
    </div>
  );
}
