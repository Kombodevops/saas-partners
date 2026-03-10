'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BarraLibreEditSchema, type BarraLibreEditForm } from '@/lib/validators/pack-edit';

const BarrasFormSchema = z.object({
  barras: BarraLibreEditSchema.array(),
});
type BarrasForm = BarraLibreEditForm[];

interface BarrasFormValues {
  barras: BarrasForm;
}

interface BarrasLibresEditorProps {
  barras: BarraLibreEditForm[];
  restaurantes: { id: string; nombre: string }[];
  restauranteId?: string;
  onSave: (barras: BarraLibreEditForm[]) => Promise<void>;
}

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function BarrasLibresEditor({
  barras,
  onSave,
  restaurantes,
  restauranteId,
}: BarrasLibresEditorProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const visible = useMemo(() => barras, [barras]);
  const hasRestaurante = Boolean(restauranteId);
  const hasIncluded = hasRestaurante
    ? barras.some((barra) => barra.restaurantesIds?.includes(restauranteId ?? ''))
    : false;
  const restauranteNombre =
    restauranteId && restaurantes.length > 0
      ? restaurantes.find((rest) => rest.id === restauranteId)?.nombre ?? restauranteId
      : restauranteId ?? '';

  const form = useForm<BarrasFormValues>({
    resolver: zodResolver(BarrasFormSchema) as Resolver<BarrasFormValues>,
    defaultValues: { barras: [] },
  });
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'barras',
  });

  useEffect(() => {
    if (!open) return;
    const safeBarras = (barras ?? []).map((barra) => ({
      Nombre: barra.Nombre ?? '',
      Descripción: barra['Descripción'] ?? '',
      restaurantesIds: barra.restaurantesIds ?? [],
      disponibilidadPorRestaurante: barra.disponibilidadPorRestaurante ?? [],
      intervalos: (barra.intervalos ?? []).map((intervalo) => ({
        duracionMin: intervalo.duracionMin ?? '',
        duracionMax: intervalo.duracionMax ?? '',
        precio: Number(intervalo.precio ?? 0),
      })),
    }));
    form.reset({ barras: safeBarras });
  }, [form, barras, open]);

  const addBarra = () => {
    append({
      Nombre: '',
      Descripción: '',
      intervalos: [],
      restaurantesIds: [],
      disponibilidadPorRestaurante: [],
    });
  };

  const removeBarra = (index: number) => {
    remove(index);
  };

  const addIntervalo = (index: number) => {
    const current = form.getValues('barras');
    const target = current?.[index];
    if (!target) return;
    const intervalos = [...(target.intervalos ?? []), { duracionMin: '', duracionMax: '', precio: 0 }];
    update(index, { ...target, intervalos });
  };

  const removeIntervalo = (index: number, intervalIndex: number) => {
    const current = form.getValues('barras');
    const target = current?.[index];
    if (!target) return;
    const intervalos = (target.intervalos ?? []).filter((_, idx) => idx !== intervalIndex);
    update(index, { ...target, intervalos });
  };

  const handleSubmit = async (values: BarrasFormValues) => {
    try {
      setIsSaving(true);
      await onSave(values.barras);
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card id="barras-libres" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">Barras libres</CardTitle>
          {hasRestaurante && (
            <p className="text-xs text-slate-500">
              Las barras libres incluidas en "{restauranteNombre}" tienen
              <span className="mx-1 inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> check verde
              </span>
              y las no incluidas
              <span className="mx-1 inline-flex items-center gap-1 text-rose-600">
                <XCircle className="h-3.5 w-3.5" /> cruz roja
              </span>.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {barras.length}
          </span>
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {barras.length === 0 ? (
          <p className="text-slate-500">Sin barras libres configuradas.</p>
        ) : (
          visible.map((barra, index) => {
            const included = hasRestaurante ? Boolean(barra.restaurantesIds?.includes(restauranteId ?? '')) : false;
            return (
              <div key={`${barra.Nombre}-${index}`} className="rounded-xl border border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  {hasRestaurante &&
                    (included ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500" />
                    ))}
                  <p className="font-semibold text-slate-900">{barra.Nombre}</p>
                </div>
              <p className="text-xs text-slate-500">{barra['Descripción']}</p>
              <p className="text-xs text-slate-500">Intervalos: {barra.intervalos?.length ?? 0}</p>
              {barra.restaurantesIds && barra.restaurantesIds.length > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">
                    Restaurantes en los que está disponible la barra libre:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {barra.restaurantesIds.map((id) => {
                      const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                      return (
                        <span key={id} className="rounded-full bg-slate-100 px-2 py-1">
                          {nombre}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {barra.disponibilidadPorRestaurante && barra.disponibilidadPorRestaurante.length > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">
                    Días disponibles de la barra libre por restaurante:
                  </p>
                  <div className="mt-1 space-y-1">
                    {barra.disponibilidadPorRestaurante.map((disp) => {
                      const nombre = restaurantes.find((r) => r.id === disp.restauranteId)?.nombre ?? disp.restauranteId;
                      return (
                        <p key={disp.restauranteId}>
                          {nombre}: {disp.diasDisponibles.join(', ') || 'Sin días'}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            );
          })
        )}
        {hasRestaurante && barras.length > 0 && !hasIncluded && (
          <p className="text-xs text-slate-500">
            Este restaurante no tiene barras libres asignadas. Añade una desde el editor para activarlas.
          </p>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar barras libres</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-2xl border-2 border-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Barra libre {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => removeBarra(index)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`barras.${index}.Nombre` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-3">
                      <FormField
                        control={form.control}
                        name={`barras.${index}.Descripción` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea {...field} value={field.value ?? ''} rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Restaurantes incluidos</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {restaurantes.map((rest) => {
                          const current = form.getValues(`barras.${index}` as const);
                          const selected = Boolean(current?.restaurantesIds?.includes(rest.id));
                          return (
                            <button
                              type="button"
                              key={rest.id}
                              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                                selected
                                  ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                                  : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                              }`}
                              onClick={() => {
                                const currentValue = form.getValues(`barras.${index}` as const);
                                if (!currentValue) return;
                                const restaurantesIds = currentValue.restaurantesIds ?? [];
                                const disponibilidad = currentValue.disponibilidadPorRestaurante ?? [];
                                const has = restaurantesIds.includes(rest.id);
                                const nextIds = has
                                  ? restaurantesIds.filter((id) => id !== rest.id)
                                  : [...restaurantesIds, rest.id];
                                const nextDisponibilidad = has
                                  ? disponibilidad.filter((item) => item.restauranteId !== rest.id)
                                  : [...disponibilidad, { restauranteId: rest.id, diasDisponibles: [] }];
                                update(index, {
                                  ...currentValue,
                                  restaurantesIds: nextIds,
                                  disponibilidadPorRestaurante: nextDisponibilidad,
                                });
                              }}
                            >
                              <span>{rest.nombre}</span>
                              <span className="text-xs">{selected ? 'Sí' : '+'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Días disponibles por restaurante</p>
                      {(form.watch(`barras.${index}.restaurantesIds` as const) ?? []).map((restId) => {
                        const nombre = restaurantes.find((r) => r.id === restId)?.nombre ?? restId;
                        const current = form.getValues(`barras.${index}` as const);
                        const disponibilidad = current?.disponibilidadPorRestaurante ?? [];
                        const entry = disponibilidad.find((item) => item.restauranteId === restId);
                        const selectedDays = entry?.diasDisponibles ?? [];
                        return (
                          <div key={restId} className="rounded-xl border border-slate-100 p-3">
                            <p className="text-xs font-semibold text-slate-700">{nombre}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {DIAS.map((dia) => {
                                const isSelected = selectedDays.includes(dia);
                                return (
                                  <button
                                    key={dia}
                                    type="button"
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                      isSelected
                                        ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#7472fd]'
                                        : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                                    }`}
                                    onClick={() => {
                                      const currentValue = form.getValues(`barras.${index}` as const);
                                      if (!currentValue) return;
                                      const disponibilidadList = currentValue.disponibilidadPorRestaurante ?? [];
                                      const nextDisponibilidad = disponibilidadList.map((item) => {
                                        if (item.restauranteId !== restId) return item;
                                        const nextDias = isSelected
                                          ? item.diasDisponibles.filter((d) => d !== dia)
                                          : [...item.diasDisponibles, dia];
                                        return { ...item, diasDisponibles: nextDias };
                                      });
                                      update(index, {
                                        ...currentValue,
                                        disponibilidadPorRestaurante: nextDisponibilidad,
                                      });
                                    }}
                                  >
                                    {dia}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Intervalos</p>
                      {(form.watch(`barras.${index}.intervalos` as const) ?? []).map((_, intervalIndex) => (
                        <div key={`intervalo-${index}-${intervalIndex}`} className="rounded-xl border border-slate-100 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700">Intervalo {intervalIndex + 1}</p>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => removeIntervalo(index, intervalIndex)}
                            >
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </div>
                          <div className="mt-3 grid gap-4 sm:grid-cols-3">
                            <FormField
                              control={form.control}
                              name={`barras.${index}.intervalos.${intervalIndex}.duracionMin` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duración mínima</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value ?? ''} placeholder="Ej: 1h" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`barras.${index}.intervalos.${intervalIndex}.duracionMax` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duración máxima</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value ?? ''} placeholder="Ej: 3h" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`barras.${index}.intervalos.${intervalIndex}.precio` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Precio</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} value={field.value ?? 0} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={() => addIntervalo(index)}>
                        Añadir intervalo
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addBarra} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Añadir barra libre
                </Button>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar barras libres'}
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
