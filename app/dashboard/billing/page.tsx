import { redirect } from "next/navigation"

// OrganizAPP: billing deshabilitado para uso organizacional interno.
// Cualquier link legado se redirige al dashboard.
export default function BillingPage() {
  redirect("/dashboard")
}
