"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
export default function BankingPage() {
  const router = useRouter()
  useEffect(() => { router.replace("/erp/finance") }, [router])
  return null
}
