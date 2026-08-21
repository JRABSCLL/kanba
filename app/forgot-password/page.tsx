'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { ShineBorder } from '@/src/components/magicui/shine-border';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      // Se muestra el mismo mensaje exista o no la cuenta: así nadie puede
      // averiguar qué correos están registrados.
      setSent(true);
    } catch (error: any) {
      toast.error(error.message || 'No se pudo enviar el correo');
    } finally {
      setLoading(false);
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
          <CardTitle className="text-2xl">
            {sent ? 'Revisa tu correo' : 'Recuperar contraseña'}
          </CardTitle>
          <CardDescription>
            {sent
              ? `Si ${email} tiene una cuenta, le hemos enviado un enlace para crear una contraseña nueva.`
              : 'Te enviaremos un enlace para crear una contraseña nueva.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                <MailCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  El enlace caduca en 1 hora. Si no lo ves, mira en spam.
                </span>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">Volver a iniciar sesión</Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar enlace
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link href="/login" className="font-medium underline-offset-4 hover:underline">
                  Volver a iniciar sesión
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
