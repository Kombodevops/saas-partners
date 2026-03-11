'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TicketEditSchema, type TicketEditForm } from '@/lib/validators/pack-edit';

const TicketsFormSchema = z.object({
  tickets: TicketEditSchema.array(),
});
type TicketsForm = TicketEditForm[];

interface TicketsFormValues {
  tickets: TicketsForm;
}

interface TicketsEditorProps {
  tickets: TicketEditForm[];
  restaurantes: { id: string; nombre: string }[];
  restauranteId?: string;
  onSave: (tickets: TicketEditForm[]) => Promise<void>;
}

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function TicketsEditor({ tickets, onSave, restaurantes, restauranteId }: TicketsEditorProps) {
  const restauranteNombre =
    restauranteId && restaurantes.length > 0
      ? restaurantes.find((rest) => rest.id === restauranteId)?.nombre ?? restauranteId
      : restauranteId ?? '';
  const [open, setOpen] = useState(false);
  const [focusedTicketIndex, setFocusedTicketIndex] = useState<number | null>(null);
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const skipResetRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmImportAllOpen, setConfirmImportAllOpen] = useState(false);
  const importRef = useRef<HTMLDivElement | null>(null);
  const [isImportVisible, setIsImportVisible] = useState(false);
  const visible = useMemo(() => tickets, [tickets]);

  const form = useForm<TicketsFormValues>({
    resolver: zodResolver(TicketsFormSchema) as Resolver<TicketsFormValues>,
    defaultValues: { tickets: [] },
  });
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'tickets',
  });

  useEffect(() => {
    if (!open) return;
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    const safeTickets = (tickets ?? []).map((ticket) => ({
      Nombre: ticket.Nombre ?? '',
      Descripción: ticket['Descripción'] ?? '',
      Precio: Number(ticket.Precio ?? 0),
      restaurantesIds: ticket.restaurantesIds ?? [],
      disponibilidadPorRestaurante: ticket.disponibilidadPorRestaurante ?? [],
    }));
    form.reset({ tickets: safeTickets });
  }, [form, tickets, open]);

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

  const addTicket = () => {
    append({
      Nombre: '',
      Descripción: '',
      Precio: 0,
      restaurantesIds: [],
      disponibilidadPorRestaurante: [],
    });
  };

  const openAddSingleTicket = () => {
    const safeTickets = (tickets ?? []).map((ticket) => ({
      Nombre: ticket.Nombre ?? '',
      Descripción: ticket['Descripción'] ?? '',
      Precio: Number(ticket.Precio ?? 0),
      restaurantesIds: ticket.restaurantesIds ?? [],
      disponibilidadPorRestaurante: ticket.disponibilidadPorRestaurante ?? [],
    }));
    const nextIndex = safeTickets.length;
    const newTicket = {
      Nombre: '',
      Descripción: '',
      Precio: 0,
      restaurantesIds: [],
      disponibilidadPorRestaurante: [],
    };
    skipResetRef.current = true;
    form.reset({ tickets: [...safeTickets, newTicket] });
    setFocusedTicketIndex(nextIndex);
    setIsAddingSingle(true);
    setOpen(true);
  };

  const removeTicket = (index: number) => {
    remove(index);
  };

  const ensureImportTicket = (ticket: TicketEditForm) => {
    if (!restauranteId) return ticket;
    const restaurantesIds = ticket.restaurantesIds ?? [];
    const already = restaurantesIds.includes(restauranteId);
    const nextIds = already ? restaurantesIds : [...restaurantesIds, restauranteId];
    const disponibilidad = ticket.disponibilidadPorRestaurante ?? [];
    const hasDisponibilidad = disponibilidad.some((item) => item.restauranteId === restauranteId);
    const nextDisponibilidad = hasDisponibilidad
      ? disponibilidad
      : [...disponibilidad, { restauranteId, diasDisponibles: [...DIAS] }];
    return { ...ticket, restaurantesIds: nextIds, disponibilidadPorRestaurante: nextDisponibilidad };
  };

  const handleImportTicket = async (index: number) => {
    if (!restauranteId) return;
    const nextTickets = tickets.map((ticket, idx) => (idx === index ? ensureImportTicket(ticket) : ticket));
    await onSave(nextTickets);
  };

  const handleImportAll = async () => {
    if (!restauranteId) return;
    const nextTickets = tickets.map((ticket) =>
      (ticket.restaurantesIds ?? []).includes(restauranteId) ? ticket : ensureImportTicket(ticket)
    );
    await onSave(nextTickets);
  };

  const handleSubmit = async (values: TicketsFormValues) => {
    try {
      setIsSaving(true);
      await onSave(values.tickets);
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (restauranteId) {
    return (
      <div id="tickets" className="space-y-4 text-sm">
        {tickets.length === 0 ? (
          <p className="text-slate-500">Sin tickets configurados.</p>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold text-slate-900">Tickets activos en {restauranteNombre}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {!isImportVisible && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2"
                      onClick={() => importRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    >
                      <Download className="h-4 w-4" />
                      Importar tickets existentes
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-8 gap-2" onClick={openAddSingleTicket}>
                    <Plus className="h-4 w-4" />
                    Añadir nuevo ticket
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {visible
                  .map((ticket, index) => ({ ticket, index }))
                  .filter(({ ticket }) => ticket.restaurantesIds?.includes(restauranteId))
                  .map(({ ticket, index }) => (
                    <div key={`${ticket.Nombre}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <p className="font-semibold text-slate-900">{ticket.Nombre || 'Ticket'}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => {
                            setFocusedTicketIndex(index);
                            setIsAddingSingle(false);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar ticket
                        </Button>
                      </div>

                      <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-[1fr_1fr]">
                        <div className="flex h-full flex-col rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <p className="text-xs font-semibold text-slate-700">Contenido del ticket</p>
                          <div className="mt-2 flex flex-1 flex-col space-y-2 text-xs text-slate-600">
                            <div className="rounded-lg border border-white bg-white px-2 py-1">
                              <p className="text-[11px] font-semibold text-slate-700">Descripción</p>
                              <p className="text-[11px] text-slate-500">
                                {ticket['Descripción'] || 'Sin descripción.'}
                              </p>
                            </div>
                            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-white bg-white px-2 py-2 text-center">
                              <p className="text-[11px] font-semibold text-slate-700">Precio</p>
                              <p className="mt-1 text-2xl font-semibold text-slate-900">{ticket.Precio ?? 0}€</p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700">Disponibilidad por restaurante</p>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {ticket.restaurantesIds && ticket.restaurantesIds.length > 0 ? (
                              ticket.restaurantesIds.map((id) => {
                                const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                                const dias = (ticket.disponibilidadPorRestaurante ?? []).find(
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
                {visible.filter((ticket) => ticket.restaurantesIds?.includes(restauranteId)).length === 0 && (
                  <p className="text-sm text-slate-500">No hay tickets activos en este local.</p>
                )}
              </div>
            </div>

            <div ref={importRef} className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold text-slate-900">Importar tickets de otros locales</p>
                {visible.some((ticket) => !ticket.restaurantesIds?.includes(restauranteId)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => setConfirmImportAllOpen(true)}
                  >
                    <Download className="h-4 w-4" />
                    Importar todos los tickets a {restauranteNombre}
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {visible
                  .map((ticket, index) => ({ ticket, index }))
                  .filter(({ ticket }) => !ticket.restaurantesIds?.includes(restauranteId))
                  .map(({ ticket, index }) => (
                    <div key={`${ticket.Nombre}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-rose-500" />
                            <p className="font-semibold text-slate-900">{ticket.Nombre || 'Ticket'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => {
                              setFocusedTicketIndex(index);
                              setIsAddingSingle(false);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar ticket
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => handleImportTicket(index)}
                          >
                            <Download className="h-4 w-4" />
                            Importar ticket a {restauranteNombre}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-[1fr_1fr]">
                        <div className="flex h-full flex-col rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <p className="text-xs font-semibold text-slate-700">Contenido del ticket</p>
                          <div className="mt-2 flex flex-1 flex-col space-y-2 text-xs text-slate-600">
                            <div className="rounded-lg border border-white bg-white px-2 py-1">
                              <p className="text-[11px] font-semibold text-slate-700">Descripción</p>
                              <p className="text-[11px] text-slate-500">
                                {ticket['Descripción'] || 'Sin descripción.'}
                              </p>
                            </div>
                            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-white bg-white px-2 py-2 text-center">
                              <p className="text-[11px] font-semibold text-slate-700">Precio</p>
                              <p className="mt-1 text-2xl font-semibold text-slate-900">{ticket.Precio ?? 0}€</p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700">Disponibilidad por restaurante</p>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {ticket.restaurantesIds && ticket.restaurantesIds.length > 0 ? (
                              ticket.restaurantesIds.map((id) => {
                                const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                                const dias = (ticket.disponibilidadPorRestaurante ?? []).find(
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
                {visible.filter((ticket) => !ticket.restaurantesIds?.includes(restauranteId)).length === 0 && (
                  <p className="text-sm text-slate-500">No hay tickets pendientes de importar.</p>
                )}
              </div>
            </div>

            <Dialog open={confirmImportAllOpen} onOpenChange={setConfirmImportAllOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Importar todos los tickets?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600">
                  Se añadirán todos tus tickets al restaurante seleccionado.
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
          </>
        )}
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setFocusedTicketIndex(null);
              setIsAddingSingle(false);
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar tickets</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field, index) => {
                  if (focusedTicketIndex != null && focusedTicketIndex !== index) return null;
                  return (
                    <div key={field.id} className="rounded-2xl border-2 border-slate-800 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Ticket {index + 1}</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => removeTicket(index)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`tickets.${index}.Nombre` as const}
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
                          name={`tickets.${index}.Precio` as const}
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
                      <div className="mt-3 grid gap-4">
                        <FormField
                          control={form.control}
                          name={`tickets.${index}.Descripción` as const}
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
                        <p className="text-sm font-semibold text-slate-900">Restaurantes incluidos</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {restaurantes.map((rest) => {
                            const current = form.getValues(`tickets.${index}` as const);
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
                                  const currentValue = form.getValues(`tickets.${index}` as const);
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
                        {(form.watch(`tickets.${index}.restaurantesIds` as const) ?? []).map((restId) => {
                          const nombre = restaurantes.find((r) => r.id === restId)?.nombre ?? restId;
                          const current = form.getValues(`tickets.${index}` as const);
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
                                        const currentValue = form.getValues(`tickets.${index}` as const);
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
                                    const currentValue = form.getValues(`tickets.${index}` as const);
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
                {focusedTicketIndex == null && !isAddingSingle && (
                  <Button type="button" variant="outline" onClick={addTicket} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir ticket
                  </Button>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar tickets'}
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
    <Card id="tickets" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Tickets</CardTitle>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {tickets.length}
            </span>
          </div>
          {restauranteId && (
            <p className="text-xs text-slate-500">
              Los tickets incluidos en "{restauranteNombre}" tienen
              <span className="mx-1 inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> check verde
              </span>
              y los no incluidos
              <span className="mx-1 inline-flex items-center gap-1 text-rose-600">
                <XCircle className="h-3.5 w-3.5" /> cruz roja
              </span>.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={openAddSingleTicket}>
            <Plus className="h-4 w-4" />
            Añadir ticket
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => {
              setFocusedTicketIndex(null);
              setIsAddingSingle(false);
              setOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
            Editar tickets
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {tickets.length === 0 ? (
          <p className="text-slate-500">Sin tickets configurados.</p>
        ) : (
          visible.map((ticket, index) => {
            const included = restauranteId ? ticket.restaurantesIds?.includes(restauranteId) : null;
            return (
              <div key={`${ticket.Nombre}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {included === null ? null : included ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500" />
                      )}
                      <p className="font-semibold text-slate-900">{ticket.Nombre || 'Ticket'}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setFocusedTicketIndex(index);
                      setIsAddingSingle(false);
                      setOpen(true);
                    }}
                  >
                    Editar ticket
                  </Button>
                </div>

                <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-[1fr_1fr]">
                  <div className="flex h-full flex-col rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                    <p className="text-xs font-semibold text-slate-700">Contenido del ticket</p>
                    <div className="mt-2 flex flex-1 flex-col space-y-2 text-xs text-slate-600">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1">
                        <p className="text-[11px] font-semibold text-slate-700">Descripción</p>
                        <p className="text-[11px] text-slate-500">
                          {ticket['Descripción'] || 'Sin descripción.'}
                        </p>
                      </div>
                      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 text-center">
                        <p className="text-[11px] font-semibold text-slate-700">Precio</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">{ticket.Precio ?? 0}€</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">Disponibilidad por restaurante</p>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {ticket.restaurantesIds && ticket.restaurantesIds.length > 0 ? (
                        ticket.restaurantesIds.map((id) => {
                          const nombre = restaurantes.find((r) => r.id === id)?.nombre ?? id;
                          const dias = (ticket.disponibilidadPorRestaurante ?? []).find(
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
        <Button variant="outline" onClick={openAddSingleTicket} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Añadir ticket
        </Button>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setFocusedTicketIndex(null);
              setIsAddingSingle(false);
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar tickets</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field, index) => {
                  if (focusedTicketIndex != null && focusedTicketIndex !== index) return null;
                  return (
                    <div key={field.id} className="rounded-2xl border-2 border-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Ticket {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => removeTicket(index)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`tickets.${index}.Nombre` as const}
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
                        name={`tickets.${index}.Precio` as const}
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
                        name={`tickets.${index}.Descripción` as const}
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
                          const current = form.getValues(`tickets.${index}` as const);
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
                                const currentValue = form.getValues(`tickets.${index}` as const);
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
                      {(form.watch(`tickets.${index}.restaurantesIds` as const) ?? []).map((restId) => {
                        const nombre = restaurantes.find((r) => r.id === restId)?.nombre ?? restId;
                        const current = form.getValues(`tickets.${index}` as const);
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
                                      const currentValue = form.getValues(`tickets.${index}` as const);
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
                                  const currentValue = form.getValues(`tickets.${index}` as const);
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
                {focusedTicketIndex == null && !isAddingSingle && (
                  <Button type="button" variant="outline" onClick={addTicket} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir ticket
                  </Button>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar tickets'}
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
