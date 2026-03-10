'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { RestauranteResponsableSchema, type RestauranteResponsableForm } from '@/lib/validators/restaurante-responsable';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';

interface ResponsableCardProps {
  restauranteId: string;
  nombre?: string;
  telefono?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (next: { nombre: string; telefono: string }) => void;
}

export function ResponsableCard({ restauranteId, nombre, telefono, onUpdated, isOpen, onOpenChange }: ResponsableCardProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dialogOpen = isOpen ?? open;
  const setDialogOpen = onOpenChange ?? setOpen;

  const form = useForm<RestauranteResponsableForm>({
    resolver: zodResolver(RestauranteResponsableSchema),
    defaultValues: {
      nombre: '',
      telefono: '',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      nombre: nombre ?? '',
      telefono: telefono ?? '',
    });
  }, [form, nombre, dialogOpen, telefono]);

  const handleSubmit = async (values: RestauranteResponsableForm) => {
    try {
      setIsSaving(true);
      await RestauranteDetalleService.updateResponsable(restauranteId, values);
      onUpdated(values);
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card id="responsable" className="border-none bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Responsable</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3 text-sm text-slate-600">
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">{nombre || 'Sin asignar'}</p>
          <p>{telefono || 'Sin telefono'}</p>
          <p className="text-xs text-slate-400">
            Este contacto se mostrara en el Marketplace para organizar reservas de este restaurante.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-auto w-full hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
            >
              Editar responsable
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Editar responsable</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
