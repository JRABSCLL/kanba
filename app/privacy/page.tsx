import React from 'react';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacidad</CardTitle>
            <p className="text-muted-foreground">
              OrganizAPP, herramienta interna de SAIA LABS · Última actualización: agosto de 2026
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <Seccion titulo="1. Qué datos hay aquí">
                <p>De ti, como persona, se guarda lo mínimo para que la herramienta funcione:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Tu nombre y tu correo, que escribes al crear la cuenta.</li>
                  <li>
                    Tu contraseña, que <strong>no se guarda</strong>: se almacena un hash
                    irreversible gestionado por Supabase Auth. Nadie de SAIA LABS puede leerla.
                  </li>
                  <li>
                    Tu tipo de usuario (interno o de agencia) y, si procede, a qué agencia
                    perteneces.
                  </li>
                </ul>
                <p>
                  Aparte están los datos de trabajo: proyectos, tareas, planes, entregables,
                  comentarios y fechas. Ahí queda registrado quién crea y quién es responsable de
                  cada cosa, porque de eso trata la herramienta.
                </p>
              </Seccion>

              <Seccion titulo="2. Para qué se usan">
                <p>
                  Para organizar el trabajo y para saber quién tiene qué asignado. Nada más. No
                  hay publicidad, no hay perfilado, no hay venta de datos a terceros, y no se
                  usan para evaluar a nadie fuera del uso normal de coordinar el trabajo.
                </p>
              </Seccion>

              <Seccion titulo="3. Quién puede ver qué">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Usuarios internos y administradores</strong> ven el trabajo del
                    equipo y el de todas las agencias.
                  </li>
                  <li>
                    <strong>Usuarios de agencia</strong> ven únicamente los datos de su propia
                    agencia. El aislamiento no depende de la interfaz: está aplicado en la base
                    de datos mediante políticas de acceso por fila (RLS).
                  </li>
                  <li>
                    En <strong>Proyectos</strong>, cada persona ve los proyectos de los que es
                    miembro. Los administradores los ven todos.
                  </li>
                </ul>
              </Seccion>

              <Seccion titulo="4. Dónde están">
                <p>
                  Los datos se alojan en Supabase (PostgreSQL) y la aplicación se sirve desde
                  Vercel. Todo el tráfico va cifrado. No se comparten con ningún otro proveedor
                  ni servicio de analítica.
                </p>
              </Seccion>

              <Seccion titulo="5. Cuánto tiempo se conservan">
                <p>
                  Mientras la cuenta esté activa y mientras el trabajo registrado siga siendo
                  útil para SAIA LABS. Cuando alguien deja de colaborar, su cuenta se desactiva:
                  deja de tener acceso, pero el histórico del trabajo (quién hizo qué) se
                  mantiene, porque forma parte del registro de los proyectos.
                </p>
              </Seccion>

              <Seccion titulo="6. Tus derechos">
                <p>
                  Puedes cambiar tu nombre desde <strong>Ajustes</strong> y tu contraseña desde la
                  pantalla de entrada. Para consultar, corregir o pedir la eliminación de tus
                  datos personales, escribe al administrador de OrganizAPP en SAIA LABS.
                </p>
              </Seccion>

              <Seccion titulo="7. Dudas">
                <p>
                  Cualquier pregunta sobre cómo se tratan tus datos aquí, háblalo con el
                  administrador de OrganizAPP en SAIA LABS.
                </p>
              </Seccion>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
