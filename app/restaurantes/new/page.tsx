'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { AuthService } from '@/lib/services/auth.service';
import { useRestaurantes } from '@/components/shared/restaurantes-context';
import { RestauranteImagesService } from '@/lib/services/restaurante-images.service';
import { RestauranteLogoService } from '@/lib/services/restaurante-logo.service';
import { RestauranteCartaService } from '@/lib/services/restaurante-carta.service';
import { RestauranteNewSchema, type RestauranteNewForm } from '@/lib/validators/restaurante-new';
import { STEPS, type StepKey } from './components/constants';
import { StepHeader } from './components/step-header';
import { StepSidebar } from './components/step-sidebar';
import { geocodeOSM } from './components/utils';
import { slugify } from '@/lib/utils/slugify';
import { BasicoStep } from './components/steps/basico-step';
import { UbicacionStep } from './components/steps/ubicacion-step';
import { HorariosStep } from './components/steps/horarios-step';
import { RacionesStep } from './components/steps/raciones-step';
import { SalasStep } from './components/steps/salas-step';
import { ConsumicionesStep } from './components/steps/consumiciones-step';
import { ExtrasStep } from './components/steps/extras-step';
import { CaracteristicasStep } from './components/steps/caracteristicas-step';
import { ArchivosStep } from './components/steps/archivos-step';
import { ResponsableStep } from './components/steps/responsable-step';
import { ResumenStep } from './components/steps/resumen-step';

const initialHorarios: RestauranteNewForm['horarios'] = {
  Lunes: { cerrado: false, intervalos: [{ horaInicio: '10:00', horaFin: '14:00' }, { horaInicio: '19:00', horaFin: '23:00' }] },
  Martes: { cerrado: false, intervalos: [] },
  Miércoles: { cerrado: false, intervalos: [] },
  Jueves: { cerrado: false, intervalos: [] },
  Viernes: { cerrado: false, intervalos: [] },
  Sábado: { cerrado: false, intervalos: [] },
  Domingo: { cerrado: false, intervalos: [] },
};

  const stepFields: Record<StepKey, Array<keyof RestauranteNewForm>> = {
  basico: ['basico'],
  ubicacion: ['ubicacion'],
  horarios: ['horarios'],
  raciones: ['raciones'],
  caracteristicas: ['caracteristicas'],
  salas: ['salas'],
  consumiciones: ['consumiciones'],
  extras: ['extras'],
  archivos: [],
  responsable: ['responsable'],
  resumen: [],
};

export default function NewRestaurantPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [imagenes, setImagenes] = useState<File[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [pdfNames, setPdfNames] = useState<string[]>([]);
  const [consumicionesFiles, setConsumicionesFiles] = useState<File[]>([]);
  const { refresh: refreshRestaurantes } = useRestaurantes();

  const form = useForm<RestauranteNewForm>({
    resolver: zodResolver(RestauranteNewSchema),
    defaultValues: {
      basico: {
        nombre: '',
        descripcion: '',
        telefono: '',
        tipoCocina: '',
        aforoMin: 0,
        aforoMax: 0,
        presupuesto: '2',
      },
      ubicacion: {
        direccion: '',
        ciudad: '',
        codigoPostal: '',
        ubicacion: 'Chamberí',
      },
      horarios: initialHorarios,
      raciones: [],
      salas: [],
      consumiciones: [],
      extras: [],
      caracteristicas: {},
      responsable: { nombre: '', telefono: '' },
    },
    mode: 'onChange',
  });

  const horarios = form.watch('horarios') as RestauranteNewForm['horarios'];
  const horariosEntries = Object.entries(horarios) as Array<
    [
      string,
      {
        cerrado: boolean;
        intervalos: Array<{ horaInicio: string; horaFin: string }>;
      },
    ]
  >;
  const hasAnyHorario = useMemo(
    () => horariosEntries.some(([, dia]) => !dia.cerrado && dia.intervalos.length > 0),
    [horariosEntries]
  );

  const validateStep = async () => {
    setError(null);
    const step = STEPS[currentStep].key;
    if (step === 'horarios') {
      if (!hasAnyHorario) {
        setError('Debes configurar al menos un horario');
        return false;
      }
      return true;
    }
    if (step === 'archivos') {
      if (imagenes.length === 0) {
        setError('Debes subir al menos una imagen');
        return false;
      }
      if (!logo) {
        setError('Debes subir un logo');
        return false;
      }
      if (pdfs.length > 0 && pdfNames.some((name) => !name.trim())) {
        setError('Debes indicar un nombre para cada PDF');
        return false;
      }
      return true;
    }
    if (step === 'caracteristicas') {
      const values = form.getValues('caracteristicas');
      if (!values || Object.keys(values).length === 0) {
        setError('Debes seleccionar al menos una característica');
        return false;
      }
    }
    const fields = stepFields[step];
    if (!fields.length) return true;
    const result = await form.trigger(fields as Array<keyof RestauranteNewForm>);
    if (!result) {
      setError('Revisa los campos obligatorios de esta sección');
    }
    return result;
  };

  const isStepCompleted = (index: number) => {
    const key = STEPS[index].key;
    const values = form.getValues();
    switch (key) {
      case 'basico':
        return Boolean(
          values.basico.nombre.trim() &&
            values.basico.descripcion.trim() &&
            values.basico.telefono.trim() &&
            values.basico.tipoCocina.trim()
        );
      case 'ubicacion':
        return Boolean(
          values.ubicacion.direccion.trim() &&
            values.ubicacion.ciudad.trim() &&
            values.ubicacion.codigoPostal.trim() &&
            values.ubicacion.ubicacion
        );
      case 'horarios':
        return hasAnyHorario;
      case 'raciones':
        return true;
      case 'salas':
        return values.salas.length > 0 && values.salas.every((sala) => sala.nombre.trim() && sala.aforoMinimo > 0 && sala.aforoMaximo > 0 && Object.keys(sala.caracteristicas).length > 0);
      case 'consumiciones':
        return values.consumiciones.length > 0 && values.consumiciones.every((item) => item.nombre.trim() && item.precio > 0);
      case 'extras':
        return values.extras.length === 0 || values.extras.every((item) => item.nombre.trim() && item.descripcion.trim() && item.precio > 0);
      case 'caracteristicas':
        return Object.keys(values.caracteristicas).length > 0;
      case 'archivos':
        return imagenes.length > 0 && Boolean(logo);
      case 'responsable':
        return Boolean(values.responsable.nombre.trim() && values.responsable.telefono.trim());
      case 'resumen':
        return true;
      default:
        return false;
    }
  };

  const completedSteps = useMemo(
    () => STEPS.map((_, index) => isStepCompleted(index)),
    [form.watch(), imagenes, logo, pdfs, hasAnyHorario]
  );

  const handleStepChange = async (nextStep: number) => {
    if (nextStep === currentStep) return;
    if (nextStep > currentStep) {
      const ok = await validateStep();
      if (!ok) return;
    }
    setCurrentStep(nextStep);
  };

  const toTimestamp = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date(2023, 0, 1, h ?? 0, m ?? 0, 0, 0);
    return Timestamp.fromDate(date);
  };

  const buildHorario = () => {
    const result: Record<string, { cerrado: boolean; intervalos: { horaInicio: Timestamp; horaFin: Timestamp }[] }> = {};
    horariosEntries.forEach(([dia, value]) => {
      result[dia] = {
        cerrado: value.cerrado,
        intervalos: value.intervalos.map((intervalo) => ({
          horaInicio: toTimestamp(intervalo.horaInicio),
          horaFin: toTimestamp(intervalo.horaFin),
        })),
      };
    });
    return result;
  };

  const calcHoraCierre = () => {
    let latest = '00:00';
    horariosEntries.forEach(([, dia]) => {
      dia.intervalos.forEach((intervalo: { horaInicio: string; horaFin: string }) => {
        if (intervalo.horaFin > latest) latest = intervalo.horaFin;
      });
    });
    return latest;
  };

  const handleCreate = async () => {
    const ok = await validateStep();
    if (!ok) return;
    setIsSaving(true);
    setError(null);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const basico = form.getValues('basico');
      const ubicacion = form.getValues('ubicacion');
      const raciones = form.getValues('raciones');
      const salas = form.getValues('salas');
      const consumiciones = form.getValues('consumiciones');
      const extras = form.getValues('extras');
      const caracteristicas = form.getValues('caracteristicas');
      const responsable = form.getValues('responsable');

      const attempts = [
        `${ubicacion.direccion}, ${ubicacion.codigoPostal}, ${ubicacion.ciudad}, España`,
        `${ubicacion.direccion}, ${ubicacion.codigoPostal}`,
        ubicacion.direccion,
        ubicacion.codigoPostal,
      ].filter(Boolean);
      let coords = null as { lat: number; lng: number } | null;
      for (const attempt of attempts) {
        coords = await geocodeOSM(attempt);
        if (coords) break;
      }

      const restauranteData = {
        idPropietario: user.uid,
        'Nombre del restaurante': basico.nombre,
        'Descripción': basico.descripcion,
        'Dirección': ubicacion.direccion,
        'Ciudad': ubicacion.ciudad,
        'Código Postal': ubicacion.codigoPostal,
        'Número de teléfono': basico.telefono,
        'Tipo de cocina': basico.tipoCocina,
        Ubicación: ubicacion.ubicacion,
        horaCierre: calcHoraCierre(),
        Raciones: raciones,
        'Imagenes del restaurante': [],
        'Logo del restaurante': [],
        Carta: {},
        horario: buildHorario(),
        latitude: coords?.lat ?? 0,
        longitude: coords?.lng ?? 0,
        abierto: false,
        eventosRealizados: 0,
        reservasPendientes: 0,
        facturacion: 0,
        prioridad: 0,
        packs: [],
        caracteristicas,
        aforo: { min: String(basico.aforoMin), max: String(basico.aforoMax) },
        responsable: { nombre: responsable.nombre, telefono: responsable.telefono },
        consumicionesBarra: consumiciones,
        extras: extras.map((extra) => {
          const base: Record<string, unknown> = {
            nombre: extra.nombre,
            descripcion: extra.descripcion,
            precio: extra.precio,
            tipoPrecio: extra.tipoPrecio,
          };
          if (extra.tipoPrecio === 'porHora') {
            base.tiempoMinimoHoras = extra.tiempoMinimoHoras ?? 1;
            base.tipoIncremento = extra.tipoIncremento ?? 'porHora';
          }
          if (extra.tipoPrecio === 'porUnidad') {
            base.unidadesMinimas = extra.unidadesMinimas ?? 1;
          }
          return base;
        }),
        salas,
        slug: slugify(basico.nombre),
        presupuesto: basico.presupuesto,
      };

      const docRef = await addDoc(collection(db, 'restaurants'), restauranteData);
      const restauranteId = docRef.id;

      if (imagenes.length > 0) {
        await RestauranteImagesService.uploadImages(restauranteId, imagenes, []);
      }
      if (logo) {
        await RestauranteLogoService.uploadLogo(restauranteId, logo);
      }
      if (pdfs.length > 0 && pdfNames.length === pdfs.length) {
        await RestauranteCartaService.uploadPdfs(restauranteId, pdfs, pdfNames);
      }

      const partner = await AuthService.getCurrentPartner();
      await updateDoc(doc(db, 'partners', user.uid), {
        restaurantes: [...new Set([...(partner?.restaurantes ?? []), restauranteId])],
      });

      await refreshRestaurantes({ force: true });

      router.push(`/restaurantes/${restauranteId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el restaurante');
    } finally {
      setIsSaving(false);
    }
  };

  const currentKey = STEPS[currentStep].key;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-4 lg:h-screen lg:px-6 lg:py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:h-full">
        <StepHeader
          currentStep={currentStep}
          total={STEPS.length}
          title="Nuevo restaurante"
          description="Completa la información para activar tu local en el marketplace."
          onBack={() => router.push('/dashboard/restaurantes')}
        />

        <Form {...form}>
          <div className="grid flex-1 gap-6 overflow-hidden lg:grid-cols-[260px_1fr]">
            <div className="lg:sticky lg:top-6 self-start">
              <StepSidebar currentStep={currentStep} completedSteps={completedSteps} onSelect={handleStepChange} />
            </div>

            <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">{STEPS[currentStep].title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto pr-2">
                {currentKey === 'basico' && <BasicoStep />}
                {currentKey === 'ubicacion' && <UbicacionStep />}
                {currentKey === 'horarios' && <HorariosStep />}
                {currentKey === 'raciones' && <RacionesStep />}
                  {currentKey === 'caracteristicas' && <CaracteristicasStep />}
                  {currentKey === 'salas' && <SalasStep />}
                  {currentKey === 'consumiciones' && (
                    <ConsumicionesStep files={consumicionesFiles} onFilesChange={setConsumicionesFiles} />
                  )}
                  {currentKey === 'extras' && <ExtrasStep />}
                {currentKey === 'archivos' && (
                  <ArchivosStep
                    imagenes={imagenes}
                    logo={logo}
                    pdfs={pdfs}
                    pdfNames={pdfNames}
                    onImagenesChange={(files) => setImagenes(files)}
                    onLogoChange={(file) => setLogo(file)}
                    onPdfsChange={(files) => {
                      setPdfs(files);
                      setPdfNames(files.map((file) => file.name.replace(/\.pdf$/i, '')));
                    }}
                    onPdfNameChange={setPdfNames}
                  />
                )}
                {currentKey === 'responsable' && <ResponsableStep />}
                  {currentKey === 'resumen' && (
                    <ResumenStep
                      imagenesCount={imagenes.length}
                      logoSelected={!!logo}
                      pdfsCount={pdfs.length}
                      onNavigate={(stepIndex) => setCurrentStep(stepIndex)}
                    />
                  )}

                {error && <p className="text-sm text-rose-600">{error}</p>}

                  <div className="flex items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentStep === 0}
                      onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                    >
                      Anterior
                    </Button>
                    {currentKey === 'resumen' ? (
                      <Button type="button" className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]" onClick={handleCreate} disabled={isSaving}>
                        {isSaving ? 'Creando...' : 'Crear restaurante'}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleStepChange(STEPS.length - 1)}
                        >
                          Ir al resumen
                        </Button>
                        <Button
                          type="button"
                          className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
                          onClick={async () => {
                            const ok = await validateStep();
                            if (ok) {
                              setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1));
                            }
                          }}
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </div>
              </CardContent>
            </Card>
          </div>
        </Form>
      </div>
    </div>
  );
}
