'use client';

import { Input } from '@/components/ui/input';

export type TicketItem = {
  Nombre?: string;
  Descripción?: string;
  Precio?: number;
  quantity?: number;
  disabled?: boolean;
};

type Props = {
  tickets: TicketItem[];
  onChange: (next: TicketItem[]) => void;
};

const toText = (value: unknown) => (value == null ? '' : String(value));

export function TicketsEditor({ tickets, onChange }: Props) {
  if (!tickets.length) {
    return <p className="text-xs text-slate-500">No hay tickets disponibles para este restaurante.</p>;
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket, index) => (
        <div
          key={`ticket-${index}`}
          className={`rounded-xl border p-4 shadow-sm ${
            ticket.disabled ? 'border-slate-100 bg-slate-50' : 'border-slate-100 bg-white'
          }`}
        >
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
            <div className={`flex-1 ${ticket.disabled ? 'text-slate-400' : ''}`}>
              <p className={`text-sm font-semibold ${ticket.disabled ? 'text-slate-500' : 'text-slate-900'}`}>
                {toText(ticket.Nombre || 'Ticket')}
              </p>
              {ticket.Descripción ? (
                <p className="mt-1 text-xs text-slate-500">{toText(ticket.Descripción)}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div>
                <label className="text-xs font-medium text-slate-600">Precio</label>
                <Input
                  type="number"
                  className="mt-2 w-24"
                  value={toText(ticket.Precio ?? '')}
                  disabled={Boolean(ticket.disabled)}
                  onChange={(event) => {
                    const next = [...tickets];
                    next[index] = { ...next[index], Precio: Number(event.target.value) };
                    onChange(next);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Cantidad</label>
                <Input
                  type="number"
                  className="mt-2 w-24"
                  min={0}
                  value={toText(ticket.quantity ?? '')}
                  disabled={Boolean(ticket.disabled)}
                  onChange={(event) => {
                    const next = [...tickets];
                    const value = Number(event.target.value);
                    next[index] = { ...next[index], quantity: Number.isFinite(value) ? Math.max(0, value) : 0 };
                    onChange(next);
                  }}
                />
              </div>
              <button
                type="button"
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  ticket.disabled
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    : 'border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100'
                }`}
                onClick={() => {
                  const next = [...tickets];
                  next[index] = { ...next[index], disabled: !next[index].disabled };
                  onChange(next);
                }}
              >
                {ticket.disabled ? 'Añadir' : 'Quitar'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
