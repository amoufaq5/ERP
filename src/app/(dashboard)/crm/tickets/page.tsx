"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
export default function TicketsPage() {
  const router = useRouter()
  useEffect(() => { router.replace("/crm/accounts") }, [router])
  return null
}
