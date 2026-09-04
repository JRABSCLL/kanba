"use client"

/**
 * Último recurso: se usa cuando falla el propio layout raíz, así que reemplaza
 * al documento entero y tiene que traer sus etiquetas <html> y <body>. No puede
 * apoyarse en ningún estilo ni componente de la aplicación, porque justo eso es
 * lo que puede haber fallado.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#ffffff",
          color: "#111111",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ maxWidth: "380px" }}>
          <p style={{ fontSize: "11px", letterSpacing: ".12em", color: "#777", margin: "0 0 12px" }}>
            ORGANIZAPP
          </p>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: "0 0 10px" }}>
            La aplicación no pudo arrancar
          </h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#555", margin: "0 0 20px" }}>
            Es un fallo de carga, no de tus datos: todo lo guardado sigue intacto. Recarga la
            página. Si sigue igual, avisa al administrador.
          </p>
          <button
            onClick={reset}
            style={{
              fontSize: "14px",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
          {error.digest && (
            <p style={{ fontSize: "11px", color: "#999", marginTop: "20px", fontFamily: "monospace" }}>
              Referencia: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
