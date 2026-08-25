import React from 'react';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Condiciones de uso</CardTitle>
            <p className="text-muted-foreground">
              OrganizAPP, herramienta interna de SAIA LABS · Última actualización: agosto de 2026
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <Seccion titulo="1. Qué es esto">
                <p>
                  OrganizAPP es una herramienta interna de SAIA LABS para organizar el trabajo del
                  equipo y hacer seguimiento de la producción de las agencias con las que
                  colabora. No es un servicio público ni está abierto al registro libre: las
                  cuentas las aprueba un administrador de SAIA LABS una por una.
                </p>
              </Seccion>

              <Seccion titulo="2. Quién puede usarla">
                <p>
                  Solo el personal de SAIA LABS y los contactos de las agencias colaboradoras a
                  quienes se les haya dado acceso expresamente. El acceso está ligado a la
                  relación profesional que lo motiva y puede retirarse en cualquier momento
                  cuando esa relación termina o cambia.
                </p>
              </Seccion>

              <Seccion titulo="3. Tu cuenta">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Tu cuenta es personal e intransferible. No la compartas.</li>
                  <li>
                    Eres responsable de tu contraseña y de lo que se haga desde tu sesión.
                  </li>
                  <li>
                    Si crees que alguien ha accedido a tu cuenta, avisa a un administrador para
                    que la desactive.
                  </li>
                </ul>
              </Seccion>

              <Seccion titulo="4. Qué se espera de ti">
                <p>
                  Que uses la herramienta para el trabajo para el que se te ha dado acceso. En
                  concreto, no está permitido:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    Sacar de aquí información de clientes, agencias o proyectos para usarla fuera
                    del encargo que la justifica.
                  </li>
                  <li>Intentar acceder a datos de otras agencias o de proyectos ajenos.</li>
                  <li>Dar acceso a terceros por tu cuenta.</li>
                </ul>
              </Seccion>

              <Seccion titulo="5. Los contenidos">
                <p>
                  Los proyectos, tareas, planes y entregables que se registran aquí son
                  información de trabajo de SAIA LABS y de sus clientes. Lo que subas o escribas
                  queda dentro de ese ámbito. La propiedad intelectual de las piezas producidas
                  se rige por el contrato que corresponda en cada caso, no por esta herramienta.
                </p>
              </Seccion>

              <Seccion titulo="6. Disponibilidad">
                <p>
                  OrganizAPP es una herramienta interna, no un servicio con garantía de
                  disponibilidad. Puede estar en mantenimiento o dejar de estar disponible sin
                  aviso previo. No la uses como único sitio donde guardas algo que no puedes
                  perder.
                </p>
              </Seccion>

              <Seccion titulo="7. Cambios">
                <p>
                  SAIA LABS puede modificar estas condiciones y la propia herramienta. Los
                  cambios relevantes se comunican al equipo por los canales internos habituales.
                </p>
              </Seccion>

              <Seccion titulo="8. Dudas">
                <p>
                  Si tienes cualquier pregunta sobre estas condiciones, sobre tu acceso o sobre
                  qué puedes hacer con la información que ves aquí, habla con el administrador de
                  OrganizAPP en SAIA LABS.
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
