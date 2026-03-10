'use client';

import { AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Props = {
  fecha: string;
  fechaLimite: string;
  horaInicio: string;
  horaFin: string;
  aforoMin: number;
  aforoMax: number;
  steps?: boolean[];
  isComplete?: boolean;
  warning?: string | null;
  closingTime?: string | null;
  onUseClosingTime?: () => void;
  onChange: (field: string, value: string | number) => void;
};

export function FechaSection({
  fecha,
  fechaLimite,
  horaInicio,
  horaFin,
  aforoMin,
  aforoMax,
  steps,
  isComplete,
  warning,
  closingTime,
  onUseClosingTime,
  onChange,
}: Props) {
  const today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  return (
    <>
      <CardHeader>
        {steps && steps.length > 0 && (
          <div className="mb-3 flex w-full justify-center">
            <div className="flex items-center gap-2">
              {steps.map((done, index) => {
                const isLast = index === steps.length - 1;
                return (
                  <div key={`fecha-step-${index}`} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    {!isLast && (
                      <span
                        className="h-0.5 w-10 rounded-full"
                        style={{
                          background: done
                            ? steps[index + 1]
                              ? '#22c55e'
                              : 'linear-gradient(to right, #22c55e 50%, #e2e8f0 50%)'
                            : '#e2e8f0',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-slate-400">
              <CalendarClock className="h-4 w-4" />
              Fecha
            </div>
            <CardTitle className="text-[14px]">Fecha y capacidad</CardTitle>
            <CardDescription>Define la fecha y el aforo para la reserva.</CardDescription>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 text-[12px] font-medium">
            {isComplete ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Paso listo</span>
              </div>
            ) : warning ? (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>{warning}</span>
              </div>
            ) : (
              <span className="text-transparent">.</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-[12px] font-medium text-slate-700">Fecha del plan</label>
          <Input
            type="date"
            value={fecha}
            min={today}
            className="h-9 text-[12px]"
            inputMode="none"
            onKeyDown={(e) => {
              if (e.key !== "Tab") e.preventDefault();
            }}
            onPaste={(e) => e.preventDefault()}
            onChange={(event) => onChange('fecha', event.target.value)}
          />
        </div>
        <div>
          <label className="text-[12px] font-medium text-slate-700">Fecha límite de pago</label>
          <Input
            type="date"
            value={fechaLimite}
            min={today}
            max={fecha || undefined}
            disabled={!fecha}
            className="h-9 text-[12px]"
            inputMode="none"
            onKeyDown={(e) => {
              if (e.key !== "Tab") e.preventDefault();
            }}
            onPaste={(e) => e.preventDefault()}
            onChange={(event) => onChange('fechaLimite', event.target.value)}
          />
        </div>
        <div>
          <label className="text-[12px] font-medium text-slate-700">Hora inicio</label>
          <Input
            type="time"
            value={horaInicio}
            className="h-9 text-[12px]"
            onChange={(event) => onChange('horaInicio', event.target.value)}
          />
        </div>
        <div>
          <label className="text-[12px] font-medium text-slate-700">Hora fin</label>
          <Input
            type="time"
            value={horaFin}
            className="h-9 text-[12px]"
            onChange={(event) => onChange('horaFin', event.target.value)}
          />
          {closingTime && onUseClosingTime && (
            <button
              type="button"
              className="mt-1 text-[11px] font-medium text-slate-500 hover:text-[#7472fd]"
              onClick={onUseClosingTime}
            >
              ¿Usar hora de cierre del local? <span className="font-semibold">{closingTime}</span>
            </button>
          )}
        </div>
        <div>
          <label className="text-[12px] font-medium text-slate-700">Aforo mínimo</label>
          <Input
            type="number"
            value={aforoMin}
            className="h-9 text-[12px]"
            onChange={(event) => onChange('aforoMin', Number(event.target.value))}
          />
        </div>
        <div>
          <label className="text-[12px] font-medium text-slate-700">Aforo máximo</label>
          <Input
            type="number"
            value={aforoMax}
            className="h-9 text-[12px]"
            onChange={(event) => onChange('aforoMax', Number(event.target.value))}
          />
        </div>
      </CardContent>
    </>
  );
}
