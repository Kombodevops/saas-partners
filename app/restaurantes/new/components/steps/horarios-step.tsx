import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RestauranteNewForm } from '@/lib/validators/restaurante-new';

export function HorariosStep() {
  const form = useFormContext<RestauranteNewForm>();
  const horariosRaw = useWatch({ control: form.control, name: 'horarios' });
  const horarios =
    (horariosRaw as Record<
      string,
      { cerrado?: boolean; intervalos?: Array<{ horaInicio: string; horaFin: string }> }
    >) ?? {};
  const setValue = form.setValue as (
    name: string,
    value: unknown,
    options?: { shouldDirty?: boolean }
  ) => void;

  const dias = useMemo(() => Object.keys(horarios), [horarios]);

  return (
    <div className="space-y-4">
      {dias.map((dia) => {
        const info = horarios?.[dia];
        return (
          <div key={dia} className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">{dia}</p>
              <label className="text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={info?.cerrado ?? false}
                  onChange={(event) =>
                    setValue(`horarios.${dia}.cerrado`, event.target.checked, { shouldDirty: true })
                  }
                />{' '}
                Cerrado
              </label>
            </div>
            {!info?.cerrado && (
              <div className="mt-3 space-y-2">
                {(info?.intervalos ?? []).map((intervalo, index) => (
                  <div key={`${dia}-${index}`} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={intervalo.horaInicio}
                      onChange={(event) => {
                        const next = [...(info?.intervalos ?? [])];
                        next[index] = { ...next[index], horaInicio: event.target.value };
                        setValue(`horarios.${dia}.intervalos`, next, { shouldDirty: true });
                      }}
                    />
                    <Input
                      type="time"
                      value={intervalo.horaFin}
                      onChange={(event) => {
                        const next = [...(info?.intervalos ?? [])];
                        next[index] = { ...next[index], horaFin: event.target.value };
                        setValue(`horarios.${dia}.intervalos`, next, { shouldDirty: true });
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        const next = (info?.intervalos ?? []).filter((_, idx) => idx !== index);
                        setValue(`horarios.${dia}.intervalos`, next, { shouldDirty: true });
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const next = [...(info?.intervalos ?? []), { horaInicio: '10:00', horaFin: '14:00' }];
                    setValue(`horarios.${dia}.intervalos`, next, { shouldDirty: true });
                  }}
                >
                  Añadir intervalo
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
