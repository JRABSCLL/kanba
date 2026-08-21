'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { ShineBorder } from '@/src/components/magicui/shine-border';

type Estado = 'verificando' | 'listo' | 'invalido';

export default function ResetPasswordPage() {
  const [estado, setEstado] = useState<Estado>('verificando');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  // El enlace del correo trae el token en la URL. supabase-js lo canjea solo por
  // una sesión de recuperación; aquí solo esperamos a que exista.
  useEffect(() => {
    let cancelado = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelado) return;
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setEstado('listo');
      }
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelado) return;
      if (data.session) {
        setEstado('listo');
      } else {
        // Damos margen al canje del token antes de darlo por inválido.
        setTimeout(async () => {
          if (cancelado) return;
          const { data: retry } = await supabase.auth.getSession();
          setEstado(retry.session ? 'listo' : 'invalido');
        }, 2500);
      }
    })();

    return () => {
      cancelado = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('Las dos contraseñas no coinciden');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Contraseña actualizada. Inicia sesión con la nueva.');
      // Cerramos la sesión de recuperación para que entre con la contraseña nueva.
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md relative overflow-hidden">
        <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src={theme === 'light' ? '/logo-light.png' : '/logo-dark.png'}
              width={50}
              height={50}
              alt="OrganizAPP"
            />
          </div>
          <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
          <CardDescription>
            {estado === 'invalido'
              ? 'Este enlace ya no sirve.'
              : 'Escribe la contraseña que usarás a partir de ahora.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {estado === 'verificando' && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Comprobando el enlace…
            </div>
          )}

          {estado === 'invalido' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  El enlace ha caducado o ya se usó. Pide uno nuevo; los enlaces
                  duran 1 hora y solo valen una vez.
                </span>
              </div>
              <Button className="w-full" asChild>
                <Link href="/forgot-password">Pedir un enlace nuevo</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">Volver a iniciar sesión</Link>
              </Button>
            </div>
          )}

          {estado === 'listo' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña nueva</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Repite la contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="La misma otra vez"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar contraseña
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
