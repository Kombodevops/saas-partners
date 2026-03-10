'use client';

import { ChevronRight, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';

interface DatosFiscalesCardProps {
  restauranteId: string;
  data: RestauranteDetalleDoc;
  onNavigate: () => void;
}

const getValue = (value?: string) => (typeof value === 'string' ? value : '');

export function DatosFiscalesCard({ data, onNavigate }: DatosFiscalesCardProps) {
  const fiscales = data.datos_fiscales;
  const stripeAccountId = data.stripeAccountId;
  const hasStripe = Boolean(stripeAccountId);

  return (
    <Card
      id="datos-fiscales"
      className={`border-none shadow-sm ${
        hasStripe ? 'bg-white' : 'bg-amber-50 ring-1 ring-amber-200/70'
      }`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Datos fiscales y pagos</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4 text-sm text-slate-600">
        <div
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
            hasStripe ? 'border-slate-100 bg-slate-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          {hasStripe ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
          ) : (
            <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-500" />
          )}
          <div>
            <p className="font-semibold text-slate-900">
              {hasStripe ? 'Pagos configurados' : 'Faltan datos fiscales'}
            </p>
            <p className="text-xs text-slate-500">
              {hasStripe
                ? 'Stripe ya está configurado para este local.'
                : 'Completa los datos fiscales para habilitar cobros en el marketplace.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white/70 p-3 text-xs text-slate-600">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Resumen fiscal</p>
          <div className="mt-2 grid gap-1 text-xs text-slate-600">
            <p>
              <span className="font-semibold text-slate-800">Razón social:</span>{' '}
              {getValue(fiscales?.['Razón social']) || 'Pendiente'}
            </p>
            <p>
              <span className="font-semibold text-slate-800">CIF/NIF:</span> {getValue(fiscales?.NIF) || 'Pendiente'}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Dirección fiscal:</span>{' '}
              {getValue(fiscales?.['Dirección Fiscal']) || 'Pendiente'}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Ciudad:</span>{' '}
              {getValue(fiscales?.['Ciudad del negocio']) || 'Pendiente'}{' '}
              {getValue(fiscales?.['Código Postal del negocio'])
                ? `(${getValue(fiscales?.['Código Postal del negocio'])})`
                : ''}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Provincia:</span>{' '}
              {getValue(fiscales?.['Provincia del negocio']) || 'Pendiente'}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Teléfono negocio:</span>{' '}
              {getValue(fiscales?.['Teléfono del negocio']) || 'Pendiente'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-auto w-full hover:border-[#7472fd]/50 hover:bg-[#7472fd]/10 hover:text-[#3b3af2]"
          onClick={onNavigate}
        >
          {hasStripe ? 'Editar datos fiscales' : 'Añadir datos fiscales'}
        </Button>
      </CardContent>
    </Card>
  );
}
