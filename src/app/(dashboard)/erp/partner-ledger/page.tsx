"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
export default function PartnerLedgerPage() {
  const router = useRouter()
  useEffect(() => { router.replace("/erp/partner-detail") }, [router])
  return null
}
