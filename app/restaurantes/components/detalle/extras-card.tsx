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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import {
  RestauranteExtrasSchema,
  type RestauranteExtrasForm,
  type ExtraForm,
  type TipoIncremento,
  type TipoPrecio,
} from '@/lib/validators/restaurante-extras';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';
import { cn } from '@/lib/utils';

interface ExtrasCardProps {
  restauranteId: string;
  extras?: ExtraForm[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (next: ExtraForm[]) => void;
}

export function ExtrasCard({ restauranteId, extras, onUpdated, isOpen, onOpenChange }: ExtrasCardProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const list = useMemo(() => extras ?? [], [extras]);
  const visibleItems = list.slice(0, 2);
  const dialogOpen = isOpen ?? open;
  const setDialogOpen = onOpenChange ?? setOpen;

  const form = useForm<RestauranteExtrasForm>({
    resolver: zodResolver(RestauranteExtrasSchema) as Resolver<RestauranteExtrasForm>,
    defaultValues: { extras: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'extras',
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      extras: list.map((item) => ({
        nombre: item.nombre ?? '',
        descripcion: item.descripcion ?? '',
        precio: Number(item.precio ?? 0),
        tipoPrecio: (item.tipoPrecio as TipoPrecio) ?? 'fijo',
        tiempoMinimoHoras:
          item.tiempoMinimoHoras != null ? Number(item.tiempoMinimoHoras) : undefined,
        tipoIncremento:
          item.tipoPrecio === 'porHora'
            ? ((item.tipoIncremento as TipoIncremento) ?? 'porHora')
            : undefined,
        unidadesMinimas: item.unidadesMinimas != null ? Number(item.unidadesMinimas) : undefined,
      })),
    });
  }, [form, list, dialogOpen]);

  const handleSubmit = async (values: RestauranteExtrasForm) => {
    try {
      setIsSaving(true);
      await RestauranteDetalleService.updateExtras(restauranteId, values);
      onUpdated(values.extras);
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const addExtra = () => {
    append({ nombre: '', descripcion: '', precio: 0, tipoPrecio: 'fijo' });
  };

  const removeExtra = (index: number) => {
    remove(index);
  };

  const summaryLabel = (tipo: ExtraForm['tipoPrecio']) => {
    if (tipo === 'porHora') return 'Precio por hora';
    if (tipo === 'porUnidad') return 'Precio por unidad';
    return 'Precio fijo';
  };

  const incrementoLabel = (tipo?: ExtraForm['tipoIncremento']) => {
    if (tipo === 'porMediaHora') return 'Por media hora';
    return 'Por hora';
  };

  return (
    <Card id="extras" className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Extras</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {list.length}
        </span>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3 text-sm">
        <div className="space-y-2">
          {list.length === 0 ? (
            <p className="text-slate-500">Sin extras configurados.</p>
          ) : (
            visibleItems.map((extra, index) => (
              <div key={`${extra.nombre}-${index}`} className="rounded-xl border border-slate-100 px-3 py-2">
                <p className="font-semibold text-slate-900">{extra.nombre}</p>
                <p className="text-xs text-slate-500">{extra.descripcion}</p>
                <p className="text-xs text-slate-500">Precio: {extra.precio}</p>
                <p className="text-xs text-slate-500">Tipo: {summaryLabel(extra.tipoPrecio)}</p>
                {extra.tipoPrecio === 'porHora' && extra.tiempoMinimoHoras != null && (
                  <p className="text-xs text-slate-500">Tiempo mínimo: {extra.tiempoMinimoHoras}h</p>
                )}
                {extra.tipoPrecio === 'porHora' && extra.tipoIncremento && (
                  <p className="text-xs text-slate-500">Incremento: {incrementoLabel(extra.tipoIncremento)}</p>
                )}
                {extra.tipoPrecio === 'porUnidad' && extra.unidadesMinimas != null && (
                  <p className="text-xs text-slate-500">Unidades mínimas: {extra.unidadesMinimas}</p>
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
              Editar extras
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar extras</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-2xl border-2 border-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Extra {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => removeExtra(index)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`extras.${index}.nombre`}
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
                        name={`extras.${index}.precio`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio (€)</FormLabel>
                          <FormControl>
                              <NumberInput
                                step="0.01"
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
                    <div className="mt-3 grid gap-6">
                      <FormField
                        control={form.control}
                        name={`extras.${index}.descripcion`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea {...field} value={field.value ?? ''} rows={6} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`extras.${index}.tipoPrecio`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de precio</FormLabel>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={(value) => {
                                  const tipo = value as TipoPrecio;
                                  form.setValue(`extras.${index}.tipoPrecio`, tipo, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  });
                                  if (tipo === 'porHora') {
                                    form.setValue(`extras.${index}.tiempoMinimoHoras`, 1);
                                    form.setValue(`extras.${index}.tipoIncremento`, 'porHora');
                                    form.setValue(`extras.${index}.unidadesMinimas`, undefined);
                                  }
                                  if (tipo === 'porUnidad') {
                                    form.setValue(`extras.${index}.unidadesMinimas`, 1);
                                    form.setValue(`extras.${index}.tiempoMinimoHoras`, undefined);
                                    form.setValue(`extras.${index}.tipoIncremento`, undefined);
                                  }
                                  if (tipo === 'fijo') {
                                    form.setValue(`extras.${index}.tiempoMinimoHoras`, undefined);
                                    form.setValue(`extras.${index}.tipoIncremento`, undefined);
                                    form.setValue(`extras.${index}.unidadesMinimas`, undefined);
                                  }
                                }}
                                className="grid gap-4"
                              >
                                {([
                                  { value: 'fijo', label: 'Precio fijo', helper: 'Un precio único por servicio' },
                                  { value: 'porHora', label: 'Precio por hora', helper: 'Se cobra por cada hora' },
                                  { value: 'porUnidad', label: 'Precio por unidad', helper: 'Se cobra por unidad' },
                                ] as const).map((option) => (
                                  <label
                                    key={option.value}
                                    className={cn(
                                      'flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm transition',
                                      field.value === option.value ? 'border-[#7472fd] bg-[#f4f3ff]' : 'bg-white'
                                    )}
                                  >
                                    <RadioGroupItem value={option.value} className="mt-1" />
                                    <span className="space-y-1">
                                      <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                                      <span className="block text-xs leading-relaxed text-slate-500">{option.helper}</span>
                                    </span>
                                  </label>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {form.watch(`extras.${index}.tipoPrecio`) === 'porHora' && (
                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <FormField
                        control={form.control}
                        name={`extras.${index}.tiempoMinimoHoras`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiempo mínimo (horas)</FormLabel>
                            <FormControl>
                              <NumberInput
                                min={1}
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
                          name={`extras.${index}.tipoIncremento`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de incremento</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={field.value ?? 'porHora'}
                                  onValueChange={(value) =>
                                    form.setValue(`extras.${index}.tipoIncremento`, value as TipoIncremento, {
                                      shouldValidate: true,
                                    })
                                  }
                                  className="grid gap-3 sm:grid-cols-2"
                                >
                                  {([
                                    { value: 'porHora', label: 'Por hora' },
                                    { value: 'porMediaHora', label: 'Por media hora' },
                                  ] as const).map((option) => (
                                    <label
                                      key={option.value}
                                      className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm transition',
                                        field.value === option.value ? 'border-[#7472fd] bg-[#f4f3ff]' : 'bg-white'
                                      )}
                                    >
                                      <RadioGroupItem value={option.value} />
                                      <span className="font-semibold text-slate-900">{option.label}</span>
                                    </label>
                                  ))}
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    {form.watch(`extras.${index}.tipoPrecio`) === 'porUnidad' && (
                      <div className="mt-6">
                        <FormField
                        control={form.control}
                        name={`extras.${index}.unidadesMinimas`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidades mínimas</FormLabel>
                            <FormControl>
                              <NumberInput
                                min={1}
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
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addExtra} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Añadir extra
                </Button>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
                    {isSaving ? 'Guardando...' : 'Guardar extras'}
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
