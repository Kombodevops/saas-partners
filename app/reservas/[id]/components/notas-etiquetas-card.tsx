'use client';

import { useMemo, useState } from 'react';
import { Plus, StickyNote, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReservaDetalleService } from '@/lib/services/reserva-detalle.service';
import { NotaSchema, EtiquetaSchema } from '@/lib/validators/reserva-detalle';
import { NotasEtiquetasModals } from '@/components/reservations/notas-etiquetas-modals';

type Props = {
  reservaId: string;
  notasRaw: unknown[];
  etiquetasRaw: unknown[];
  onReload: () => void;
};

const DEFAULT_COLOR = 0xff7472fd;
const COLOR_OPTIONS = [
  0xff7472fd,
  0xffffe100,
  0xff10b981,
  0xfff97316,
  0xfff43f5e,
  0xff14b8a6,
  0xff94a3b8,
];

const colorToRgba = (color: number) => {
  const a = (color >> 24) & 255;
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const alpha = Math.max(0.3, Math.min(1, a / 255));
  return {
    fill: `rgba(${r}, ${g}, ${b}, ${alpha})`,
    text: `rgb(${r}, ${g}, ${b})`,
  };
};

const colorToSoft = (color: number) => {
  const a = (color >> 24) & 255;
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const alpha = Math.max(0.16, Math.min(0.22, a / 255));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function NotasEtiquetasCard({ reservaId, notasRaw, etiquetasRaw, onReload }: Props) {
  const notas = useMemo(() => notasRaw.map((n) => NotaSchema.parse(n)), [notasRaw]);
  const etiquetas = useMemo(() => etiquetasRaw.map((e) => EtiquetaSchema.parse(e)), [etiquetasRaw]);

  const [openNota, setOpenNota] = useState(false);
  const [openEtiqueta, setOpenEtiqueta] = useState(false);
  const [editEtiquetaIndex, setEditEtiquetaIndex] = useState<number | null>(null);
  const [editEtiquetaText, setEditEtiquetaText] = useState('');

  const handleDeleteEtiqueta = async (index: number) => {
    await ReservaDetalleService.deleteEtiqueta(reservaId, index);
    onReload();
  };

  return (
    <Card className="border-none bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notas</p>
          <CardTitle className="text-base text-slate-900">Notas y etiquetas</CardTitle>
          <p className="text-sm text-slate-500">Organiza la reserva con notas internas y etiquetas rápidas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" />
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <StickyNote className="h-4 w-4" />
            Notas
          </div>
          <div className="mt-3 space-y-3">
            {notas.length === 0 && <p className="text-sm text-slate-500">Sin notas.</p>}
            {notas.slice(0, 2).map((nota, index) => {
              const colorIndex = index % 3;
              const noteStyles = [
                {
                  backgroundColor: 'rgba(254, 240, 138, 0.6)',
                  borderColor: 'rgba(250, 204, 21, 0.4)',
                  foldColor: 'rgba(250, 204, 21, 0.55)',
                },
                {
                  backgroundColor: 'rgba(216, 255, 248, 0.7)',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                  foldColor: 'rgba(16, 185, 129, 0.45)',
                },
                {
                  backgroundColor: 'rgba(227, 233, 255, 0.7)',
                  borderColor: 'rgba(99, 102, 241, 0.35)',
                  foldColor: 'rgba(99, 102, 241, 0.45)',
                },
              ][colorIndex];

              return (
                <div
                  key={`${nota.contenido}-${index}`}
                  className="relative p-4 shadow-[0_6px_18px_rgba(15,23,42,0.08)]"
                  style={{
                    borderRadius: 0,
                    backgroundColor: noteStyles.backgroundColor,
                    transform: `rotate(${index % 2 === 0 ? '-1.4deg' : '1.4deg'})`,
                    clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-700 line-clamp-3">{nota.contenido}</p>
                  </div>
                  <span
                    className="absolute right-0 top-0 h-4 w-4"
                    style={{
                      backgroundColor: noteStyles.foldColor,
                      clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
                      opacity: 0.6,
                    }}
                  />
                </div>
              );
            })}
            <button
              type="button"
              className="text-xs font-semibold text-[#7472fd]"
              onClick={() => setOpenNota(true)}
            >
              Ver notas ({notas.length})
            </button>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Tag className="h-4 w-4" />
            Etiquetas
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {etiquetas.length === 0 && <p className="text-sm text-slate-500">Sin etiquetas.</p>}
            {etiquetas.map((etiqueta, index) => {
              const currentColor = etiqueta.color ?? DEFAULT_COLOR;
              const color = colorToRgba(currentColor);
              const isEditing = editEtiquetaIndex === index;
              const nextColorIndex = (COLOR_OPTIONS.indexOf(currentColor) + 1) % COLOR_OPTIONS.length;
              const nextColor = COLOR_OPTIONS[nextColorIndex] ?? DEFAULT_COLOR;
              return (
                <div
                  key={`${etiqueta.texto}-${index}`}
                  className="group flex items-center gap-2 rounded-full border border-white/60 px-3 py-1 text-xs font-semibold shadow-sm"
                  style={{ backgroundColor: colorToSoft(currentColor), color: '#0f172a' }}
                >
                  {isEditing ? (
                    <input
                      className="w-28 rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#7472fd]"
                      value={editEtiquetaText}
                      onChange={(event) => setEditEtiquetaText(event.target.value)}
                      onBlur={async () => {
                        const nextText = editEtiquetaText.trim();
                        if (nextText && nextText !== (etiqueta.texto || etiqueta.nombre)) {
                          await ReservaDetalleService.updateEtiquetaTexto(reservaId, index, nextText);
                          onReload();
                        }
                        setEditEtiquetaIndex(null);
                      }}
                      onKeyDown={async (event) => {
                        if (event.key === 'Enter') {
                          const nextText = editEtiquetaText.trim();
                          if (nextText && nextText !== (etiqueta.texto || etiqueta.nombre)) {
                            await ReservaDetalleService.updateEtiquetaTexto(reservaId, index, nextText);
                            onReload();
                          }
                          setEditEtiquetaIndex(null);
                        }
                        if (event.key === 'Escape') {
                          setEditEtiquetaIndex(null);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-slate-900"
                      onClick={() => {
                        setEditEtiquetaIndex(index);
                        setEditEtiquetaText(etiqueta.texto || etiqueta.nombre || '');
                      }}
                    >
                      #{etiqueta.texto || etiqueta.nombre}
                    </button>
                  )}
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      className="h-3.5 w-3.5 rounded-full border border-white/70"
                      style={{ backgroundColor: color.fill }}
                      onClick={async () => {
                        await ReservaDetalleService.updateEtiquetaColor(reservaId, index, nextColor);
                        onReload();
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-full border border-rose-200 bg-white/70 p-0.5 text-rose-500 hover:bg-rose-50"
                      onClick={() => handleDeleteEtiqueta(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#7472fd] hover:text-[#7472fd]"
              onClick={() => setOpenEtiqueta(true)}
              aria-label="Añadir etiqueta"
              title="Añadir etiqueta"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>

      <NotasEtiquetasModals
        reservaId={reservaId}
        notasRaw={notasRaw}
        etiquetasRaw={etiquetasRaw}
        openNotas={openNota}
        openEtiquetas={openEtiqueta}
        onCloseNotas={() => setOpenNota(false)}
        onCloseEtiquetas={() => setOpenEtiqueta(false)}
        onReload={onReload}
      />
    </Card>
  );
}
