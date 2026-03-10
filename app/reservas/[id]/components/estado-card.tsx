'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReservaDetalleService } from '@/lib/services/reserva-detalle.service';

type Props = {
  reservaId: string;
  estado: string;
  pagado: boolean;
  tipoCompra?: string;
  onUpdated: () => void;
};

const ESTADOS = ['pendiente', 'pendienteGestion', 'aceptado', 'completado', 'expirado', 'fallado'] as const;
const TIPOS_COMPRA = ['entradas', 'plan'] as const;

export function EstadoCard({ reservaId, estado, pagado, tipoCompra, onUpdated }: Props) {
  const [estadoDraft, setEstadoDraft] = useState(estado || 'pendiente');
  const [pagadoDraft, setPagadoDraft] = useState(pagado);
  const [tipoCompraDraft, setTipoCompraDraft] = useState(tipoCompra || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await ReservaDetalleService.updateEstado({
        reservaId,
        estado: estadoDraft,
        pagado: estadoDraft === 'aceptado' ? pagadoDraft : undefined,
        tipoCompra: estadoDraft === 'aceptado' && pagadoDraft ? tipoCompraDraft || null : null,
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-none bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">Estado de la reserva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={estadoDraft}
            onChange={(event) => setEstadoDraft(event.target.value)}
          >
            {ESTADOS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {estadoDraft === 'aceptado' && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <input
                id="pagado"
                type="checkbox"
                checked={pagadoDraft}
                onChange={(event) => setPagadoDraft(event.target.checked)}
              />
              <label htmlFor="pagado" className="text-sm text-slate-700">
                Pagado
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo de compra</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={tipoCompraDraft}
                onChange={(event) => setTipoCompraDraft(event.target.value)}
                disabled={!pagadoDraft}
              >
                <option value="">Sin definir</option>
                {TIPOS_COMPRA.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <Button className="bg-[#7472fd] text-white" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar estado'}
        </Button>
      </CardContent>
    </Card>
  );
}
