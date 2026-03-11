'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import {
  RestauranteBarraSchema,
  type RestauranteBarraForm,
  type ConsumicionBarraForm,
} from '@/lib/validators/restaurante-barra';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';

interface BarraCardProps {
  restauranteId: string;
  consumiciones?: ConsumicionBarraForm[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (next: ConsumicionBarraForm[]) => void;
}

export function BarraCard({ restauranteId, consumiciones, onUpdated, isOpen, onOpenChange }: BarraCardProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const list = useMemo(() => consumiciones ?? [], [consumiciones]);
  const dialogOpen = isOpen ?? open;
  const setDialogOpen = onOpenChange ?? setOpen;

  const form = useForm<RestauranteBarraForm>({
    resolver: zodResolver(RestauranteBarraSchema) as Resolver<RestauranteBarraForm>,
    defaultValues: { consumiciones: [] },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      consumiciones: list.map((item) => ({
        nombre: item.nombre,
        descripcion: item.descripcion,
        precio: Number(item.precio ?? 0),
      })),
    });
  }, [form, list, dialogOpen]);

  const handleSubmit = async (values: RestauranteBarraForm) => {
    try {
      setIsSaving(true);
      await RestauranteDetalleService.updateConsumicionesBarra(restauranteId, values);
      onUpdated(values.consumiciones);
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const addConsumicion = () => {
    const current = form.getValues('consumiciones');
    form.setValue('consumiciones', [
      ...current,
      { nombre: '', descripcion: '', precio: 0 },
    ]);
  };

  const removeConsumicion = (index: number) => {
    const current = form.getValues('consumiciones');
    form.setValue(
      'consumiciones',
      current.filter((_, idx) => idx !== index)
    );
  };

  const visibleItems = list.slice(0, 2);

  return (
    <Card id="barra" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Consumiciones en barra</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {list.length}
        </span>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3 text-sm">
        <div className="space-y-2">
          {list.length === 0 ? (
            <p className="text-slate-500">Sin consumiciones registradas.</p>
          ) : (
            visibleItems.map((item, index) => (
              <div key={`${item.nombre}-${index}`} className="rounded-xl border border-slate-100 px-3 py-2">
                <p className="font-semibold text-slate-900">{item.nombre}</p>
                <p className="text-xs text-slate-500">{item.descripcion}</p>
                <p className="text-xs text-slate-500">Precio: {item.precio}</p>
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
              Editar consumiciones
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar consumiciones en barra</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {form.watch('consumiciones').map((_, index) => (
                  <div key={`cons-${index}`} className="rounded-2xl border-2 border-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Consumición {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => removeConsumicion(index)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`consumiciones.${index}.nombre`}
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
                        name={`consumiciones.${index}.precio`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio</FormLabel>
                          <FormControl>
                            <NumberInput
                              value={typeof field.value === 'number' ? field.value : Number(field.value ?? 0)}
                              onChangeValue={field.onChange}
                              onBlur={field.onBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      />
                    </div>
                    <div className="mt-3">
                      <FormField
                        control={form.control}
                        name={`consumiciones.${index}.descripcion`}
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
                <Button type="button" variant="outline" onClick={addConsumicion} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Añadir consumición
                </Button>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar consumiciones'}
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
