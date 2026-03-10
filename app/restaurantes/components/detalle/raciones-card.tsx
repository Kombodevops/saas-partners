'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Resolver, useForm } from 'react-hook-form';
import { RestauranteRacionesSchema, type RestauranteRacionesForm, type RacionForm } from '@/lib/validators/restaurante-raciones';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';

interface RacionesCardProps {
  restauranteId: string;
  raciones?: RacionForm[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (next: RacionForm[]) => void;
}

export function RacionesCard({ restauranteId, raciones, onUpdated, isOpen, onOpenChange }: RacionesCardProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const list = useMemo(() => raciones ?? [], [raciones]);
  const visibleItems = list.slice(0, 2);
  const dialogOpen = isOpen ?? open;
  const setDialogOpen = onOpenChange ?? setOpen;

  const form = useForm<RestauranteRacionesForm>({
    resolver: zodResolver(RestauranteRacionesSchema) as Resolver<RestauranteRacionesForm>,
    defaultValues: { raciones: [] },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      raciones: list.map((item) => ({
        nombre: item.nombre,
        descripcion: item.descripcion,
        precio: Number(item.precio ?? 0),
      })),
    });
  }, [form, list, dialogOpen]);

  const handleSubmit = async (values: RestauranteRacionesForm) => {
    try {
      setIsSaving(true);
      await RestauranteDetalleService.updateRaciones(restauranteId, values);
      onUpdated(values.raciones);
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const addRacion = () => {
    const current = form.getValues('raciones');
    form.setValue('raciones', [
      ...current,
      { nombre: '', descripcion: '', precio: 0 },
    ]);
  };

  const removeRacion = (index: number) => {
    const current = form.getValues('raciones');
    form.setValue(
      'raciones',
      current.filter((_, idx) => idx !== index)
    );
  };

  return (
    <Card id="raciones" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Raciones</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {list.length}
        </span>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3 text-sm">
        <div className="space-y-2">
          {list.length === 0 ? (
            <p className="text-slate-500">Sin raciones registradas.</p>
          ) : (
            visibleItems.map((racion, index) => (
              <div key={`${racion.nombre}-${index}`} className="rounded-xl border border-slate-100 px-3 py-2">
                <p className="font-semibold text-slate-900">{racion.nombre}</p>
                <p className="text-xs text-slate-500">{racion.descripcion}</p>
                <p className="text-xs text-slate-500">Precio: {racion.precio}</p>
              </div>
            ))
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-auto w-full gap-2 hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
            >
              <Plus className="h-4 w-4" />
              Editar raciones
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar raciones</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {form.watch('raciones').map((_, index) => (
                  <div key={`racion-${index}`} className="rounded-2xl border-2 border-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Ración {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => removeRacion(index)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`raciones.${index}.nombre`}
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
                        name={`raciones.${index}.precio`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-3">
                      <FormField
                        control={form.control}
                        name={`raciones.${index}.descripcion`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addRacion} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Añadir ración
                </Button>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar raciones'}
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
