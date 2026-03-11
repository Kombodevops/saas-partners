'use client';

import type { RestauranteResumen } from '@/lib/types/restaurante';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';
import { useRef, useState } from 'react';

type Props = {
  restaurantes: RestauranteResumen[];
  salas: NonNullable<RestauranteDetalleDoc['salas']>;
  restauranteId: string;
  salaId: string;
  salaFallback?: { aforoMinimo?: number; aforoMaximo?: number };
  disableSalaSelect?: boolean;
  onRestauranteChange: (value: string) => void;
  onSalaChange: (value: string) => void;
};

export function RestauranteSalaSection({
  restaurantes,
  salas,
  restauranteId,
  salaId,
  salaFallback,
  disableSalaSelect,
  onRestauranteChange,
  onSalaChange,
}: Props) {
  const [showSalaHint, setShowSalaHint] = useState(false);
  const salaHintTimeout = useRef<number | null>(null);
  const salasOptions = salaId && !salas.some((sala) => sala.nombre === salaId)
    ? [
        {
          nombre: salaId,
          aforoMinimo: salaFallback?.aforoMinimo,
          aforoMaximo: salaFallback?.aforoMaximo,
        },
        ...salas,
      ]
    : salas;
  const handleSalaHint = () => {
    if (restauranteId) return;
    setShowSalaHint(true);
    if (salaHintTimeout.current) {
      window.clearTimeout(salaHintTimeout.current);
    }
    salaHintTimeout.current = window.setTimeout(() => {
      setShowSalaHint(false);
      salaHintTimeout.current = null;
    }, 2000);
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="text-[12px] font-medium text-slate-700">Restaurante</label>
        <select
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px]"
          value={restauranteId}
          onChange={(event) => onRestauranteChange(event.target.value)}
        >
          <option value="">Selecciona un restaurante</option>
          {restaurantes.map((rest) => (
            <option key={rest.id} value={rest.id}>
              {rest.nombreRestaurante}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[12px] font-medium text-slate-700">Espacio</label>
        <div className="relative">
          <select
            className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] ${
              disableSalaSelect ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'
            }`}
            value={salaId}
            onChange={(event) => onSalaChange(event.target.value)}
            disabled={!restauranteId || disableSalaSelect}
          >
            <option value="">Selecciona un espacio</option>
            {salasOptions.map((sala) => (
              <option key={sala.nombre} value={sala.nombre}>
                {sala.nombre} · {sala.aforoMinimo ?? 0} - {sala.aforoMaximo ?? 0} pax
              </option>
            ))}
          </select>
          {!restauranteId && (
            <button
              type="button"
              className="absolute inset-0 cursor-not-allowed"
              aria-label="Selecciona un restaurante"
              onClick={handleSalaHint}
            />
          )}
          {showSalaHint && !restauranteId && (
            <div className="absolute -top-8 left-0 z-10 rounded-full bg-slate-900 px-3 py-1 text-[11px] text-white shadow">
              Selecciona un restaurante
            </div>
          )}
        </div>
        {!restauranteId && (
          <p className="mt-2 text-[11px] text-slate-500">Debes seleccionar un restaurante para elegir un espacio.</p>
        )}
        {salas.length === 0 && restauranteId && (
          <p className="mt-2 text-[11px] text-slate-500">Este restaurante no tiene espacios configurados.</p>
        )}
      </div>
    </div>
  );
}
