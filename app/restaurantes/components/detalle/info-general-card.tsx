'use client';

import { ChevronRight, MapPin, Phone, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';
import {
  RestauranteGeneralSchema,
  type RestauranteGeneralForm,
  UBICACIONES,
  PRESUPUESTOS,
} from '@/lib/validators/restaurante-general';
import { slugify } from '@/lib/utils/slugify';
import { useEffect, useState } from 'react';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';

interface InfoGeneralCardProps {
  restauranteId: string;
  data: RestauranteDetalleDoc;
  presupuestoLabel: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (next: RestauranteDetalleDoc) => void;
}

export function InfoGeneralCard({
  restauranteId,
  data,
  presupuestoLabel,
  onUpdated,
  isOpen,
  onOpenChange,
}: InfoGeneralCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const dialogOpen = isOpen ?? open;
  const setDialogOpen = onOpenChange ?? setOpen;

  const form = useForm<RestauranteGeneralForm>({
    resolver: zodResolver(RestauranteGeneralSchema) as Resolver<RestauranteGeneralForm>,
    defaultValues: {
      nombre: '',
      descripcion: '',
      direccion: '',
      codigoPostal: '',
      ciudad: '',
      ubicacion: 'Barrio Salamanca',
      tipoCocina: '',
      telefono: '',
      presupuesto: '2',
      aforoMin: 0,
      aforoMax: 0,
    },
  });

  const presupuestoMeta = (value: RestauranteGeneralForm['presupuesto']) => {
    const displayValue = value === '1' ? '€' : value === '2' ? '€€' : '€€€';
    switch (displayValue) {
      case '€':
        return {
          title: '€ - Económico',
          description: 'Lugares muy baratos. Comidas sencillas o precios bajos.',
        };
      case '€€':
        return {
          title: '€€ - Moderado',
          description: 'Rango medio, la mayoría de restaurantes "normales".',
        };
      case '€€€':
        return {
          title: '€€€ - Premium',
          description: 'Restaurantes de gama alta o con precios elevados.',
        };
      default:
        return { title: displayValue, description: '' };
    }
  };

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      nombre: data['Nombre del restaurante'] ?? '',
      descripcion: data['Descripción'] ?? '',
      direccion: data['Dirección'] ?? '',
      codigoPostal: data['Código Postal'] ?? '',
      ciudad: data['Ciudad'] ?? '',
      ubicacion: (UBICACIONES.includes(data['Ubicación'] as (typeof UBICACIONES)[number])
        ? data['Ubicación']
        : 'Otras Zonas') as RestauranteGeneralForm['ubicacion'],
      tipoCocina: data['Tipo de cocina'] ?? '',
      telefono: data['Número de teléfono'] ?? '',
      presupuesto: (PRESUPUESTOS.includes(data.presupuesto as (typeof PRESUPUESTOS)[number])
        ? data.presupuesto
        : '2') as RestauranteGeneralForm['presupuesto'],
      aforoMin: Number(data.aforo.min ?? 0),
      aforoMax: Number(data.aforo.max ?? 0),
    });
  }, [data, form, dialogOpen]);

  const handleSubmit = async (values: RestauranteGeneralForm) => {
    try {
      setIsSaving(true);
      await RestauranteDetalleService.updateInformacionGeneral(restauranteId, values);
      onUpdated({
        ...data,
        'Nombre del restaurante': values.nombre,
        slug: slugify(values.nombre),
        'Descripción': values.descripcion,
        'Dirección': values.direccion,
        'Código Postal': values.codigoPostal,
        'Ciudad': values.ciudad,
        'Ubicación': values.ubicacion,
        'Tipo de cocina': values.tipoCocina,
        'Número de teléfono': values.telefono,
        presupuesto: values.presupuesto,
        aforo: {
          min: values.aforoMin,
          max: values.aforoMax,
        },
      });
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card id="info-general" className="border-none bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Informacion general</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4 text-sm text-slate-600">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <UtensilsCrossed className="mt-0.5 h-4 w-4 text-[#7472fd]" />
            <div>
              <p className="font-medium text-slate-900">Aforo</p>
              <p>
                {data.aforo.min} - {data.aforo.max} pax
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 h-4 w-4 text-[#7472fd]" />
            <div>
              <p className="font-medium text-slate-900">Telefono</p>
              <p>{data['Número de teléfono']}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <UtensilsCrossed className="mt-0.5 h-4 w-4 text-[#7472fd]" />
            <div>
              <p className="font-medium text-slate-900">Tipo de cocina</p>
              <p>{data['Tipo de cocina'] || 'Sin definir'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <UtensilsCrossed className="mt-0.5 h-4 w-4 text-[#7472fd]" />
            <div>
              <p className="font-medium text-slate-900">Presupuesto</p>
              <p>{presupuestoLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:col-span-2">
            <MapPin className="mt-0.5 h-4 w-4 text-[#7472fd]" />
            <div>
              <p className="font-medium text-slate-900">Direccion</p>
              <p>{data['Dirección']}</p>
              <p>
                {data['Código Postal']} {data['Ciudad']}
              </p>
              <p className="text-xs text-slate-400">Ubicacion: {data['Ubicación']}</p>
            </div>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-auto w-full hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
            >
              Editar informacion general
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar informacion general</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del restaurante</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripcion</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          className="min-h-[140px] w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Direccion</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="codigoPostal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codigo postal</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="ciudad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ubicacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ubicacion</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                          >
                            {UBICACIONES.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="tipoCocina"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de cocina</FormLabel>
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
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="presupuesto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Presupuesto</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                          >
                            <option value="1">€</option>
                            <option value="2">€€</option>
                            <option value="3">€€€</option>
                          </select>
                        </FormControl>
                        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <p className="font-semibold text-slate-800">
                            {presupuestoMeta(field.value).title}
                          </p>
                          <p className="text-slate-500">{presupuestoMeta(field.value).description}</p>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="aforoMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aforo min</FormLabel>
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
                      name="aforoMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aforo max</FormLabel>
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
                <div className="flex justify-end">
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
