'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/components/user-provider';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PageLoader } from '@/components/ui/states';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: 'free' | 'pro' | null;
}

export default function NewProjectPage() {
  const { user, signOut } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectSlug, setProjectSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    checkUser();
  }, [user, router]);

  const checkUser = async () => {
    if (!user) return;
    
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profile);

      // Get project count
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setProjectCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudieron cargar los datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const canCreateProject = () => {
    // OrganizAPP: sin límites de plan para uso organizacional interno.
    // El usuario ya viene del contexto; no hace falta re-pedir el perfil.
    return !!user;
  };

  // Generate slug from project name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  // Check if slug is available
  const checkSlugAvailability = async (slug: string) => {
    if (!slug.trim()) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', slug.trim())
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows returned - slug is available
        setSlugAvailable(true);
      } else if (data) {
        // Slug exists
        setSlugAvailable(false);
      } else {
        setSlugAvailable(false);
      }
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugAvailable(false);
    } finally {
      setCheckingSlug(false);
    }
  };

  // Auto-generate slug when project name changes
  useEffect(() => {
    if (projectName) {
      const generatedSlug = generateSlug(projectName);
      setProjectSlug(generatedSlug);
      checkSlugAvailability(generatedSlug);
    } else {
      setProjectSlug('');
      setSlugAvailable(null);
    }
  }, [projectName]);

  // Check slug availability when slug changes manually
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (projectSlug && projectSlug !== generateSlug(projectName)) {
        checkSlugAvailability(projectSlug);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [projectSlug, projectName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateProject()) {
      toast.error('No se puede crear el proyecto en este momento.');
      return;
    }

    if (!projectSlug.trim()) {
      toast.error('Introduce un identificador');
      return;
    }

    if (slugAvailable === false) {
      toast.error('Ese identificador ya está en uso. Elige otro.');
      return;
    }

    if (slugAvailable === null || checkingSlug) {
      toast.error('Espera mientras comprobamos el identificador');
      return;
    }

    setCreating(true);

    try {
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          description: projectDescription || null,
          slug: projectSlug.trim(),
          user_id: user!.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create default columns
      const defaultColumns = [
        { name: 'Por hacer', position: 0 },
        { name: 'En progreso', position: 1 },
        { name: 'Hecho', position: 2 },
      ];

      const { error: columnsError } = await supabase
        .from('columns')
        .insert(
          defaultColumns.map(col => ({
            ...col,
            project_id: project.id,
          }))
        );

      if (columnsError) throw columnsError;

      // Notify sidebar to update
      if ((window as any).handleProjectUpdate) {
        (window as any).handleProjectUpdate('create', project.id);
      }

      toast.success('Proyecto creado');
      router.push(`/dashboard/projects/${project.slug}`);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'No se pudo crear el proyecto');
    } finally {
      setCreating(false);
    }
  };

  // El formulario no depende de ninguna carga inicial: se renderiza al instante.
  return (
    <>
    <div className="mx-auto max-w-xl">
      {/* Cabecera */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo proyecto</h1>
      </div>
      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos del proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del proyecto *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nombre del proyecto"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador (slug) *</Label>
              <div className="relative">
                <Input
                  id="slug"
                  type="text"
                  placeholder="project-slug"
                  value={projectSlug}
                  onChange={(e) => setProjectSlug(e.target.value)}
                  className={`pr-10 ${
                    slugAvailable === true ? 'border-green-500' : 
                    slugAvailable === false ? 'border-red-500' : ''
                  }`}
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {checkingSlug ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : slugAvailable === true ? (
                    <div className="text-green-500">✓</div>
                  ) : slugAvailable === false ? (
                    <div className="text-red-500">✗</div>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Se usa en la URL. Solo minúsculas, números y guiones.
              </p>
              {slugAvailable === false && (
                <p className="text-xs text-red-500">
                  Ese identificador ya está en uso. Elige otro.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción (opcional)"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={creating || !canCreateProject() || slugAvailable !== true || checkingSlug}
                className="flex-1"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear proyecto
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
