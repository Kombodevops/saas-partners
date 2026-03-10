'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  CARACTERISTICAS_FIJAS,
  RestauranteCaracteristicasSchema,
  type RestauranteCaracteristicasForm,
} from '@/lib/validators/restaurante-caracteristicas';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';

interface CaracteristicasCardProps {
  restauranteId: string;
  caracteristicas: Record<string, string> | undefined;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (next: Record<string, string>) => void;
}

export function CaracteristicasCard({ restauranteId, caracteristicas, onUpdated, isOpen, onOpenChange }: CaracteristicasCardProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const dialogOpen = isOpen ?? open;
  const setDialogOpen = onOpenChange ?? setOpen;

  const selected = useMemo(() => Object.keys(caracteristicas ?? {}), [caracteristicas]);

  const form = useForm<RestauranteCaracteristicasForm>({
    resolver: zodResolver(RestauranteCaracteristicasSchema),
    defaultValues: { seleccionadas: [] },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      seleccionadas: selected.filter((item) => CARACTERISTICAS_FIJAS.includes(item as (typeof CARACTERISTICAS_FIJAS)[number])) as (typeof CARACTERISTICAS_FIJAS)[number][],
    });
  }, [form, dialogOpen, selected]);

  const handleSubmit = async (values: RestauranteCaracteristicasForm) => {
    try {
      setIsSaving(true);
      setFormError(null);
      const next = values.seleccionadas.reduce<Record<string, string>>((acc, item) => {
        acc[item] = caracteristicas?.[item] ?? '';
        return acc;
      }, {});
      const missing = values.seleccionadas.filter((item) => !next[item]?.trim());
      if (missing.length > 0) {
        setFormError('Todas las descripciones son obligatorias.');
        return;
      }
      await RestauranteDetalleService.updateCaracteristicas(restauranteId, next);
      onUpdated(next);
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card id="caracteristicas" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Características</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {selected.length}
        </span>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3 text-sm">
        <div className="space-y-2">
          {selected.length === 0 ? (
            <p className="text-slate-500">Sin características registradas.</p>
          ) : (
            selected.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                <span className="text-slate-700">{item}</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
              Editar características
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Seleccionar caracteristicas</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="flex flex-col gap-4">
                  {CARACTERISTICAS_FIJAS.map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name="seleccionadas"
                      render={({ field }) => {
                        const checked = field.value.includes(item);
                        const description = caracteristicas?.[item] ?? '';
                        return (
                          <FormItem className="space-y-2">
                            <FormLabel className="sr-only">{item}</FormLabel>
                            <FormControl>
                              <button
                                type="button"
                                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                                  checked
                                    ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                                    : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                                }`}
                                onClick={() => {
                                  const next = checked
                                    ? field.value.filter((value) => value !== item)
                                    : [...field.value, item];
                                  field.onChange(next);
                                }}
                              >
                                <span>{item}</span>
                                {checked ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                              </button>
                            </FormControl>
                            {checked && (
                              <div className="rounded-xl border border-[#7472fd]/20 bg-[#7472fd]/5 p-4">
                                <p className="text-xs font-semibold text-[#7472fd]">
                                  Descripción de {item}
                                </p>
                                <textarea
                                  placeholder={`Describe ${item.toLowerCase()}`}
                                  defaultValue={description}
                                  className="mt-2 min-h-[96px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (caracteristicas) {
                                      caracteristicas[item] = value;
                                    }
                                  }}
                                />
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                {formError && <p className="text-sm text-rose-500">{formError}</p>}
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
