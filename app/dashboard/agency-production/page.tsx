import { redirect } from "next/navigation"

// El módulo de Producción de Agencias vive ahora en /dashboard/agency-production-v2
// (componente AgencyProductionModule con agency_members + stages configurables).
// Esta ruta legacy se mantiene solo como redirect para no romper enlaces guardados.
export default function AgencyProductionLegacyRedirect() {
  redirect("/dashboard/agency-production-v2")
}
