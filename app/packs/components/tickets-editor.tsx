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
  const [isSaving, setIsSaving] = useState(false);
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
    const safeTickets = (tickets ?? []).map((ticket) => ({
      Nombre: ticket.Nombre ?? '',
      Descripción: ticket['Descripción'] ?? '',
      Precio: Number(ticket.Precio ?? 0),
      restaurantesIds: ticket.restaurantesIds ?? [],
      disponibilidadPorRestaurante: ticket.disponibilidadPorRestaurante ?? [],
    }));
    form.reset({ tickets: safeTickets });
  }, [form, tickets, open]);

  const addTicket = () => {
    append({
      Nombre: '',
      Descripción: '',
      Precio: 0,
      restaurantesIds: [],
      disponibilidadPorRestaurante: [],
    });
  };

  const removeTicket = (index: number) => {
    remove(index);
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

  return (
    <Card id="tickets" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">Tickets</CardTitle>
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
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {tickets.length}
          </span>
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {tickets.length === 0 ? (
          <p className="text-slate-500">Sin tickets configurados.</p>
        ) : (
          visible.map((ticket, index) => {
            const included = restauranteId ? ticket.restaurantesIds?.includes(restauranteId) : true;
            return (
              <div key={`${ticket.Nombre}-${index}`} className="rounded-xl border border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  {included ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500" />
                  )}
                  <p className="font-semibold text-slate-900">{ticket.Nombre}</p>
                </div>
              <p className="text-xs text-slate-500">{ticket['Descripción']}</p>
              <p className="text-xs text-slate-500">Precio: {ticket.Precio}</p>
              {ticket.restaurantesIds && ticket.restaurantesIds.length > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">
                    Restaurantes en los que está disponible el ticket:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ticket.restaurantesIds.map((id) => {
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
              {ticket.disponibilidadPorRestaurante && ticket.disponibilidadPorRestaurante.length > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">
                    Días disponibles del ticket por restaurante:
                  </p>
                  <div className="mt-1 space-y-1">
                    {ticket.disponibilidadPorRestaurante.map((disp) => {
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar tickets</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field, index) => (
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
                              <Input type="number" {...field} value={field.value ?? 0} />
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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addTicket} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Añadir ticket
                </Button>
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
