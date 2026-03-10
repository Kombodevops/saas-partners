'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Download, HelpCircle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { AsistenciaDetalle } from '@/lib/services/reserva-detalle.service';
import { ReservaDetalleService } from '@/lib/services/reserva-detalle.service';

type QuestionItem = {
  id: string;
  question: string;
  question_type: 'string' | 'choice' | 'boolean';
  required: boolean;
  options?: string[];
  optionDraft?: string;
};

type Props = {
  reservaId: string;
  stats: {
    totalAsistentes: number;
    confirmados: number;
    confirmadosNoPagados: number;
    pagados: number;
    talvez: number;
    noAsisten: number;
  };
  alergias: AsistenciaDetalle[];
  preguntas: Array<{ question?: string; question_type?: string; required?: boolean; options?: string[] }>;
  showPaymentStats?: boolean;
  isKomvo?: boolean;
  onReload?: () => void;
};

type QAAnswer = {
  question: string;
  questionType: string;
  required: boolean;
  answers: Array<{ value: string; count: number }>;
  total: number;
  respuestasIndividuales: Array<{
    nombre: string;
    esInvitado: boolean;
    invitadoPor?: string;
    respuesta: string;
  }>;
};

type AsistenteRow = {
  id: string;
  nombre: string;
  esInvitado: boolean;
  invitadoPor?: string;
  tipoAsistencia: string;
  alergias: string;
  email: string;
  telefono: string;
  respuestas: Record<string, unknown>;
};

const formatAnswer = (value: unknown) => {
  if (value === undefined || value === null || value === '') return 'Sin respuesta';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
};

const normalizeAlergias = (value: unknown) => {
  if (!value) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
};

const getAsistenciaQuestions = (asistencia: AsistenciaDetalle) => {
  const raw = (asistencia as Record<string, unknown>).questions;
  if (raw && typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return {};
};

const getAsistenciaNombre = (asistencia: AsistenciaDetalle, fallback: string) => {
  const raw = asistencia as Record<string, unknown>;
  return (raw.nombre as string | undefined) ?? (raw['Nombre'] as string | undefined) ?? fallback;
};

const getAsistenciaEmail = (asistencia: AsistenciaDetalle) => {
  const raw = asistencia as Record<string, unknown>;
  return (raw.email as string | undefined) ?? (raw.Email as string | undefined) ?? '';
};

const getAsistenciaTelefono = (asistencia: AsistenciaDetalle) => {
  const raw = asistencia as Record<string, unknown>;
  return (
    (raw.telefono as string | undefined) ??
    (raw.Telefono as string | undefined) ??
    (raw['Número de teléfono'] as string | undefined) ??
    ''
  );
};

const buildQA = (asistencias: AsistenciaDetalle[], preguntas: Props['preguntas']): QAAnswer[] => {
  const questionMeta = new Map<string, { type: string; required: boolean }>();
  preguntas.forEach((q) => {
    if (q.question) {
      questionMeta.set(q.question, {
        type: q.question_type ?? 'string',
        required: Boolean(q.required),
      });
    }
  });

  const stats = new Map<string, Map<string, number>>();
  const individuales = new Map<string, QAAnswer['respuestasIndividuales']>();

  const pushAnswer = (question: string, respuesta: unknown, nombre: string, esInvitado: boolean, invitadoPor?: string) => {
    const respuestaStr = formatAnswer(respuesta);
    if (!stats.has(question)) stats.set(question, new Map());
    const bucket = stats.get(question)!;
    bucket.set(respuestaStr, (bucket.get(respuestaStr) ?? 0) + 1);

    if (!individuales.has(question)) individuales.set(question, []);
    individuales.get(question)!.push({ nombre, esInvitado, invitadoPor, respuesta: respuestaStr });
  };

  asistencias.forEach((asistencia) => {
    const nombre = getAsistenciaNombre(asistencia, asistencia.id);
    const questions = getAsistenciaQuestions(asistencia);
    Object.entries(questions).forEach(([question, answer]) => {
      if (!questionMeta.has(question)) {
        questionMeta.set(question, { type: 'string', required: false });
      }
      pushAnswer(question, answer, nombre, false);
    });

    const invitados = (asistencia as Record<string, unknown>).invitados as Array<Record<string, unknown>> | undefined;
    invitados?.forEach((inv, index) => {
      const invNombre =
        (inv.nombre as string | undefined) ??
        (inv['Nombre'] as string | undefined) ??
        `${nombre} (Invitado ${index + 1})`;
      const invQuestions = inv.questions as Record<string, unknown> | undefined;
      if (!invQuestions) return;
      Object.entries(invQuestions).forEach(([question, answer]) => {
        if (!questionMeta.has(question)) {
          questionMeta.set(question, { type: 'string', required: false });
        }
        pushAnswer(question, answer, invNombre, true, nombre);
      });
    });
  });

  const orderedQuestions = Array.from(questionMeta.keys()).sort();
  return orderedQuestions.map((question) => {
    const bucket = stats.get(question) ?? new Map();
    const answers = Array.from(bucket.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
    const total = answers.reduce((acc, item) => acc + item.count, 0);
    const meta = questionMeta.get(question) ?? { type: 'string', required: false };
    return {
      question,
      questionType: meta.type,
      required: meta.required,
      answers,
      total,
      respuestasIndividuales: individuales.get(question) ?? [],
    };
  });
};

const buildAsistentesRows = (asistencias: AsistenciaDetalle[]): AsistenteRow[] => {
  const rows: AsistenteRow[] = [];

  asistencias.forEach((asistencia) => {
    const tipoAsistencia = ((asistencia.tipoAsistencia as string | undefined) ?? '').toLowerCase();
    const tipoLabel = tipoAsistencia === 'si' ? 'Confirmado' : tipoAsistencia === 'talvez' ? 'Tal vez' : 'No asisten';
    const nombre = getAsistenciaNombre(asistencia, asistencia.id);
    rows.push({
      id: asistencia.id,
      nombre,
      esInvitado: false,
      tipoAsistencia: tipoLabel,
      alergias: normalizeAlergias(asistencia.alergias),
      email: getAsistenciaEmail(asistencia),
      telefono: getAsistenciaTelefono(asistencia),
      respuestas: getAsistenciaQuestions(asistencia),
    });

    const invitados = (asistencia as Record<string, unknown>).invitados as Array<Record<string, unknown>> | undefined;
    invitados?.forEach((inv, index) => {
      const invNombre =
        (inv.nombre as string | undefined) ??
        (inv['Nombre'] as string | undefined) ??
        `${nombre} (Invitado ${index + 1})`;
      const invTipo = ((inv.tipoAsistencia as string | undefined) ?? tipoAsistencia).toLowerCase();
      const invTipoLabel = invTipo === 'si' ? 'Confirmado' : invTipo === 'talvez' ? 'Tal vez' : 'No asisten';
      rows.push({
        id: `${asistencia.id}-inv-${index}`,
        nombre: invNombre,
        esInvitado: true,
        invitadoPor: nombre,
        tipoAsistencia: invTipoLabel,
        alergias: normalizeAlergias(inv.alergias),
        email: (inv.email as string | undefined) ?? '',
        telefono: (inv.telefono as string | undefined) ?? '',
        respuestas: (inv.questions as Record<string, unknown> | undefined) ?? {},
      });
    });
  });

  return rows;
};

const buildCSV = (asistencias: AsistenciaDetalle[], preguntas: Props['preguntas'], includeContact: boolean) => {
  const questionSet = new Set<string>();
  preguntas.forEach((q) => {
    if (q.question) questionSet.add(q.question);
  });

  asistencias.forEach((asistencia) => {
    const questions = getAsistenciaQuestions(asistencia);
    Object.keys(questions).forEach((q) => questionSet.add(q));
    const invitados = (asistencia as Record<string, unknown>).invitados as Array<Record<string, unknown>> | undefined;
    invitados?.forEach((inv) => {
      const invQuestions = inv.questions as Record<string, unknown> | undefined;
      if (!invQuestions) return;
      Object.keys(invQuestions).forEach((q) => questionSet.add(q));
    });
  });

  const questionColumns = Array.from(questionSet.values()).sort();
  const baseHeaders = ['Nombre', 'Tipo de asistencia', 'Alergias'];
  const contactHeaders = includeContact ? ['Email', 'Teléfono'] : [];
  const headers = [...baseHeaders, ...contactHeaders, ...questionColumns];

  const rows: string[][] = [];

  const pushRow = (
    nombre: string,
    tipoAsistencia: string,
    alergiasValue: string,
    email: string,
    telefono: string,
    questions: Record<string, unknown>
  ) => {
    const base = [nombre, tipoAsistencia, alergiasValue];
    const contact = includeContact ? [email || '', telefono || ''] : [];
    const answers = questionColumns.map((q) => formatAnswer(questions[q]));
    rows.push([...base, ...contact, ...answers]);
  };

  asistencias.forEach((asistencia) => {
    const tipoAsistencia = ((asistencia.tipoAsistencia as string | undefined) ?? '').toLowerCase();
    const tipoLabel = tipoAsistencia === 'si' ? 'Confirmado' : tipoAsistencia === 'talvez' ? 'Tal vez' : 'No asisten';
    const nombre = getAsistenciaNombre(asistencia, asistencia.id);
    const alergiasValue = normalizeAlergias(asistencia.alergias);
    const email = getAsistenciaEmail(asistencia);
    const telefono = getAsistenciaTelefono(asistencia);
    pushRow(nombre, tipoLabel, alergiasValue, email, telefono, getAsistenciaQuestions(asistencia));

    const invitados = (asistencia as Record<string, unknown>).invitados as Array<Record<string, unknown>> | undefined;
    invitados?.forEach((inv, index) => {
      const invNombre =
        (inv.nombre as string | undefined) ??
        (inv['Nombre'] as string | undefined) ??
        `${nombre} (Invitado ${index + 1})`;
      const invTipo = ((inv.tipoAsistencia as string | undefined) ?? tipoAsistencia).toLowerCase();
      const invTipoLabel = invTipo === 'si' ? 'Confirmado' : invTipo === 'talvez' ? 'Tal vez' : 'No asisten';
      const invAlergias = normalizeAlergias(inv.alergias);
      const invEmail = includeContact ? ((inv.email as string | undefined) ?? '') : '';
      const invTelefono = includeContact ? ((inv.telefono as string | undefined) ?? '') : '';
      const invQuestions = (inv.questions as Record<string, unknown> | undefined) ?? {};
      pushRow(invNombre, invTipoLabel, invAlergias, invEmail, invTelefono, invQuestions);
    });
  });

  const escapeCell = (value: string) => {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
      return `"${value.replace(/\"/g, '""')}"`;
    }
    return value;
  };

  const csvLines = [headers.map(escapeCell).join(','), ...rows.map((row) => row.map(escapeCell).join(','))];
  return csvLines.join('\n');
};

const getChoiceColors = (index: number) => {
  const palette = [
    'from-[#7472FD] to-[#6A67F3]',
    'from-[#2DD4BF] to-[#14B8A6]',
    'from-[#F59E0B] to-[#F97316]',
    'from-[#60A5FA] to-[#3B82F6]',
    'from-[#F472B6] to-[#EC4899]',
    'from-[#A78BFA] to-[#8B5CF6]',
  ];
  return palette[index % palette.length];
};

const mapQuestionsToDraft = (questions: Props['preguntas']) => {
  return questions.map((q, index) => ({
    id: `question-${index}-${Date.now()}`,
    question: q.question ?? '',
    question_type: (q.question_type as QuestionItem['question_type']) ?? 'string',
    required: Boolean(q.required),
    options: q.options ? [...q.options] : [],
  }));
};

export function AsistentesCard({ stats, alergias, preguntas, showPaymentStats, isKomvo, reservaId, onReload }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedAsistentes, setExpandedAsistentes] = useState<Record<string, boolean>>({});
  const [qaDialogOpen, setQaDialogOpen] = useState(false);
  const [qaView, setQaView] = useState<'respuestas' | 'editar'>('respuestas');
  const [editingQuestions, setEditingQuestions] = useState<QuestionItem[]>(() => mapQuestionsToDraft(preguntas));
  const [savingQuestions, setSavingQuestions] = useState(false);

  const alergiasList = alergias
    .flatMap((asistencia) => {
      const entries: Array<{ label: string; detalle: string }> = [];
      const nombre = getAsistenciaNombre(asistencia, `Asistencia ${asistencia.id}`);
      const alergiasValue = normalizeAlergias(asistencia.alergias);
      if (alergiasValue) {
        entries.push({ label: nombre, detalle: alergiasValue });
      }
      const invitados = (asistencia as Record<string, unknown>).invitados as Array<Record<string, unknown>> | undefined;
      invitados?.forEach((inv, index) => {
        const invNombre =
          (inv.nombre as string | undefined) ??
          (inv['Nombre'] as string | undefined) ??
          `${nombre} (Invitado ${index + 1})`;
        const invAlergias = normalizeAlergias(inv.alergias);
        if (invAlergias) {
          entries.push({ label: invNombre, detalle: invAlergias });
        }
      });
      return entries;
    })
    .filter((entry) => entry.detalle);

  const qaData = useMemo(() => buildQA(alergias, preguntas), [alergias, preguntas]);
  const asistentesRows = useMemo(() => buildAsistentesRows(alergias), [alergias]);
  const hasPreguntas = preguntas.length > 0;

  const handleDownloadCSV = () => {
    const csv = buildCSV(alergias, preguntas, !isKomvo);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'asistentes_reserva.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const addQuestion = () => {
    setEditingQuestions((prev) => [
      ...prev,
      {
        id: `question-${prev.length}-${Date.now()}`,
        question: '',
        question_type: 'string',
        required: false,
        options: [],
      },
    ]);
  };

  const updateQuestion = (id: string, data: Partial<QuestionItem>) => {
    setEditingQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
  };

  const removeQuestion = (id: string) => {
    setEditingQuestions((prev) => prev.filter((item) => item.id !== id));
  };

  const addOption = (id: string) => {
    setEditingQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const draft = item.optionDraft?.trim();
        if (!draft) return item;
        return { ...item, options: [...(item.options ?? []), draft], optionDraft: '' };
      })
    );
  };

  const removeOption = (id: string, index: number) => {
    setEditingQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = [...(item.options ?? [])];
        next.splice(index, 1);
        return { ...item, options: next };
      })
    );
  };

  const handleSaveQuestions = async () => {
    if (savingQuestions) return;
    setSavingQuestions(true);
    try {
      const payload = editingQuestions.map((q) => ({
        question: q.question,
        question_type: q.question_type,
        required: q.required,
        options: q.options,
      }));
      await ReservaDetalleService.updateReservaQuestions(reservaId, payload);
      onReload?.();
    } finally {
      setSavingQuestions(false);
    }
  };

  return (
    <Card className="border-none bg-white shadow-sm">
      <CardHeader className="flex items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Asistentes</p>
          <CardTitle className="text-base text-slate-900">Resumen</CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Ver asistentes
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Asistentes</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {asistentesRows.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay asistentes todavía.</p>
                ) : (
                  asistentesRows.map((row) => (
                    <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{row.nombre}</p>
                          {row.esInvitado && (
                            <p className="text-[11px] text-slate-500">Invitado por {row.invitadoPor ?? 'Usuario principal'}</p>
                          )}
                          <p className="text-xs text-slate-500">{row.tipoAsistencia}</p>
                        </div>
                        <button
                          type="button"
                          className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                          onClick={() =>
                            setExpandedAsistentes((prev) => ({
                              ...prev,
                              [row.id]: !prev[row.id],
                            }))
                          }
                        >
                          {expandedAsistentes[row.id] ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </div>
                      {expandedAsistentes[row.id] && (
                        <div className="mt-3 space-y-2 text-xs text-slate-600">
                          {row.alergias ? (
                            <div className="rounded-md border border-amber-100 bg-amber-50 p-2 text-amber-800">
                              <span className="font-semibold">Alergias:</span> {row.alergias}
                            </div>
                          ) : (
                            <p className="text-slate-500">Sin alergias registradas.</p>
                          )}
                          {!isKomvo && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="rounded-md border border-slate-200 bg-white p-2">
                                <p className="text-[10px] uppercase text-slate-400">Email</p>
                                <p className="text-xs text-slate-700">{row.email || 'No disponible'}</p>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-white p-2">
                                <p className="text-[10px] uppercase text-slate-400">Teléfono</p>
                                <p className="text-xs text-slate-700">{row.telefono || 'No disponible'}</p>
                              </div>
                            </div>
                          )}
                          {Object.keys(row.respuestas).length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[11px] uppercase text-slate-400">Respuestas</p>
                              {Object.entries(row.respuestas).map(([question, answer]) => (
                                <div key={`${row.id}-${question}`} className="rounded-md border border-slate-200 bg-white p-2">
                                  <p className="text-[11px] font-semibold text-slate-700">{question}</p>
                                  <p className="text-xs text-slate-600">{formatAnswer(answer)}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-500">Sin respuestas registradas.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Descargar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
            <p className="text-lg font-semibold text-slate-900">{stats.totalAsistentes}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Confirmados</p>
            <p className="text-lg font-semibold text-slate-900">{stats.confirmados}</p>
          </div>
          {showPaymentStats && (
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Pagados</p>
              <p className="text-lg font-semibold text-slate-900">{stats.pagados}</p>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {showPaymentStats && (
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Confirmados sin pago</p>
              <p className="text-lg font-semibold text-slate-900">{stats.confirmadosNoPagados}</p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Tal vez</p>
            <p className="text-lg font-semibold text-slate-900">{stats.talvez}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">No asisten</p>
            <p className="text-lg font-semibold text-slate-900">{stats.noAsisten}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Preguntas y respuestas</p>
            {hasPreguntas ? (
              <Dialog
                open={qaDialogOpen}
                onOpenChange={(open) => {
                  setQaDialogOpen(open);
                  if (open) setQaView(hasPreguntas ? 'respuestas' : 'editar');
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Ver Q&A
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Preguntas y respuestas</DialogTitle>
                  </DialogHeader>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQaView('respuestas')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        qaView === 'respuestas' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Ver respuestas
                    </button>
                    <button
                      type="button"
                      onClick={() => setQaView('editar')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        qaView === 'editar' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Editar Q&A
                    </button>
                  </div>

                  {qaView === 'editar' && (
                    <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
                      Si editas o añades preguntas, los asistentes ya apuntados pueden no actualizar sus respuestas.
                    </div>
                  )}

                  {qaView === 'respuestas' && (
                    <div className="mt-4 space-y-4">
                      {qaData.length === 0 ? (
                        <p className="text-sm text-slate-500">Aún no hay respuestas de los asistentes.</p>
                      ) : (
                        qaData.map((qa) => (
                          <div key={qa.question} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{qa.question}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                                    {qa.questionType === 'choice'
                                      ? 'Opción múltiple'
                                      : qa.questionType === 'boolean'
                                        ? 'Sí / No'
                                        : 'Texto libre'}
                                  </span>
                                  <span
                                    className={
                                      qa.required
                                        ? 'rounded-full bg-amber-100 px-2 py-0.5 text-amber-700'
                                        : 'rounded-full bg-slate-100 px-2 py-0.5'
                                    }
                                  >
                                    {qa.required ? 'Obligatoria' : 'Opcional'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs text-slate-500">{qa.total} respuestas</span>
                            </div>

                            {qa.questionType === 'choice' && qa.answers.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {qa.answers.map((answer, idx) => {
                                  const percent = qa.total > 0 ? Math.round((answer.count / qa.total) * 100) : 0;
                                  return (
                                    <div key={`${qa.question}-${answer.value}`} className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-700">{answer.value}</span>
                                        <span className="text-slate-500">
                                          {answer.count} · {percent}%
                                        </span>
                                      </div>
                                      <div className="h-2 w-full rounded-full bg-slate-200">
                                        <div
                                          className={`h-2 rounded-full bg-gradient-to-r ${getChoiceColors(idx)}`}
                                          style={{ width: `${percent}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {qa.questionType === 'boolean' && (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {['Sí', 'No'].map((label) => {
                                  const match = qa.answers.find((a) => a.value.toLowerCase() === label.toLowerCase());
                                  const count = match?.count ?? 0;
                                  const percent = qa.total > 0 ? Math.round((count / qa.total) * 100) : 0;
                                  return (
                                    <div
                                      key={`${qa.question}-${label}`}
                                      className="rounded-lg border border-slate-200 bg-white p-3"
                                    >
                                      <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span>{label}</span>
                                        <span>
                                          {count} · {percent}%
                                        </span>
                                      </div>
                                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                                        <div className="h-2 rounded-full bg-[#7472FD]" style={{ width: `${percent}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Respuestas individuales</span>
                                {qa.respuestasIndividuales.length > 3 && (
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                                    onClick={() =>
                                      setExpanded((prev) => ({
                                        ...prev,
                                        [qa.question]: !prev[qa.question],
                                      }))
                                    }
                                  >
                                    {expanded[qa.question]
                                      ? 'Ver menos'
                                      : `Ver todas (${qa.respuestasIndividuales.length})`}
                                  </button>
                                )}
                              </div>
                              <div className="mt-2 space-y-2">
                                {(expanded[qa.question]
                                  ? qa.respuestasIndividuales
                                  : qa.respuestasIndividuales.slice(0, 3)
                                ).map((resp, idx) => (
                                  <div
                                    key={`${qa.question}-${idx}`}
                                    className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <p className="font-semibold text-slate-800">{resp.nombre}</p>
                                        {resp.esInvitado && (
                                          <p className="text-[10px] text-slate-500">
                                            Invitado por {resp.invitadoPor ?? 'Usuario principal'}
                                          </p>
                                        )}
                                      </div>
                                      <p className="text-right text-slate-600">{resp.respuesta}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {qaView === 'editar' && (
                    <div className="mt-4 space-y-4">
                      {editingQuestions.map((item, index) => (
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
                                onChange={(event) =>
                                  updateQuestion(item.id, { question_type: event.target.value as QuestionItem['question_type'] })
                                }
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
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" onClick={addQuestion}>
                          Añadir pregunta
                        </Button>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setQaDialogOpen(false)}>
                      Cerrar
                    </Button>
                    {qaView === 'editar' && (
                      <Button
                        className="bg-[#7472FD] text-white hover:bg-[#5f5bf2]"
                        disabled={savingQuestions}
                        onClick={async () => {
                          await handleSaveQuestions();
                          setQaDialogOpen(false);
                        }}
                      >
                        {savingQuestions ? 'Guardando...' : 'Guardar Q&A'}
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={qaDialogOpen} onOpenChange={setQaDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Añadir Q&A
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Añadir preguntas</DialogTitle>
                  </DialogHeader>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
                    Si editas o añades preguntas, los asistentes ya apuntados pueden no actualizar sus respuestas.
                  </div>
                  <div className="mt-4 space-y-4">
                    {editingQuestions.length === 0 && (
                      <p className="text-sm text-slate-500">Aún no has añadido preguntas.</p>
                    )}
                    {editingQuestions.map((item, index) => (
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
                              onChange={(event) =>
                                updateQuestion(item.id, { question_type: event.target.value as QuestionItem['question_type'] })
                              }
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
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={addQuestion}>
                        Añadir pregunta
                      </Button>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setQaDialogOpen(false)}>
                      Cerrar
                    </Button>
                    <Button
                      className="bg-[#7472FD] text-white hover:bg-[#5f5bf2]"
                      disabled={savingQuestions}
                      onClick={async () => {
                        await handleSaveQuestions();
                        setQaDialogOpen(false);
                      }}
                    >
                      {savingQuestions ? 'Guardando...' : 'Guardar Q&A'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {hasPreguntas ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">{preguntas.length} preguntas definidas</p>
              <div className="mt-2 space-y-1">
                {preguntas.map((q, idx) => (
                  <div key={`${q.question ?? idx}`} className="rounded-md border border-slate-200 bg-white px-2 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-slate-700">{q.question ?? 'Pregunta sin texto'}</span>
                      <span className={q.required ? 'rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700' : 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500'}>
                        {q.required ? 'Obligatoria' : 'Opcional'}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {q.question_type === 'choice'
                        ? 'Opción múltiple'
                        : q.question_type === 'boolean'
                          ? 'Sí / No'
                          : 'Texto libre'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="text-sm text-slate-500">No hay preguntas configuradas para esta reserva.</p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Alergias detectadas</p>
            {alergiasList.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Ver alergias
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[75vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Alergias detectadas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm text-slate-700">
                    {alergiasList.map((entry) => (
                      <div key={`${entry.label}-${entry.detalle}`} className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <p className="text-sm font-semibold text-amber-900">{entry.label}</p>
                        <p className="mt-1 text-xs text-amber-800">{entry.detalle}</p>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {alergiasList.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No se detectaron alergias.</p>
          ) : (
            <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
              Hay alergias registradas. Revisa el detalle.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
