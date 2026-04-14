'use client';

import { NumberInput } from '@/components/ui/number-input';

type Intervalo = Record<string, unknown>;

type Props = {
  intervalos: Intervalo[];
  selected: Intervalo | null;
  onSelect: (intervalo: Intervalo | null) => void;
};

const label = (intervalo: Intervalo) => {
  const min = String(intervalo.duracionMin ?? '');
  const precio = String(intervalo.precio ?? 0);
  return `${min} (€${precio})`;
};

const parseToMinutes = (value: string) => {
  const text = value.toLowerCase();
  const hoursMatch = text.match(/(\d+)\s*h/);
  const minsMatch = text.match(/(\d+)\s*min/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const mins = minsMatch ? Number(minsMatch[1]) : 0;
  return hours * 60 + mins;
};

const toLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
  if (hours > 0) return `${hours} horas`;
  return `${mins}min`;
};

const buildSteps = (minLabel: string, maxLabel: string) => {
  const min = parseToMinutes(minLabel);
  const max = parseToMinutes(maxLabel);
  if (!min || !max || max < min) return [] as string[];
  const values: string[] = [];
  for (let current = min; current <= max; current += 15) {
    values.push(toLabel(current));
  }
  return values;
};

const GLOBAL_MIN = '15min';
const GLOBAL_MAX = '24h';

export function BarraLibreIntervalo({ intervalos, selected, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Duración de barra libre</p>
      <p className="mt-1 text-xs text-slate-500">
        Selecciona la duración y ajusta el precio para esta reserva.
      </p>
      <select
        className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        value={String(selected?.duracionMin ?? '')}
        onChange={(event) => {
          const next = intervalos.find((item) => String(item.duracionMin) === event.target.value) ?? null;
          if (next) {
            const withPrice = { ...next, precio: next.precio ?? selected?.precio } as Intervalo;
            onSelect(withPrice);
          } else {
            onSelect(null);
          }
        }}
      >
        <option value="">Selecciona una duración</option>
        {intervalos.map((intervalo) => (
          <option key={String(intervalo.duracionMin)} value={String(intervalo.duracionMin)}>
            {label(intervalo)}
          </option>
        ))}
      </select>

      {selected && (
        <div className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Duración</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={String(selected.duracionMin ?? '')}
                onChange={(event) => {
                  const next = { ...selected, duracionMin: event.target.value } as Intervalo;
                  onSelect(next);
                }}
              >
                {buildSteps(GLOBAL_MIN, GLOBAL_MAX).map((value) => (
                  <option key={`min-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Precio</label>
              <NumberInput
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={typeof selected.precio === 'number' ? selected.precio : Number(selected.precio ?? 0)}
                onChangeValue={(value) => {
                  const next = { ...selected, precio: value } as Intervalo;
                  onSelect(next);
                }}
              />
              {selected.precio == null && intervalos.length > 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Precio sugerido: €{String(intervalos[0]?.precio ?? '')}
                </p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
