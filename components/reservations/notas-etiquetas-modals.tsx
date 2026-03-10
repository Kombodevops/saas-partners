'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ReservaDetalleService, type NotaDetalle } from '@/lib/services/reserva-detalle.service';
import { NotaSchema, EtiquetaSchema } from '@/lib/validators/reserva-detalle';

type Props = {
  reservaId: string;
  notasRaw: unknown[];
  etiquetasRaw: unknown[];
  openNotas: boolean;
  openEtiquetas: boolean;
  onCloseNotas: () => void;
  onCloseEtiquetas: () => void;
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

export function NotasEtiquetasModals({
  reservaId,
  notasRaw,
  etiquetasRaw,
  openNotas,
  openEtiquetas,
  onCloseNotas,
  onCloseEtiquetas,
  onReload,
}: Props) {
  const notas = useMemo(() => notasRaw.map((n) => NotaSchema.parse(n)), [notasRaw]);
  const etiquetas = useMemo(() => etiquetasRaw.map((e) => EtiquetaSchema.parse(e)), [etiquetasRaw]);

  const [notaDraft, setNotaDraft] = useState('');
  const [etiquetaDraft, setEtiquetaDraft] = useState('');
  const [etiquetaColor, setEtiquetaColor] = useState(DEFAULT_COLOR);
  const [editableNotas, setEditableNotas] = useState<Array<NotaDetalle & { _id: string }>>([]);
  const [notePositions, setNotePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [overTrash, setOverTrash] = useState(false);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const sessionRef = useRef<number>(Date.now());
  const noteCounterRef = useRef<number>(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const trashRef = useRef<HTMLButtonElement | null>(null);
  const [boardSize, setBoardSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const [savingNotas, setSavingNotas] = useState(false);
  const [mounted, setMounted] = useState(false);
  const initializedPositionsRef = useRef(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root =
      (document.querySelector('[data-slot="sheet-content"]') as HTMLElement | null) ?? document.body;
    setPortalRoot(root);
  }, [mounted, openNotas, openEtiquetas]);

  useEffect(() => {
    if (!openNotas) return;
    sessionRef.current = Date.now();
    noteCounterRef.current = notas.length;
    const nextNotas = notas.map((nota, index) => ({
      ...nota,
      _id: `note-${index}-${sessionRef.current}`,
    }));
    const positions: Record<string, { x: number; y: number }> = {};
    nextNotas.forEach((nota, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const fallback = { x: 16 + col * 180, y: 16 + row * 150 };
      let x = fallback.x;
      let y = fallback.y;
      if (typeof nota.x === 'number' && typeof nota.y === 'number') {
        x = nota.x;
        y = nota.y;
      }
      positions[nota._id] = { x, y };
    });
    setEditableNotas(nextNotas);
    setDeletedIds(new Set());
    setNotePositions(positions);
    initializedPositionsRef.current = false;
  }, [openNotas, notas]);

  useEffect(() => {
    if (!openNotas || initializedPositionsRef.current) return;
    initializedPositionsRef.current = true;
  }, [openNotas]);

  const resizeNotas = () => {
    const board = boardRef.current;
    if (!board) return;
    const textareas = board.querySelectorAll<HTMLTextAreaElement>('textarea[data-note-textarea="true"]');
    textareas.forEach((textarea) => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  };

  useEffect(() => {
    if (!openNotas) return;
    const raf1 = requestAnimationFrame(() => {
      resizeNotas();
      requestAnimationFrame(resizeNotas);
    });
    return () => cancelAnimationFrame(raf1);
  }, [openNotas, editableNotas]);

  useEffect(() => {
    if (!openNotas) return;
    const board = boardRef.current;
    const scroller = scrollRef.current;
    if (!board || !scroller) return;

    const measure = () => {
      const scrollerRect = scroller.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      let maxRight = scrollerRect.width;
      let maxBottom = scrollerRect.height;
      const notes = board.querySelectorAll<HTMLElement>('[data-note-id]');
      notes.forEach((note) => {
        const rect = note.getBoundingClientRect();
        const right = rect.right - boardRect.left;
        const bottom = rect.bottom - boardRect.top;
        maxRight = Math.max(maxRight, right);
        maxBottom = Math.max(maxBottom, bottom);
      });
      const padding = 48;
      setBoardSize({
        width: Math.max(scrollerRect.width, maxRight + padding),
        height: Math.max(scrollerRect.height, maxBottom + padding),
      });
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [openNotas, editableNotas, notePositions]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const nextX = event.clientX - rect.left - dragging.offsetX;
      const nextY = event.clientY - rect.top - dragging.offsetY;
      const maxX = rect.width - dragging.width + 60;
      const maxY = rect.height - dragging.height + 60;
      const nextPos = {
        x: Math.max(-60, Math.min(nextX, maxX)),
        y: Math.max(-60, Math.min(nextY, maxY)),
      };
      setNotePositions((prev) => ({
        ...prev,
        [dragging.id]: nextPos,
      }));
      if (trashRef.current && boardRef.current) {
        const trashRect = trashRef.current.getBoundingClientRect();
        const boardRect = boardRef.current.getBoundingClientRect();
        const noteRect = {
          left: boardRect.left + nextPos.x,
          top: boardRect.top + nextPos.y,
          right: boardRect.left + nextPos.x + dragging.width,
          bottom: boardRect.top + nextPos.y + dragging.height,
        };
        const intersects =
          noteRect.right > trashRect.left &&
          noteRect.left < trashRect.right &&
          noteRect.bottom > trashRect.top &&
          noteRect.top < trashRect.bottom;
        setOverTrash(intersects);
      }
    };
    const handleUp = () => {
      if (dragging && trashRef.current) {
        const { x, y } = pointerRef.current;
        const trashRect = trashRef.current.getBoundingClientRect();
        const shouldDelete =
          x >= trashRect.left &&
          x <= trashRect.right &&
          y >= trashRect.top &&
          y <= trashRect.bottom;
        if (shouldDelete) {
          setDeletedIds((prev) => new Set(prev).add(dragging.id));
        }
      }
      setOverTrash(false);
      setDragging(null);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging]);

  const handleBoardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const target = event.target as HTMLElement;
    if (
      target.closest('[data-note-id]') ||
      target.closest('textarea') ||
      target.closest('button') ||
      target.closest('img')
    ) {
      return;
    }
    isPanningRef.current = true;
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
    };
    scrollRef.current.style.cursor = 'grabbing';
  };

  const handleBoardPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current || !isPanningRef.current) return;
    const dx = event.clientX - panStartRef.current.x;
    const dy = event.clientY - panStartRef.current.y;
    scrollRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    scrollRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleBoardPointerUp = () => {
    if (!scrollRef.current) return;
    isPanningRef.current = false;
    scrollRef.current.style.cursor = 'grab';
  };

  const handleSaveNotas = async () => {
    if (savingNotas) return;
    setSavingNotas(true);
    const updatedNotas = editableNotas
      .filter((nota) => !deletedIds.has(nota._id))
      .map((nota, index) => {
        const pos = notePositions[nota._id];
        const col = index % 4;
        const row = Math.floor(index / 4);
        const fallback = { x: 16 + col * 180, y: 16 + row * 150 };
        const x = pos?.x ?? (typeof nota.x === 'number' ? nota.x : fallback.x);
        const y = pos?.y ?? (typeof nota.y === 'number' ? nota.y : fallback.y);
        const { _id, ...rest } = nota;
        return { ...rest, x, y };
      });
    await ReservaDetalleService.updateNotasPositions(reservaId, updatedNotas);
    onReload();
    onCloseNotas();
    setSavingNotas(false);
  };

  const handleAddEtiqueta = async () => {
    if (!etiquetaDraft.trim()) return;
    await ReservaDetalleService.addEtiqueta(reservaId, { texto: etiquetaDraft.trim(), color: etiquetaColor });
    setEtiquetaDraft('');
    setEtiquetaColor(DEFAULT_COLOR);
    onReload();
    onCloseEtiquetas();
  };

  if (!mounted) return null;

  return (
    <>
      {openNotas &&
        createPortal(
          <div
            className={`z-50 flex items-center justify-center bg-black/50 ${
              portalRoot && portalRoot !== document.body ? 'absolute inset-0' : 'fixed inset-0'
            }`}
          >
            <div
              className="relative w-[88vw] h-[78vh] rounded-3xl bg-white shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-6 pt-6 pr-12">
                <h2 className="text-lg font-semibold text-slate-900">Editar notas</h2>
                <p className="text-sm text-slate-500">Organiza y mueve las notas internas de la reserva.</p>
              </div>
              <button
                type="button"
                className="absolute right-5 top-5 rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                onClick={handleSaveNotas}
                aria-label="Cerrar"
                disabled={savingNotas}
              >
                {savingNotas ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </button>
              <div className="grid h-[calc(78vh-96px)] gap-6 lg:grid-cols-[1fr] px-6 pb-6">
                <div className="relative h-full rounded-3xl border border-slate-200 p-0 shadow-[inset_0_0_0_3px_rgba(148,113,69,0.45)] overflow-hidden">
                  <div
                    ref={scrollRef}
                    className="h-full w-full overflow-auto rounded-2xl border border-amber-900/10 bg-[url('/notas/corcho7.jpg')] bg-cover bg-center pointer-events-auto"
                    style={{ backgroundAttachment: 'local', cursor: 'grab' }}
                    onPointerDown={handleBoardPointerDown}
                    onPointerMove={handleBoardPointerMove}
                    onPointerUp={handleBoardPointerUp}
                    onPointerLeave={handleBoardPointerUp}
                  >
                    <div
                      ref={boardRef}
                      className="relative pointer-events-auto"
                      style={{
                        width: boardSize.width ? `${boardSize.width}px` : '100%',
                        height: boardSize.height ? `${boardSize.height}px` : '100%',
                      }}
                    >
                      {editableNotas.map((nota, index) => {
                        if (deletedIds.has(nota._id)) return null;
                        const key = nota._id;
                        const position = notePositions[key] ?? { x: 16, y: 16 };
                        const palette = [
                          { backgroundColor: 'rgba(254, 240, 138, 0.85)', borderColor: 'rgba(250, 204, 21, 0.6)' },
                          { backgroundColor: 'rgba(216, 255, 248, 0.85)', borderColor: 'rgba(16, 185, 129, 0.5)' },
                          { backgroundColor: 'rgba(227, 233, 255, 0.85)', borderColor: 'rgba(99, 102, 241, 0.5)' },
                        ][index % 3];
                        const isDragging = dragging?.id === key;
                        const baseRotate = index % 2 === 0 ? -2 : 2;
                        let rotate = baseRotate;
                        let sway = 0;
                        if (isDragging && boardRef.current && dragging) {
                          const boardRect = boardRef.current.getBoundingClientRect();
                          const centerX = boardRect.left + position.x + dragging.width / 2;
                          const centerY = boardRect.top + position.y + dragging.height / 2;
                          const dx = pointerRef.current.x - centerX;
                          const dy = pointerRef.current.y - centerY;
                          rotate = baseRotate + Math.max(-8, Math.min(8, dx * 0.03));
                          sway = Math.max(-6, Math.min(6, dy * 0.03));
                        }
                        return (
                          <div key={`${key}-wrapper`} className="absolute inset-0 pointer-events-none">
                            {isDragging && dragging && (
                              <div
                                className="pointer-events-none absolute"
                                style={{
                                  left: position.x + 6,
                                  top: position.y + 10,
                                  width: dragging.width,
                                  height: dragging.height,
                                  borderRadius: 10,
                                  background: 'rgba(15, 23, 42, 0.25)',
                                  filter: 'blur(12px)',
                                  transform: `scale(${overTrash && dragging?.id === key ? 0.2 : 1.02})`,
                                  transformOrigin: overTrash && dragging?.id === key ? '50% 8%' : '50% 50%',
                                  zIndex: 0,
                                }}
                              />
                            )}
                            <div
                              data-note-id={key}
                              className={`pointer-events-auto absolute w-40 select-none p-3 shadow-[0_10px_25px_rgba(15,23,42,0.12)] ${
                                dragging?.id === key ? 'z-30' : 'z-10'
                              }`}
                              style={{
                                left: position.x,
                                top: position.y,
                                backgroundColor: palette.backgroundColor,
                                borderColor: palette.borderColor,
                                borderWidth: 0,
                                borderRadius: 0,
                                clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)',
                              transform: `rotate(${rotate}deg) translateY(${sway}px) ${
                                overTrash && dragging?.id === key ? 'scale(0.2)' : ''
                              }`,
                              transition: isDragging ? 'transform 50ms linear' : 'transform 180ms ease-out',
                              filter: isDragging ? 'drop-shadow(0 18px 20px rgba(15,23,42,0.25))' : undefined,
                              transformOrigin: overTrash && dragging?.id === key ? '50% 8%' : '50% 50%',
                            }}
                          >
                              <img
                                src="/notas/pngegg.png"
                                alt="Chincheta"
                                className="absolute left-1/2 top-1 -translate-x-1/2 cursor-grab"
                                style={{ width: 'auto', height: '18px' }}
                                draggable={false}
                                onPointerDown={(event) => {
                                  const rect = (event.currentTarget as HTMLImageElement).parentElement?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragging({
                                    id: key,
                                    offsetX: event.clientX - rect.left,
                                    offsetY: event.clientY - rect.top,
                                    width: rect.width,
                                    height: rect.height,
                                  });
                                }}
                              />
                              <textarea
                                data-note-textarea="true"
                                className="mt-4 w-full resize-none bg-transparent text-sm text-slate-700 outline-none whitespace-pre-wrap overflow-hidden"
                                value={nota.contenido}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setEditableNotas((prev) =>
                                    prev.map((item) => (item._id === nota._id ? { ...item, contenido: value } : item))
                                  );
                                }}
                                rows={1}
                                onInput={(event) => {
                                  const target = event.currentTarget;
                                  target.style.height = 'auto';
                                  target.style.height = `${target.scrollHeight}px`;
                                }}
                              />
                              <span
                                className="absolute right-0 top-0 h-4 w-4"
                                style={{
                                  backgroundColor: palette.borderColor,
                                  clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
                                  opacity: 0.65,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    ref={trashRef}
                    type="button"
                    className={`absolute right-8 top-8 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-white/80 text-rose-500 shadow-sm transition ${
                      overTrash ? 'scale-110 bg-rose-50 text-rose-600 shadow-lg' : ''
                    }`}
                  >
                    <Trash2 className={`h-5 w-5 transition ${overTrash ? 'scale-110' : ''}`} />
                  </button>
                  <button
                    type="button"
                    className="absolute right-8 bottom-8 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/70 text-lg font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white"
                    onClick={() => {
                      const id = `note-${noteCounterRef.current++}-${sessionRef.current}`;
                      if (notePositions[id]) return;
                      setEditableNotas((prev) => [
                        ...prev,
                        { contenido: '', autor: 'Partner', fechaCreacion: null, fechaActualizacion: null, x: null, y: null, _id: id },
                      ]);
                      setNotePositions((prev) => ({
                        ...prev,
                        [id]: { x: 24, y: 24 },
                      }));
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>,
          portalRoot ?? document.body
        )}

      {openEtiquetas &&
        createPortal(
          <div
            className={`z-50 flex items-center justify-center bg-black/50 ${
              portalRoot && portalRoot !== document.body ? 'absolute inset-0' : 'fixed inset-0'
            }`}
          >
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="absolute right-5 top-5 rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                onClick={onCloseEtiquetas}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-lg font-semibold text-slate-900">Añadir etiqueta</h2>
              <p className="text-sm text-slate-500">Organiza las reservas con etiquetas.</p>
              <div className="mt-4 space-y-3">
                <Input
                  value={etiquetaDraft}
                  onChange={(event) => setEtiquetaDraft(event.target.value)}
                  placeholder="Ej: VIP, Alergias..."
                />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((option) => {
                      const color = colorToRgba(option);
                      const isActive = option === etiquetaColor;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`h-7 w-7 rounded-full border ${isActive ? 'border-slate-900' : 'border-slate-200'}`}
                          style={{ backgroundColor: color.fill }}
                          onClick={() => setEtiquetaColor(option)}
                        />
                      );
                    })}
                  </div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border border-white/60 px-3 py-1 text-xs font-semibold shadow-sm text-slate-900"
                    style={{ backgroundColor: colorToSoft(etiquetaColor) }}
                  >
                    #{etiquetaDraft.trim() || 'Etiqueta'}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-[#7472fd] px-4 py-2 text-xs font-semibold text-white"
                    onClick={handleAddEtiqueta}
                  >
                    Guardar etiqueta
                  </button>
                </div>
              </div>
            </div>
          </div>,
          portalRoot ?? document.body
        )}
    </>
  );
}
