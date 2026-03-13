'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
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
  const [focusedBarraIndex, setFocusedBarraIndex] = useState<number | null>(null);
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const skipResetRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmImportAllOpen, setConfirmImportAllOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successText, setSuccessText] = useState('');
  const importRef = useRef<HTMLDivElement | null>(null);
  const [isImportVisible, setIsImportVisible] = useState(false);
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
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
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

  useEffect(() => {
    if (!restauranteId || !importRef.current) return;
    const target = importRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => setIsImportVisible(entry.isIntersecting),
      { threshold: 0.4 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [restauranteId]);

  const addBarra = () => {
    append({
      Nombre: '',
      Descripción: '',
      intervalos: [],
      restaurantesIds: [],
      disponibilidadPorRestaurante: [],
    });
  };

  const openAddSingleBarra = () => {
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
    const nextIndex = safeBarras.length;
    const newBarra = {
      Nombre: '',
      Descripción: '',
      intervalos: [],
      restaurantesIds: [],
      disponibilidadPorRestaurante: [],
    };
    skipResetRef.current = true;
    form.reset({ barras: [...safeBarras, newBarra] });
    setFocusedBarraIndex(nextIndex);
    setIsAddingSingle(true);
    setOpen(true);
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

  const ensureImportBarra = (barra: BarraLibreEditForm) => {
    if (!restauranteId) return barra;
    const restaurantesIds = barra.restaurantesIds ?? [];
    const already = restaurantesIds.includes(restauranteId);
    const nextIds = already ? restaurantesIds : [...restaurantesIds, restauranteId];
    const disponibilidad = barra.disponibilidadPorRestaurante ?? [];
    const hasDisponibilidad = disponibilidad.some((item) => item.restauranteId === restauranteId);
    const nextDisponibilidad = hasDisponibilidad
      ? disponibilidad
      : [...disponibilidad, { restauranteId, diasDisponibles: [...DIAS] }];
    return { ...barra, restaurantesIds: nextIds, disponibilidadPorRestaurante: nextDisponibilidad };
  };

  const handleImportBarra = async (index: number) => {
    if (!restauranteId) return;
    const nextBarras = barras.map((barra, idx) => (idx === index ? ensureImportBarra(barra) : barra));
    await onSave(nextBarras);
    const targetName = restauranteNombre || 'el restaurante';
    setSuccessText(`Se ha añadido la barra libre a ${targetName}.`);
    setSuccessDialogOpen(true);
  };

  const handleImportAll = async () => {
    if (!restauranteId) return;
    const addedCount = barras.filter((barra) => !(barra.restaurantesIds ?? []).includes(restauranteId)).length;
    const nextBarras = barras.map((barra) =>
      (barra.restaurantesIds ?? []).includes(restauranteId) ? barra : ensureImportBarra(barra)
    );
    await onSave(nextBarras);
    const targetName = restauranteNombre || 'el restaurante';
    const label = addedCount === 1 ? 'Se ha añadido la barra libre a' : 'Se han añadido las barras libres a';
    setSuccessText(`${label} ${targetName}.`);
    setSuccessDialogOpen(true);
  };

  const handleSubmit = async (values: BarrasFormValues) => {
    try {
      setIsSaving(true);
      await onSave(values.barras);
      setOpen(false);
      if (isAddingSingle) {
        const targetName = restauranteNombre || '';
        const label = targetName ? `Se ha añadido la barra libre a ${targetName}.` : 'Se ha añadido la barra libre.';
        setSuccessText(label);
        setSuccessDialogOpen(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (restauranteId) {
    return (
      <div id="barras-libres" className="space-y-4 text-sm">
        {barras.length === 0 ? (
          <p className="text-slate-500">Sin barras libres configuradas.</p>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold text-slate-900">Barras libres activas en {restauranteNombre}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {!isImportVisible && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2"
                      onClick={() => importRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    >
                      <Download className="h-4 w-4" />
                      Importar barras libres existentes
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-8 gap-2" onClick={openAddSingleBarra}>
                    <Plus className="h-4 w-4" />
                    Añadir nueva barra libre
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {visible
                  .map((barra, index) => ({ barra, index }))
                  .filter(({ barra }) => barra.restaurantesIds?.includes(restauranteId))
                  .map(({ barra, index }) => (
                    <div key={`${barra.Nombre}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <p className="font-semibold text-slate-900">{barra.Nombre || 'Barra libre'}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => {
                            setFocusedBarraIndex(index);
                            setIsAddingSingle(false);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar barra libre
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <p className="text-xs font-semibold text-slate-700">Contenido de la barra libre</p>
                          <div className="mt-2 space-y-2 text-xs text-slate-600">
                            <div className="rounded-lg border border-white bg-white px-2 py-1">
                              <p className="text-[11px] font-semibold text-slate-700">Descripción</p>
                              <p className="text-[11px] text-slate-500">
                                {barra['Descripción'] || 'Sin descripción.'}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white bg-white px-2 py-1">
                              <p className="text-[11px] font-semibold text-slate-700">Intervalos</p>
                              {(barra.intervalos ?? []).length > 0 ? (
                                <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
                                  {(barra.intervalos ?? []).slice(0, 3).map((intervalo, idx) => (
                                    <li key={`${barra.Nombre}-${idx}`}>
                                      {intervalo.duracionMin} - {intervalo.duracionMax} · {intervalo.precio ?? 0}€
                                    </li>
                                  ))}
                                  {(barra.intervalos ?? []).length > 3 && (
                                    <li className="text-[11px] text-slate-400">
                                      +{(barra.intervalos ?? []).length - 3} intervalos más
                                    </li>
                                  )}
                                </ul>
                              ) : (
                                <p className="text-[11px] text-slate-400">Sin intervalos.</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700">Disponibilidad por restaurante</p>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {barra.restaurantesIds && barra.restaurantesIds.length > 0 ? (
                              barra.restaurantesIds.map((id) => {
                                const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                                const dias = (barra.disponibilidadPorRestaurante ?? []).find(
                                  (item) => item.restauranteId === id
                                )?.diasDisponibles ?? [];
                                return (
                                  <div
                                    key={id}
                                    className="flex flex-wrap items-center gap-2 rounded-lg border border-white bg-white/80 px-2.5 py-1.5"
                                  >
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                      {nombre}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {dias.length > 0 ? (
                                        dias.map((dia) => (
                                          <span
                                            key={`${id}-${dia}`}
                                            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                                          >
                                            {dia}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[11px] text-slate-400">Sin días</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-400">Sin restaurantes asignados.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {visible.filter((barra) => barra.restaurantesIds?.includes(restauranteId)).length === 0 && (
                  <p className="text-sm text-slate-500">No hay barras libres activas en este local.</p>
                )}
              </div>
            </div>

            <div ref={importRef} className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold text-slate-900">Importar barras libres de otros locales</p>
                {visible.some((barra) => !barra.restaurantesIds?.includes(restauranteId)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => setConfirmImportAllOpen(true)}
                  >
                    <Download className="h-4 w-4" />
                    Importar todas las barras libres a {restauranteNombre}
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {visible
                  .map((barra, index) => ({ barra, index }))
                  .filter(({ barra }) => !barra.restaurantesIds?.includes(restauranteId))
                  .map(({ barra, index }) => (
                    <div key={`${barra.Nombre}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-rose-500" />
                            <p className="font-semibold text-slate-900">{barra.Nombre || 'Barra libre'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => {
                              setFocusedBarraIndex(index);
                              setIsAddingSingle(false);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar barra libre
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => handleImportBarra(index)}
                          >
                            <Download className="h-4 w-4" />
                            Importar barra libre a {restauranteNombre}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <p className="text-xs font-semibold text-slate-700">Contenido de la barra libre</p>
                          <div className="mt-2 space-y-2 text-xs text-slate-600">
                            <div className="rounded-lg border border-white bg-white px-2 py-1">
                              <p className="text-[11px] font-semibold text-slate-700">Descripción</p>
                              <p className="text-[11px] text-slate-500">
                                {barra['Descripción'] || 'Sin descripción.'}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white bg-white px-2 py-1">
                              <p className="text-[11px] font-semibold text-slate-700">Intervalos</p>
                              {(barra.intervalos ?? []).length > 0 ? (
                                <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
                                  {(barra.intervalos ?? []).slice(0, 3).map((intervalo, idx) => (
                                    <li key={`${barra.Nombre}-${idx}`}>
                                      {intervalo.duracionMin} - {intervalo.duracionMax} · {intervalo.precio ?? 0}€
                                    </li>
                                  ))}
                                  {(barra.intervalos ?? []).length > 3 && (
                                    <li className="text-[11px] text-slate-400">
                                      +{(barra.intervalos ?? []).length - 3} intervalos más
                                    </li>
                                  )}
                                </ul>
                              ) : (
                                <p className="text-[11px] text-slate-400">Sin intervalos.</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700">Disponibilidad por restaurante</p>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {barra.restaurantesIds && barra.restaurantesIds.length > 0 ? (
                              barra.restaurantesIds.map((id) => {
                                const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                                const dias = (barra.disponibilidadPorRestaurante ?? []).find(
                                  (item) => item.restauranteId === id
                                )?.diasDisponibles ?? [];
                                return (
                                  <div
                                    key={id}
                                    className="flex flex-wrap items-center gap-2 rounded-lg border border-white bg-white/80 px-2.5 py-1.5"
                                  >
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                      {nombre}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {dias.length > 0 ? (
                                        dias.map((dia) => (
                                          <span
                                            key={`${id}-${dia}`}
                                            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                                          >
                                            {dia}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[11px] text-slate-400">Sin días</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-400">Sin restaurantes asignados.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {visible.filter((barra) => !barra.restaurantesIds?.includes(restauranteId)).length === 0 && (
                  <p className="text-sm text-slate-500">No hay barras libres pendientes de importar.</p>
                )}
              </div>
            </div>

            <Dialog open={confirmImportAllOpen} onOpenChange={setConfirmImportAllOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Importar todas las barras libres?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600">
                  Se añadirán todas tus barras libres al restaurante seleccionado.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setConfirmImportAllOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
                    onClick={async () => {
                      await handleImportAll();
                      setConfirmImportAllOpen(false);
                    }}
                  >
                    Importar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
              <DialogContent className="max-w-md">
                <div className="flex flex-col items-center gap-4 py-2 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm animate-pulse">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle>Actualización completada</DialogTitle>
                    <p className="text-sm text-slate-600">{successText}</p>
                  </div>
                  <Button className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]" onClick={() => setSuccessDialogOpen(false)}>
                    Entendido
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setFocusedBarraIndex(null);
              setIsAddingSingle(false);
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar barras libres</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field, index) => {
                  if (focusedBarraIndex != null && focusedBarraIndex !== index) return null;
                  return (
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
                        <FormField
                          control={form.control}
                          name={`barras.${index}.Descripción` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value ?? ''} rows={5} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">Intervalos</p>
                        <div className="space-y-2">
                          {(form.watch(`barras.${index}.intervalos` as const) ?? []).map((intervalo, intervaloIndex) => (
                            <div key={`${field.id}-intervalo-${intervaloIndex}`} className="flex flex-wrap gap-2">
                              <FormField
                                control={form.control}
                                name={`barras.${index}.intervalos.${intervaloIndex}.duracionMin` as const}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel>Duración mínima</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`barras.${index}.intervalos.${intervaloIndex}.duracionMax` as const}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel>Duración máxima</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`barras.${index}.intervalos.${intervaloIndex}.precio` as const}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
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
                              <Button
                                type="button"
                                variant="outline"
                                className="mt-6 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => removeIntervalo(index, intervaloIndex)}
                              >
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" onClick={() => addIntervalo(index)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Añadir intervalo
                          </Button>
                        </div>
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
                              <div className="mt-2 flex flex-wrap items-center gap-2">
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
                                <button
                                  type="button"
                                  className="ml-auto rounded-full border px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[#7472fd]/40"
                                  onClick={() => {
                                    const currentValue = form.getValues(`barras.${index}` as const);
                                    if (!currentValue) return;
                                    const disponibilidadList = currentValue.disponibilidadPorRestaurante ?? [];
                                    const nextDisponibilidad = disponibilidadList.map((item) => {
                                      if (item.restauranteId !== restId) return item;
                                      return { ...item, diasDisponibles: [...DIAS] };
                                    });
                                    update(index, {
                                      ...currentValue,
                                      disponibilidadPorRestaurante: nextDisponibilidad,
                                    });
                                  }}
                                >
                                  Todos
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {focusedBarraIndex == null && !isAddingSingle && (
                  <Button type="button" variant="outline" onClick={addBarra} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir barra libre
                  </Button>
                )}
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
      </div>
    );
  }

  return (
    <Card id="barras-libres" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Barras libres</CardTitle>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {barras.length}
            </span>
          </div>
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
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={openAddSingleBarra}>
            <Plus className="h-4 w-4" />
            Añadir barra libre
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => {
              setFocusedBarraIndex(null);
              setIsAddingSingle(false);
              setOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
            Editar barras libres
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
              <div key={`${barra.Nombre}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {hasRestaurante &&
                        (included ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-500" />
                        ))}
                      <p className="font-semibold text-slate-900">{barra.Nombre || 'Barra libre'}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setFocusedBarraIndex(index);
                      setOpen(true);
                    }}
                  >
                    Editar barra libre
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                    <p className="text-xs font-semibold text-slate-700">Contenido de la barra libre</p>
                    <div className="mt-2 space-y-2 text-xs text-slate-600">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1">
                        <p className="text-[11px] font-semibold text-slate-700">Descripción</p>
                        <p className="text-[11px] text-slate-500">
                          {barra['Descripción'] || 'Sin descripción.'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1">
                        <p className="text-[11px] font-semibold text-slate-700">Intervalos</p>
                        <div className="mt-1 space-y-1.5">
                          {(barra.intervalos ?? []).length > 0 ? (
                            <>
                              {(barra.intervalos ?? []).slice(0, 3).map((intervalo, idx) => (
                                <div
                                  key={`intervalo-${idx}`}
                                  className="flex items-center justify-between text-[11px] text-slate-600"
                                >
                                  <span>
                                    {intervalo.duracionMin || '—'} - {intervalo.duracionMax || '—'}
                                  </span>
                                  <span className="font-semibold text-slate-700">{intervalo.precio ?? 0}€</span>
                                </div>
                              ))}
                              {(barra.intervalos ?? []).length > 3 && (
                                <p className="text-[11px] text-slate-400">
                                  +{(barra.intervalos ?? []).length - 3} intervalos más
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-[11px] text-slate-400">Sin intervalos.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">Disponibilidad por restaurante</p>
                    </div>
                    <div className="mt-2 space-y-2">
                      {barra.restaurantesIds && barra.restaurantesIds.length > 0 ? (
                        barra.restaurantesIds.map((id) => {
                          const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                          const dias = (barra.disponibilidadPorRestaurante ?? []).find(
                            (item) => item.restauranteId === id
                          )?.diasDisponibles ?? [];
                          return (
                            <div key={id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white bg-white/80 px-2.5 py-1.5">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {nombre}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {dias.length > 0 ? (
                                  dias.map((dia) => (
                                    <span
                                      key={`${id}-${dia}`}
                                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                                    >
                                      {dia}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400">Sin días</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400">Sin restaurantes asignados.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <Button
          variant="outline"
          onClick={openAddSingleBarra}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Añadir barra libre
        </Button>
        {hasRestaurante && barras.length > 0 && !hasIncluded && (
          <p className="text-xs text-slate-500">
            Este restaurante no tiene barras libres asignadas. Añade una desde el editor para activarlas.
          </p>
        )}
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setFocusedBarraIndex(null);
              setIsAddingSingle(false);
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar barras libres</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field, index) => {
                  if (focusedBarraIndex != null && focusedBarraIndex !== index) return null;
                  return (
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
                              <div className="mt-2 flex flex-wrap items-center gap-2">
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
                                <button
                                  type="button"
                                  className="ml-auto rounded-full border px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[#7472fd]/40"
                                  onClick={() => {
                                    const currentValue = form.getValues(`barras.${index}` as const);
                                    if (!currentValue) return;
                                    const disponibilidadList = currentValue.disponibilidadPorRestaurante ?? [];
                                    const nextDisponibilidad = disponibilidadList.map((item) => {
                                      if (item.restauranteId !== restId) return item;
                                      return { ...item, diasDisponibles: [...DIAS] };
                                    });
                                    update(index, {
                                      ...currentValue,
                                      disponibilidadPorRestaurante: nextDisponibilidad,
                                    });
                                  }}
                                >
                                  Todos
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">Intervalos</p>
                        {(form.watch(`barras.${index}.intervalos` as const) ?? []).map((_, intervalIndex) => (
                          <div
                            key={`intervalo-${index}-${intervalIndex}`}
                            className="rounded-xl border border-slate-100 p-3"
                          >
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
                          </div>
                        ))}
                        <Button type="button" variant="outline" onClick={() => addIntervalo(index)}>
                          Añadir intervalo
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {focusedBarraIndex == null && !isAddingSingle && (
                  <Button type="button" variant="outline" onClick={addBarra} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir barra libre
                  </Button>
                )}
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
