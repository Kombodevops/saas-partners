'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Shield, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AuthService } from '@/lib/services/auth.service';
import { WorkersService } from '@/lib/services/workers.service';
import type { Worker } from '@/lib/types/worker';
import { createWorkerSchema, type CreateWorkerFormData } from '@/lib/validators/worker';

const roleLabel = (role: Worker['role']) => (role === 'admin' ? 'Admin' : 'Gestor');
type WorkerListItem = Worker & { isOwner?: boolean };

export default function EquipoPage() {
  const [workers, setWorkers] = useState<WorkerListItem[]>([]);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const form = useForm<CreateWorkerFormData>({
    resolver: zodResolver(createWorkerSchema),
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      role: 'gestor',
    },
  });

  const canSubmit = form.formState.isValid && !form.formState.isSubmitting;

  const activeCount = useMemo(
    () => workers.filter((worker) => worker.active).length,
    [workers]
  );

  const loadWorkers = async (activePartnerId: string) => {
    setLoading(true);
    try {
      const data = await WorkersService.listWorkers(activePartnerId);
      const partner = await AuthService.getCurrentPartner();
      const ownerName =
        partner?.nombreNegocio ||
        (partner as unknown as { 'Nombre del negocio'?: string })?.['Nombre del negocio'] ||
        partner?.nombreTitular ||
        partner?.nombre ||
        'Cuenta principal';
      const ownerItem: WorkerListItem | null = partner
        ? {
            id: partner.id,
            partnerId: partner.id,
            email: partner.email,
            nombre: ownerName,
            role: 'admin',
            active: true,
            isOwner: true,
          }
        : null;
      const filtered = ownerItem ? data.filter((worker) => worker.id !== ownerItem.id) : data;
      setWorkers(ownerItem ? [ownerItem, ...filtered] : filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      const id = await AuthService.getCurrentPartnerId();
      if (!mounted) return;
      setPartnerId(id);
      if (id) {
        await loadWorkers(id);
      } else {
        setLoading(false);
      }
    };
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateWorker = async (values: CreateWorkerFormData) => {
    if (!partnerId) return;
    setActionError(null);
    try {
      await WorkersService.createWorker({
        partnerId,
        email: values.email,
        password: values.password,
        nombre: values.nombre,
        role: values.role,
      });
      form.reset({ nombre: '', email: '', password: '', role: 'gestor' });
      await loadWorkers(partnerId);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creando miembro del equipo:', error);
      setActionError('No se pudo crear el miembro del equipo. Revisa el email y la contraseña.');
    }
  };

  const toggleWorker = async (worker: Worker) => {
    if ((worker as WorkerListItem).isOwner) return;
    setActionError(null);
    try {
      await WorkersService.setWorkerActive(worker.id, !worker.active);
      setWorkers((prev) =>
        prev.map((item) =>
          item.id === worker.id ? { ...item, active: !worker.active } : item
        )
      );
    } catch (error) {
      console.error('Error actualizando miembro del equipo:', error);
      setActionError('No se pudo actualizar el estado del equipo.');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Equipo</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Gestiona tu equipo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Crea equipo, revisa su estado y controla el acceso a la cuenta.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 gap-2">
              <Plus className="h-4 w-4" />
              Nuevo miembro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle>Registrar equipo</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateWorker)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del equipo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="correo@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid gap-2"
                        >
                          {(['admin', 'gestor'] as const).map((role) => (
                            <label
                              key={role}
                              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-[#7472fd]/40 hover:bg-[#7472fd]/5"
                            >
                              <RadioGroupItem value={role} />
                              <div>
                                <p className="font-medium text-slate-900">{roleLabel(role)}</p>
                                <p className="text-xs text-slate-500">
                                  Acceso completo a la cuenta (por ahora).
                                </p>
                              </div>
                            </label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {actionError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {actionError}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={!canSubmit}>
                  {form.formState.isSubmitting ? 'Creando...' : 'Registrar equipo'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Listado de equipo</CardTitle>
          <CardDescription>
              {loading ? 'Cargando equipo...' : `${workers.length} usuarios, ${activeCount} activos`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            La cuenta principal no puede asignarse como responsable de reservas. Solo miembros del equipo.
          </p>
            {loading && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                Cargando equipo...
              </div>
            )}
            {!loading && workers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                Aún no has añadido equipo.
              </div>
            )}
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{worker.nombre}</p>
                  <p className="text-xs text-slate-500">{worker.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {worker.isOwner && (
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      Principal
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600">
                    <Shield className="h-3 w-3 text-slate-500" />
                    {roleLabel(worker.role)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      worker.active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {worker.active ? 'Activo' : 'Inactivo'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleWorker(worker)}
                    className="h-8 gap-2"
                    disabled={worker.isOwner}
                  >
                    {worker.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    {worker.isOwner ? 'Cuenta principal' : worker.active ? 'Desactivar' : 'Reactivar'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Permisos</CardTitle>
            <CardDescription>Todos los roles tienen acceso completo por ahora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
              Próximamente podrás configurar permisos por rol. De momento, admin y gestor ven todas
              las secciones del menú.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
