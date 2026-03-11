'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { ReservaActionsService } from '@/lib/services/reserva-actions.service';
import type { ReservaItem } from '@/lib/services/reservas.service';

type Props = {
  reserva: ReservaItem;
  onCompleted?: () => void;
  size?: 'sm' | 'lg';
};

type QuestionType = 'string' | 'choice' | 'boolean';

type QuestionItem = {
  id: string;
  question: string;
  question_type: QuestionType;
  required: boolean;
  options?: string[];
  optionDraft?: string;
};

export function PendienteActionsDialog({ reserva, onCompleted, size = 'sm' }: Props) {
  const [openAccept, setOpenAccept] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [fechaLimite, setFechaLimite] = useState('');
  const [solicitarAnticipo, setSolicitarAnticipo] = useState(false);
  const [anticipoDescripcion, setAnticipoDescripcion] = useState('');
  const [anticipoPrecio, setAnticipoPrecio] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const reservaNombre = useMemo(
    () => reserva.kombo?.['Nombre del kombo'] || reserva.pack?.['Nombre del pack'] || 'Reserva',
    [reserva]
  );
  const fechaPlan = useMemo(() => reserva.kombo?.Fecha ?? '', [reserva]);
  const formattedFechaPlan = useMemo(() => {
    if (!fechaPlan) return '';
    const parsed = new Date(fechaPlan);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const match = fechaPlan.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return fechaPlan;
  }, [fechaPlan]);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isFlexible = useMemo(() => {
    const categoria = String(reserva.pack?.Categoria ?? '').toLowerCase();
    const packId = String((reserva as Record<string, unknown>)?.packId ?? '');
    const packInternalId = String((reserva.pack as Record<string, unknown> | null)?.id ?? '');
    return categoria === 'flexible' || packId === 'sin_compra_anticipada' || packInternalId === 'sin_compra_anticipada';
  }, [reserva]);
  const hasAnticipo = useMemo(() => {
    const precio = (reserva as Record<string, unknown>)?.precio as Record<string, unknown> | undefined;
    const anticipo = precio?.Anticipo as Record<string, unknown> | undefined;
    const precioValue = anticipo?.Precio ?? anticipo?.price;
    return Boolean(precioValue != null && Number(precioValue) > 0);
  }, [reserva]);
  const requiresFlexibleChoice = isFlexible && !hasAnticipo;
  const fechaLabel = requiresFlexibleChoice
    ? solicitarAnticipo
      ? 'Fecha límite de pago'
      : 'Fecha límite para indicar asistentes'
    : 'Fecha límite de pago';

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length}`,
        question: '',
        question_type: 'string',
        required: false,
        options: [],
        optionDraft: '',
      },
    ]);
  };

  const updateQuestion = (id: string, patch: Partial<QuestionItem>) => {
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addOption = (id: string) => {
    setQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const value = (item.optionDraft ?? '').trim();
        if (!value || (item.options ?? []).includes(value)) return item;
        return { ...item, options: [...(item.options ?? []), value], optionDraft: '' };
      })
    );
  };

  const removeOption = (id: string, index: number) => {
    setQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, options: (item.options ?? []).filter((_, i) => i !== index) };
      })
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((item) => item.id !== id));
  };

  const onAceptar = async () => {
    if (!fechaLimite) return;
    if (fechaLimite < today) return;
    if (fechaPlan && fechaLimite > fechaPlan) return;
    if (requiresFlexibleChoice && solicitarAnticipo) {
      if (!anticipoDescripcion.trim()) return;
      const anticipoValue = Number(anticipoPrecio);
      if (!Number.isFinite(anticipoValue) || anticipoValue < 2) return;
    }
    setSaving(true);
    try {
      const cleanedQuestions = questions
        .filter((item) => item.question.trim())
        .filter((item) => (item.question_type === 'choice' ? (item.options ?? []).length >= 2 : true))
        .map(({ question, question_type, required, options }) => ({
          question: question.trim(),
          question_type,
          required,
          options: question_type === 'choice' ? options ?? [] : undefined,
        }));

      const payload: Parameters<typeof ReservaActionsService.aceptarReserva>[0] = {
        reservaId: reserva.id,
        questions: cleanedQuestions.length ? cleanedQuestions : undefined,
      };
      if (requiresFlexibleChoice) {
        if (solicitarAnticipo) {
          payload.fechaLimitePago = fechaLimite;
          payload.anticipoDescripcion = anticipoDescripcion.trim();
          payload.anticipoPrecio = Number(anticipoPrecio);
        } else {
          payload.fechaLimiteAsistentes = fechaLimite;
          payload.fechaLimitePago = fechaLimite;
        }
      } else {
        payload.fechaLimitePago = fechaLimite;
      }
      await ReservaActionsService.aceptarReserva(payload);
      setOpenAccept(false);
      onCompleted?.();
    } finally {
      setSaving(false);
    }
  };

  const onRechazar = async () => {
    if (!motivo.trim()) return;
    setSaving(true);
    try {
      await ReservaActionsService.rechazarReserva({
        reservaId: reserva.id,
        motivo: motivo.trim(),
      });
      setOpenReject(false);
      onCompleted?.();
    } finally {
      setSaving(false);
    }
  };

  const buttonClass =
    size === 'lg'
      ? 'h-9 px-4 text-sm'
      : 'h-7 px-2 text-xs';

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <Button
        variant="outline"
        size="sm"
        className={`${buttonClass} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
        onClick={() => setOpenAccept(true)}
      >
        Aceptar reserva
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={`${buttonClass} border-rose-200 text-rose-700 hover:bg-rose-50`}
        onClick={() => setOpenReject(true)}
      >
        Rechazar
      </Button>

      <Dialog open={openAccept} onOpenChange={setOpenAccept}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aceptar reserva</DialogTitle>
            <DialogDescription>
              Define la fecha límite y añade preguntas para el cliente si lo necesitas.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {reservaNombre}
            </div>
            <div>
              {requiresFlexibleChoice && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <input
                    id="solicitar-anticipo"
                    type="checkbox"
                    className="h-4 w-4 accent-[#7472fd]"
                    checked={solicitarAnticipo}
                    onChange={(event) => setSolicitarAnticipo(event.target.checked)}
                  />
                  <label htmlFor="solicitar-anticipo" className="text-sm font-medium text-slate-700">
                    Solicitar anticipo al cliente
                  </label>
                </div>
              )}
              <label className="text-sm font-medium text-slate-700">{fechaLabel}</label>
              <Input
                type="date"
                value={fechaLimite}
                min={today}
                max={fechaPlan || undefined}
                onChange={(event) => setFechaLimite(event.target.value)}
              />
              {formattedFechaPlan && (
                <p className="mt-1 text-xs text-slate-500">Fecha del plan: {formattedFechaPlan}</p>
              )}
              {requiresFlexibleChoice && !solicitarAnticipo && (
                <p className="mt-1 text-xs text-slate-500">
                  Esta fecha se usará para indicar asistentes y confirmar la reserva.
                </p>
              )}
            </div>
            {requiresFlexibleChoice && solicitarAnticipo && (
              <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">Descripción del anticipo</label>
                  <Input
                    value={anticipoDescripcion}
                    onChange={(event) => setAnticipoDescripcion(event.target.value)}
                    placeholder="Ej: Una consumición"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Importe del anticipo</label>
                  <NumberInput
                    min={2}
                    step="0.5"
                    value={Number.isNaN(Number(anticipoPrecio)) ? null : Number(anticipoPrecio)}
                    onChangeValue={(value) => setAnticipoPrecio(String(value))}
                    placeholder="Ej: 10"
                  />
                  <p className="mt-1 text-xs text-slate-500">Mínimo 2€ por persona.</p>
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-700">Preguntas para el cliente (opcional)</label>
                <Button type="button" variant="outline" onClick={addQuestion}>
                  Añadir pregunta
                </Button>
              </div>

              {questions.length > 0 && (
                <div className="mt-3 space-y-3">
                  {questions.map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-600">Pregunta {index + 1}</p>
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:text-rose-700"
                          onClick={() => removeQuestion(item.id)}
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="text-xs font-medium text-slate-600">Pregunta</label>
                          <Input
                            value={item.question}
                            onChange={(event) => updateQuestion(item.id, { question: event.target.value })}
                            placeholder="Ej: ¿Qué quieres de primer plato?"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600">Tipo de pregunta</label>
                          <select
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={item.question_type}
                            onChange={(event) => updateQuestion(item.id, { question_type: event.target.value as QuestionType })}
                          >
                            <option value="string">Texto libre</option>
                            <option value="choice">Opción múltiple</option>
                            <option value="boolean">Sí / No</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            id={`question-required-${item.id}`}
                            type="checkbox"
                            className="h-4 w-4 accent-[#7472fd]"
                            checked={item.required}
                            onChange={(event) => updateQuestion(item.id, { required: event.target.checked })}
                          />
                          <label htmlFor={`question-required-${item.id}`} className="text-xs font-medium text-slate-600">
                            Pregunta requerida
                          </label>
                        </div>
                      </div>

                      {item.question_type === 'choice' && (
                        <div className="mt-3 space-y-2">
                          <label className="text-xs font-medium text-slate-600">Opciones</label>
                          <div className="flex gap-2">
                            <Input
                              value={item.optionDraft ?? ''}
                              onChange={(event) => updateQuestion(item.id, { optionDraft: event.target.value })}
                              placeholder="Ej: Opción 1"
                            />
                            <Button type="button" variant="outline" onClick={() => addOption(item.id)}>
                              Añadir
                            </Button>
                          </div>
                          {item.options && item.options.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {item.options.map((opt, optIndex) => (
                                <button
                                  key={`${opt}-${optIndex}`}
                                  type="button"
                                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-rose-200 hover:text-rose-600"
                                  onClick={() => removeOption(item.id, optIndex)}
                                >
                                  {opt} · quitar
                                </button>
                              ))}
                            </div>
                          )}
                          {item.options && item.options.length > 0 && item.options.length < 2 && (
                            <p className="text-xs text-amber-600">Añade al menos 2 opciones.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenAccept(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-500 text-white hover:bg-emerald-500"
              onClick={onAceptar}
              disabled={saving || !fechaLimite}
            >
              {saving ? 'Guardando...' : 'Aceptar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openReject} onOpenChange={setOpenReject}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar reserva</DialogTitle>
            <DialogDescription>Indica el motivo para informar al cliente.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <Textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ej: No tenemos disponibilidad en esa fecha."
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenReject(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-rose-500 text-white hover:bg-rose-500"
              onClick={onRechazar}
              disabled={saving || !motivo.trim()}
            >
              {saving ? 'Guardando...' : 'Rechazar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
