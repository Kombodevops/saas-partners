'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  DIAS_SEMANA,
  RestauranteHorarioSchema,
  type RestauranteHorarioForm,
} from '@/lib/validators/restaurante-horario';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';

interface RestauranteHorarioEditorProps {
  restauranteId: string;
  initialHorario: RestauranteHorarioForm;
  onChange: (nextHorario: RestauranteHorarioForm) => void;
}

export function RestauranteHorarioEditor({
  restauranteId,
  initialHorario,
  onChange,
}: RestauranteHorarioEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RestauranteHorarioForm>({
    resolver: zodResolver(RestauranteHorarioSchema),
    defaultValues: initialHorario,
  });

  const dias = useMemo(() => DIAS_SEMANA, []);

  const addIntervalo = (dia: (typeof DIAS_SEMANA)[number]) => {
    const current = form.getValues(`dias.${dia}.intervalos`);
    form.setValue(`dias.${dia}.intervalos`, [...current, { horaInicio: '09:00', horaFin: '18:00' }]);
  };

  const removeIntervalo = (dia: (typeof DIAS_SEMANA)[number], index: number) => {
    const current = form.getValues(`dias.${dia}.intervalos`);
    form.setValue(
      `dias.${dia}.intervalos`,
      current.filter((_, idx) => idx !== index)
    );
  };

  const onSubmit = async (values: RestauranteHorarioForm) => {
    try {
      setIsSaving(true);
      setError(null);
      await RestauranteDetalleService.updateHorario(restauranteId, values);
      onChange(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el horario');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {dias.map((dia) => {
          const intervalos = form.watch(`dias.${dia}.intervalos`);
          const cerrado = form.watch(`dias.${dia}.cerrado`);

          return (
            <div key={dia} className="rounded-2xl border-2 border-slate-800 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{dia}</p>
                  <p className="text-xs text-slate-500">Configura intervalos o marca cerrado.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={cerrado}
                    onChange={(event) =>
                      form.setValue(`dias.${dia}.cerrado`, event.target.checked)
                    }
                  />
                  Cerrado
                </label>
              </div>
              {!cerrado && (
                <div className="mt-4 space-y-3">
                  {intervalos.length === 0 ? (
                    <p className="text-xs text-slate-400">Sin intervalos.</p>
                  ) : (
                    intervalos.map((_, index) => (
                      <div key={`${dia}-${index}`} className="flex flex-wrap items-end gap-3">
                        <FormField
                          control={form.control}
                          name={`dias.${dia}.intervalos.${index}.horaInicio`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Hora inicio</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`dias.${dia}.intervalos.${index}.horaFin`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Hora fin</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => removeIntervalo(dia, index)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    ))
                  )}
                  <Button type="button" variant="outline" onClick={() => addIntervalo(dia)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Anadir intervalo
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSaving} className="bg-[#7472fd] text-white">
            {isSaving ? 'Guardando...' : 'Guardar horario'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
