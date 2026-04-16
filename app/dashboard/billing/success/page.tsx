import { redirect } from "next/navigation"

// OrganizAPP: billing deshabilitado para uso organizacional interno.
export default function BillingSuccessPage() {
  redirect("/dashboard")
}
