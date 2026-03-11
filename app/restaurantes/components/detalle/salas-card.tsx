'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import {
  RestauranteSalasSchema,
  type RestauranteSalasForm,
  type SalaForm,
} from '@/lib/validators/restaurante-salas';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';
import { CARACTERISTICAS_FIJAS } from '@/lib/validators/restaurante-caracteristicas';

interface SalasCardProps {
  restauranteId: string;
  salas?: SalaForm[];
  restauranteCaracteristicas?: Record<string, string>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (next: SalaForm[]) => void;
}

export function SalasCard({
  restauranteId,
  salas,
  restauranteCaracteristicas,
  onUpdated,
  isOpen,
  onOpenChange,
}: SalasCardProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editDescripcionOpen, setEditDescripcionOpen] = useState(false);
  const [editDescripcionKey, setEditDescripcionKey] = useState<string | null>(null);
  const [editDescripcionSalaIndex, setEditDescripcionSalaIndex] = useState<number | null>(null);
  const [editDescripcionValue, setEditDescripcionValue] = useState('');
  const list = useMemo(() => salas ?? [], [salas]);
  const dialogOpen = isOpen ?? open;
  const setDialogOpen = onOpenChange ?? setOpen;
  const opciones = useMemo(() => Object.keys(restauranteCaracteristicas ?? {}), [restauranteCaracteristicas]);
  const opcionesFijas = useMemo(() => CARACTERISTICAS_FIJAS, []);

  const form = useForm<RestauranteSalasForm>({
    resolver: zodResolver(RestauranteSalasSchema) as Resolver<RestauranteSalasForm>,
    defaultValues: { salas: [] },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      salas: list.map((sala) => ({
        nombre: sala.nombre,
        descripcion: sala.descripcion,
        aforoMinimo: Number(sala.aforoMinimo ?? 0),
        aforoMaximo: Number(sala.aforoMaximo ?? 0),
        permiteReservaSinCompraAnticipada: sala.permiteReservaSinCompraAnticipada,
        precioPrivatizacion: Number(sala.precioPrivatizacion ?? 0),
        caracteristicas: sala.caracteristicas ?? {},
      })),
    });
  }, [form, list, dialogOpen]);

  const handleSubmit = async (values: RestauranteSalasForm) => {
    try {
      setIsSaving(true);
      await RestauranteDetalleService.updateSalas(restauranteId, values);
      onUpdated(values.salas);
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const addSala = () => {
    const current = form.getValues('salas');
    form.setValue('salas', [
      ...current,
      {
        nombre: '',
        descripcion: '',
        aforoMinimo: 0,
        aforoMaximo: 0,
        permiteReservaSinCompraAnticipada: false,
        precioPrivatizacion: 0,
        caracteristicas: {},
      },
    ]);
  };

  const openDescripcionEditor = (salaIndex: number, key: string, initialValue?: string) => {
    const current = form.getValues(`salas.${salaIndex}.caracteristicas`);
    const value = initialValue ?? current?.[key] ?? '';
    setEditDescripcionSalaIndex(salaIndex);
    setEditDescripcionKey(key);
    setEditDescripcionValue(value);
    setEditDescripcionOpen(true);
  };

  const saveDescripcion = () => {
    if (editDescripcionSalaIndex == null || !editDescripcionKey) return;
    const current = form.getValues(`salas.${editDescripcionSalaIndex}.caracteristicas`) ?? {};
    form.setValue(`salas.${editDescripcionSalaIndex}.caracteristicas`, {
      ...current,
      [editDescripcionKey]: editDescripcionValue,
    });
    setEditDescripcionOpen(false);
  };

  const cancelDescripcion = () => {
    if (editDescripcionSalaIndex == null || !editDescripcionKey) {
      setEditDescripcionOpen(false);
      return;
    }
    const current = form.getValues(`salas.${editDescripcionSalaIndex}.caracteristicas`) ?? {};
    if ((current[editDescripcionKey] ?? '') === '') {
      const next = { ...current };
      delete next[editDescripcionKey];
      form.setValue(`salas.${editDescripcionSalaIndex}.caracteristicas`, next, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
    setEditDescripcionOpen(false);
  };

  const removeSala = (index: number) => {
    const current = form.getValues('salas');
    form.setValue(
      'salas',
      current.filter((_, idx) => idx !== index)
    );
  };

  const visibleItems = list.slice(0, 2);

  return (
    <Card id="salas" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Salas</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {list.length}
        </span>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3 text-sm">
        <div className="space-y-3">
          {list.length === 0 ? (
            <p className="text-slate-500">Sin salas configuradas.</p>
          ) : (
            visibleItems.map((sala, index) => (
              <div key={`${sala.nombre}-${index}`} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{sala.nombre}</p>
                  <span className="text-xs text-slate-400">
                    {sala.aforoMinimo} - {sala.aforoMaximo} pax
                  </span>
                </div>
              <p className="mt-1 text-sm text-slate-500">{sala.descripcion}</p>
              <div className="mt-2 grid gap-2 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Privatizacion</span>
                  <span>{sala.precioPrivatizacion}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Reserva sin compra anticipada</span>
                  <span>{sala.permiteReservaSinCompraAnticipada ? 'Si' : 'No'}</span>
                </div>
              </div>
              {sala.caracteristicas && Object.keys(sala.caracteristicas).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {Object.keys(sala.caracteristicas).map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-2 py-1">
                      {item}
                    </span>
                  ))}
                </div>
              )}
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
              Editar salas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestionar salas</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {form.watch('salas').map((_, index) => (
                  <div key={`sala-${index}`} className="rounded-2xl border-2 border-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Sala {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => removeSala(index)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`salas.${index}.nombre`}
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
                        name={`salas.${index}.descripcion`}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[120px] resize-y" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`salas.${index}.aforoMinimo`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aforo minimo</FormLabel>
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
                      <FormField
                        control={form.control}
                        name={`salas.${index}.aforoMaximo`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aforo maximo</FormLabel>
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
                    <div className="mt-3 grid gap-4">
                      <FormField
                        control={form.control}
                        name={`salas.${index}.precioPrivatizacion`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio privatizacion</FormLabel>
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
                      <FormField
                        control={form.control}
                        name={`salas.${index}.permiteReservaSinCompraAnticipada`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reserva sin compra anticipada</FormLabel>
                            <FormControl>
                              <button
                                type="button"
                                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                  field.value
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                                }`}
                                onClick={() => field.onChange(!field.value)}
                              >
                                <span>
                                  {field.value ? 'Activado' : 'Desactivado'}
                                </span>
                                <span className="text-xs">
                                  {field.value ? 'Permite consumo libre' : 'Sin consumo libre'}
                                </span>
                              </button>
                            </FormControl>
                            <p className="text-xs text-slate-500">
                              Permite que el cliente reserve sin pago previo. Cuando aceptes una reserva, podrás solicitar
                              un anticipo según el tamaño del grupo y la política del restaurante.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Caracteristicas disponibles</p>
                        <p className="text-xs text-slate-500">
                          Selecciona de la lista general de características.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {opcionesFijas.map((item) => (
                            <FormField
                              key={`${item}-global-${index}`}
                              control={form.control}
                              name={`salas.${index}.caracteristicas`}
                              render={({ field }) => {
                                const selected = Object.prototype.hasOwnProperty.call(field.value ?? {}, item);
                                return (
                                  <FormItem>
                                    <FormLabel className="sr-only">{item}</FormLabel>
                                    <FormControl>
                                        <button
                                          type="button"
                                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                                            selected
                                              ? 'border-[#7472fd] bg-[#7472fd]/15 text-[#7472fd]'
                                              : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/50 hover:bg-[#7472fd]/5'
                                          }`}
                                          onClick={() => {
                                            const current = field.value ?? {};
                                            const next = { ...current };
                                            const wasSelected = Object.prototype.hasOwnProperty.call(current, item);
                                            if (next[item]) {
                                              delete next[item];
                                            } else {
                                              next[item] = '';
                                            }
                                            field.onChange(next);
                                            form.setValue(`salas.${index}.caracteristicas`, next, {
                                              shouldDirty: true,
                                              shouldTouch: true,
                                              shouldValidate: true,
                                            });
                                            if (!wasSelected) {
                                              openDescripcionEditor(index, item);
                                            }
                                          }}
                                        >
                                          <span>{item}</span>
                                          <span className="flex items-center gap-2">
                                            {selected && (
                                              <span
                                                className="flex h-7 w-7 items-center justify-center text-[#7472fd]"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  openDescripcionEditor(index, item);
                                                }}
                                              >
                                                ✎
                                              </span>
                                            )}
                                            <span className="text-xs">{selected ? 'Si' : '+'}</span>
                                          </span>
                                        </button>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Heredar del restaurante</p>
                        <p className="text-xs text-slate-500">
                          Marca las características ya definidas en el restaurante.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {opciones.length === 0 ? (
                            <p className="text-xs text-slate-400">No hay características del restaurante.</p>
                          ) : (
                            opciones.map((item) => (
                              <FormField
                                key={`${item}-rest-${index}`}
                                control={form.control}
                                name={`salas.${index}.caracteristicas`}
                                render={({ field }) => {
                                  const selected = Object.prototype.hasOwnProperty.call(field.value ?? {}, item);
                                  return (
                                    <FormItem>
                                      <FormLabel className="sr-only">{item}</FormLabel>
                                      <FormControl>
                                        <div className="flex w-full items-center gap-2">
                                          <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                                            selected
                                              ? 'border-emerald-400/60 bg-emerald-50 text-emerald-700'
                                              : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/40'
                                            }`}
                                          onClick={() => {
                                              const current = field.value ?? {};
                                              const next = { ...current };
                                              const wasSelected = Object.prototype.hasOwnProperty.call(current, item);
                                              if (next[item]) {
                                                delete next[item];
                                              } else {
                                                // Se añade al guardar la descripción
                                              }
                                              if (!wasSelected) {
                                                openDescripcionEditor(index, item, restauranteCaracteristicas?.[item] ?? '');
                                              } else {
                                                field.onChange(next);
                                                form.setValue(`salas.${index}.caracteristicas`, next, {
                                                  shouldDirty: true,
                                                  shouldTouch: true,
                                                  shouldValidate: true,
                                                });
                                              }
                                          }}
                                        >
                                            <span>{item}</span>
                                            <span className="text-xs">{selected ? 'Si' : '+'}</span>
                                          </button>
                                          
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addSala} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Anadir sala
                </Button>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar salas'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        <Dialog open={editDescripcionOpen} onOpenChange={setEditDescripcionOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Editar descripción</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                {editDescripcionKey ? `Característica: ${editDescripcionKey}` : 'Característica'}
              </p>
              <Textarea
                value={editDescripcionValue}
                onChange={(event) => setEditDescripcionValue(event.target.value)}
                rows={5}
                placeholder="Describe esta característica"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelDescripcion}>
                Cancelar
              </Button>
              <Button
                className="bg-[#7472fd] text-white"
                onClick={saveDescripcion}
                disabled={editDescripcionValue.trim().length === 0}
              >
                Guardar descripción
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
