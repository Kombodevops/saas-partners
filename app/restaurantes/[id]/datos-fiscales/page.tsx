'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AuthService } from '@/lib/services/auth.service';
import { RestaurantesService } from '@/lib/services/restaurantes.service';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';
import { RestauranteFiscalSchema, type RestauranteFiscalForm } from '@/lib/validators/restaurante-fiscal';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface PageProps {
  params: Promise<{ id: string }>;
}

const getValue = (value?: string) => (typeof value === 'string' ? value : '');

export default function RestauranteDatosFiscalesPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<RestauranteDetalleDoc | null>(null);
  const [fiscalSources, setFiscalSources] = useState<
    {
      id: string;
      nombreRestaurante: string;
      stripeAccountId: string;
      email: string;
      nombre: string;
      apellidos: string;
      prefijo: string;
      telefono: string;
      fechaNacimiento: string;
      direccion: string;
      ciudad: string;
      cp: string;
      isBusiness: boolean;
      razonSocial: string;
      nif: string;
      direccionFiscal: string;
      codigoPostalNegocio: string;
      ciudadNegocio: string;
      provinciaNegocio: string;
      telefonoNegocio: string;
      numeroCuenta: string;
      nombreTitular: string;
      nombreBanco: string;
      contrato?: string;
    }[]
  >([]);
  const [partnerSource, setPartnerSource] = useState<null | {
    id: string;
    nombreRestaurante: string;
    stripeAccountId: string;
    email: string;
    nombre: string;
    apellidos: string;
    prefijo: string;
    telefono: string;
    fechaNacimiento: string;
    direccion: string;
    ciudad: string;
    cp: string;
    isBusiness: boolean;
    razonSocial: string;
    nif: string;
    direccionFiscal: string;
    codigoPostalNegocio: string;
    ciudadNegocio: string;
    provinciaNegocio: string;
    telefonoNegocio: string;
    numeroCuenta: string;
    nombreTitular: string;
    nombreBanco: string;
    contrato?: string;
  }>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);
  const [showContract, setShowContract] = useState(false);
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [pendingValues, setPendingValues] = useState<RestauranteFiscalForm | null>(null);
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const contractRef = useRef<HTMLDivElement | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [signatureAspect, setSignatureAspect] = useState(520 / 200);
  const [komvoSignatureDataUrl, setKomvoSignatureDataUrl] = useState('');
  const [komvoSignatureAspect, setKomvoSignatureAspect] = useState(649 / 336);
  const [dniFront, setDniFront] = useState<File | null>(null);
  const [dniBack, setDniBack] = useState<File | null>(null);
  const [dniError, setDniError] = useState('');
  const [confirmSource, setConfirmSource] = useState<string | null>(null);

  const form = useForm<RestauranteFiscalForm>({
    resolver: zodResolver(RestauranteFiscalSchema),
    defaultValues: {
      businessType: 'autonomo',
      email: '',
      nombre: '',
      apellidos: '',
      prefijo: '+34',
      telefono: '',
      fechaNacimiento: '',
      direccion: '',
      ciudad: '',
      cp: '',
      razonSocial: '',
      nif: '',
      direccionFiscal: '',
      codigoPostalNegocio: '',
      ciudadNegocio: '',
      provinciaNegocio: '',
      telefonoNegocio: '',
      numeroCuenta: '',
      nombreTitular: '',
      nombreBanco: '',
      contrato: '',
      stripeAccountId: '',
    },
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const detalle = await RestauranteDetalleService.getRestauranteById(id);
        if (!detalle || !active) return;
        setData(detalle);

        const partner = await AuthService.getCurrentPartner();
        if (!partner || !active) return;
        const fiscalDataRaw = await RestaurantesService.getRestaurantesFiscalesByOwnerId(partner.id);
        const fiscalData = (fiscalDataRaw ?? []).map((item) => ({
          ...item,
          stripeAccountId: typeof item.stripeAccountId === 'string' ? item.stripeAccountId : '',
        }));
        if (!active) return;
        setFiscalSources(fiscalData);

        const partnerFiscal = await AuthService.getCurrentPartnerFiscal();
        if (partnerFiscal && active) {
          setPartnerSource({
            id: 'partner',
            nombreRestaurante: 'Cuenta partner',
            stripeAccountId: partnerFiscal.stripeAccountId || '',
            email: partnerFiscal.Email || '',
            nombre: partnerFiscal['Nombre del negocio'] || partnerFiscal.nombre || '',
            apellidos: partnerFiscal.Apellidos || '',
            prefijo: partnerFiscal.Prefijo || '',
            telefono: partnerFiscal['Número de teléfono'] || '',
            fechaNacimiento: partnerFiscal['Fecha de nacimiento'] || '',
            direccion: partnerFiscal.Dirección || '',
            ciudad: partnerFiscal.Ciudad || '',
            cp: partnerFiscal.CP || '',
            isBusiness: partnerFiscal.isBusiness ?? false,
            razonSocial: partnerFiscal['Razón social'] || '',
            nif: partnerFiscal.NIF || '',
            direccionFiscal: partnerFiscal['Dirección Fiscal'] || '',
            codigoPostalNegocio: partnerFiscal['Código Postal del negocio'] || '',
            ciudadNegocio: partnerFiscal['Ciudad del negocio'] || '',
            provinciaNegocio: partnerFiscal['Provincia del negocio'] || '',
            telefonoNegocio: partnerFiscal['Teléfono del negocio'] || '',
            numeroCuenta: partnerFiscal['Numero de cuenta'] || '',
            nombreTitular: partnerFiscal['Nombre y apellidos del titular de la cuenta'] || '',
            nombreBanco: partnerFiscal['Nombre del banco'] || '',
            contrato: partnerFiscal.contrato || '',
          });
        }

        const personales = detalle.datos_personales;
        const fiscales = detalle.datos_fiscales;
        const bancarios = detalle.datos_bancarios;
        const isBusinessValue = fiscales?.isBusiness;
        form.reset({
          businessType: isBusinessValue ? 'empresa' : 'autonomo',
          email: getValue(personales?.Email),
          nombre: getValue(personales?.nombre),
          apellidos: getValue(personales?.Apellidos),
          prefijo: getValue(personales?.Prefijo) || '+34',
          telefono: getValue(personales?.['Número de teléfono']),
          fechaNacimiento: getValue(personales?.['Fecha de nacimiento']),
          direccion: getValue(personales?.Dirección),
          ciudad: getValue(personales?.Ciudad),
          cp: getValue(personales?.CP),
          razonSocial: getValue(fiscales?.['Razón social']),
          nif: getValue(fiscales?.NIF),
          direccionFiscal: getValue(fiscales?.['Dirección Fiscal']),
          codigoPostalNegocio: getValue(fiscales?.['Código Postal del negocio']),
          ciudadNegocio: getValue(fiscales?.['Ciudad del negocio']),
          provinciaNegocio: getValue(fiscales?.['Provincia del negocio']),
          telefonoNegocio: getValue(fiscales?.['Teléfono del negocio']),
          numeroCuenta: getValue(bancarios?.['Numero de cuenta']),
          nombreTitular: getValue(bancarios?.['Nombre y apellidos del titular de la cuenta']),
          nombreBanco: getValue(bancarios?.['Nombre del banco']),
          contrato: getValue(fiscales?.contrato),
          stripeAccountId: getValue(detalle.stripeAccountId),
        });
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id, form]);

  useEffect(() => {
    let active = true;
    const loadKomvoSignature = async () => {
      try {
        const response = await fetch('/firma/firma-latasa.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (active && typeof reader.result === 'string') {
            setKomvoSignatureDataUrl(reader.result);
            const img = new window.Image();
            img.onload = () => {
              if (active) {
                setKomvoSignatureAspect((img.naturalWidth || 649) / (img.naturalHeight || 336));
              }
            };
            img.src = reader.result;
          }
        };
        reader.readAsDataURL(blob);
      } catch {
        // ignore
      }
    };
    loadKomvoSignature();
    return () => {
      active = false;
    };
  }, []);

  const availableSources = useMemo(() => {
    const restSources = fiscalSources.filter((item) => item.id !== id && item.stripeAccountId);
    const rawSources = partnerSource?.stripeAccountId ? [partnerSource, ...restSources] : restSources;
    const grouped = new Map<
      string,
      (typeof rawSources)[number] & { assignedRestaurantes: string[] }
    >();
    rawSources.forEach((source) => {
      const key = source.stripeAccountId || source.id;
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, {
          ...source,
          assignedRestaurantes: source.nombreRestaurante ? [source.nombreRestaurante] : [],
        });
        return;
      }
      if (source.nombreRestaurante && !current.assignedRestaurantes.includes(source.nombreRestaurante)) {
        current.assignedRestaurantes.push(source.nombreRestaurante);
      }
    });
    return Array.from(grouped.values());
  }, [fiscalSources, id, partnerSource]);
  const stripeLocked = Boolean(data?.stripeAccountId);

  const createStripeAccount = async (
    payload: RestauranteFiscalForm & { dnifUrl?: string; dnibUrl?: string }
  ) => {
    if (payload.stripeAccountId) return payload.stripeAccountId;
    const functionUrl = process.env.NEXT_PUBLIC_CREATE_STRIPE_ACCOUNT;
    if (!functionUrl) return '';

    const nuevoPartner = {
      Email: payload.email ?? '',
      'Razón social': payload.razonSocial ?? '',
      NIF: payload.nif ?? '',
      'Dirección Fiscal': payload.direccionFiscal ?? '',
      'Código Postal del negocio': payload.codigoPostalNegocio ?? '',
      'Ciudad del negocio': payload.ciudadNegocio ?? '',
      'Provincia del negocio': payload.provinciaNegocio ?? '',
      'Teléfono del negocio': payload.telefonoNegocio ?? '',
      'Numero de cuenta': payload.numeroCuenta ?? '',
      'Nombre y apellidos del titular de la cuenta': payload.nombreTitular ?? '',
      'Nombre del banco': payload.nombreBanco ?? '',
      Prefijo: payload.prefijo ?? '',
      'Número de teléfono': payload.telefono ?? '',
      'Fecha de nacimiento': payload.fechaNacimiento ?? '',
      nombre: payload.nombre ?? '',
      Apellidos: payload.apellidos ?? '',
      Dirección: payload.direccion ?? '',
      Ciudad: payload.ciudad ?? '',
      CP: payload.cp ?? '',
      isBusiness: payload.businessType === 'empresa',
      DNIF: {
        DNIF: {
          url: payload.dnifUrl ?? '',
        },
      },
      DNIB: {
        DNIB: {
          url: payload.dnibUrl ?? '',
        },
      },
    };

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: id,
          email: payload.email ?? '',
          business: payload.businessType === 'empresa',
          nuevoPartner,
        }),
      });
      if (!response.ok) return '';
      const responseData = (await response.json()) as { accountId?: string };
      return responseData.accountId ?? '';
    } catch {
      return '';
    }
  };

  const assignFromSource = async (sourceId: string) => {
    const source = availableSources.find((item) => item.id === sourceId);
    if (!source) return;
    const payload: RestauranteFiscalForm = {
      businessType: source.isBusiness ? 'empresa' : 'autonomo',
      email: source.email,
      nombre: source.nombre,
      apellidos: source.apellidos,
      prefijo: source.prefijo,
      telefono: source.telefono,
      fechaNacimiento: source.fechaNacimiento,
      direccion: source.direccion,
      ciudad: source.ciudad,
      cp: source.cp,
      razonSocial: source.razonSocial,
      nif: source.nif,
      direccionFiscal: source.direccionFiscal,
      codigoPostalNegocio: source.codigoPostalNegocio,
      ciudadNegocio: source.ciudadNegocio,
      provinciaNegocio: source.provinciaNegocio,
      telefonoNegocio: source.telefonoNegocio,
      numeroCuenta: source.numeroCuenta,
      nombreTitular: source.nombreTitular,
      nombreBanco: source.nombreBanco,
      contrato: source.contrato,
      stripeAccountId: source.stripeAccountId,
    };
    setIsSaving(true);
    await RestauranteDetalleService.updateDatosFiscales(id, payload);
    form.reset(payload);
    setIsSaving(false);
    router.push(`/restaurantes/${id}?fiscalAssigned=1`);
  };

  const renderContractPdf = async (values: RestauranteFiscalForm) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const left = 15;
    const right = 195;
    const topMargin = 25;
    const bottomMargin = 25;
    let y = topMargin;
    const lineHeight = 6.5;

    const blocks = getContractBlocks(values);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);

    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    const headerText = 'ACUERDO KOMVO';
    const dateText = new Date().toLocaleDateString('es-ES');
    pdf.text(headerText, left, y - 8);
    pdf.text(dateText, right - pdf.getTextWidth(dateText), y - 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);

    const addLine = (text: string, bold?: boolean) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, right - left);
      for (const line of lines) {
        if (y > 297 - bottomMargin) {
          pdf.addPage();
          y = topMargin;
        }
        pdf.text(line, left, y);
        y += lineHeight;
      }
      // espacio extra entre párrafos y mayor tras títulos
      y += bold ? 4 : 2;
    };

    blocks.forEach((block) => addLine(block.text, block.bold));

    y += 10;
    const columnGap = 12;
    const columnWidth = (right - left - columnGap) / 2;
    const leftColX = left;
    const rightColX = left + columnWidth + columnGap;
    let colY = y;

    const drawSignatureBlock = (
      x: number,
      title: string,
      name: string,
      withSignature: boolean,
      signatureOverride?: string
    ) => {
      let localY = colY;
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, x, localY);
      pdf.setFont('helvetica', 'normal');
      localY += lineHeight + 1;
      const nameLines = pdf.splitTextToSize(`Nombre: ${name}`, columnWidth - 2);
      nameLines.forEach((line: string) => {
        pdf.text(line, x, localY);
        localY += lineHeight;
      });

      const signatureBoxHeight = 22;
      const signatureGap = 6;
      const lineY = localY + signatureGap + signatureBoxHeight;

      if (lineY + 10 > 297 - bottomMargin) {
        pdf.addPage();
        colY = topMargin + 10;
        localY = colY;
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, x, localY);
        pdf.setFont('helvetica', 'normal');
        localY += lineHeight + 1;
        nameLines.forEach((line: string) => {
          pdf.text(line, x, localY);
          localY += lineHeight;
        });
      }

      const signatureToUse = signatureOverride || (withSignature ? signatureDataUrl : '');
      if (signatureToUse) {
        const ratio = signatureOverride ? komvoSignatureAspect : signatureAspect || 1;
        let sigWidth = Math.min(columnWidth - 4, signatureBoxHeight * ratio);
        let sigHeight = sigWidth / ratio;
        if (sigHeight > signatureBoxHeight) {
          sigHeight = signatureBoxHeight;
          sigWidth = sigHeight * ratio;
        }
        const sigX = x + (columnWidth - sigWidth) / 2;
        const sigY = localY + signatureGap + (signatureBoxHeight - sigHeight) / 2;
        pdf.addImage(signatureToUse, 'PNG', sigX, sigY, sigWidth, sigHeight);
      }

      const finalLineY = localY + signatureGap + signatureBoxHeight;
      pdf.line(x, finalLineY, x + columnWidth - 2, finalLineY);
      pdf.text('Firma', x, finalLineY + 6);
    };

    drawSignatureBlock(leftColX, 'Por Komvo', 'Francisco Javier Latasa Perez-Santana', false, komvoSignatureDataUrl);
    drawSignatureBlock(
      rightColX,
      `Por ${values.razonSocial || 'Restaurante'}`,
      `${values.nombre} ${values.apellidos}`,
      true
    );

    return pdf;
  };

  const uploadContract = async (values: RestauranteFiscalForm) => {
    const pdf = await renderContractPdf(values);
    if (!pdf) return '';
    const blob = pdf.output('blob');
    const path = `restaurants/${id}/contratos/contrato_${Date.now()}.pdf`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, { contentType: 'application/pdf' });
    return getDownloadURL(fileRef);
  };

  const performSave = async (values: RestauranteFiscalForm) => {
    if (!dniFront || !dniBack) {
      setDniError('Sube ambos documentos del DNI (frontal y reverso).');
      return;
    }
    setDniError('');
    setIsSaving(true);
    setIsProcessing(true);
    setProcessingStep(1);
    const { dnifUrl, dnibUrl } = await RestauranteDetalleService.uploadDni(id, { front: dniFront, back: dniBack });
    setProcessingStep(2);
    const contractUrl = await uploadContract(values);
    const stripeAccountId = await createStripeAccount({ ...values, dnifUrl, dnibUrl });
    setProcessingStep(3);
    const payload = { ...values, contrato: contractUrl, stripeAccountId };
    await RestauranteDetalleService.updateDatosFiscales(id, payload);
    setProcessingStep(4);
    setIsSaving(false);
    setIsProcessing(false);
    router.push(`/restaurantes/${id}`);
  };

  const onSubmit = async (values: RestauranteFiscalForm) => {
    if (data?.stripeAccountId) return;
    if (!dniFront || !dniBack) {
      setDniError('Sube ambos documentos del DNI (frontal y reverso).');
      return;
    }
    setDniError('');
    setPendingValues(values);
    setAcceptedContract(false);
    signatureRef.current?.clear();
    setSignatureDataUrl('');
    setShowContract(true);
  };

  const getContractBlocks = (values: RestauranteFiscalForm) => {
    const nombreEstablecimiento = values.razonSocial || '[NOMBRE DEL ESTABLECIMIENTO]';
    const cifNif = values.nif || '[●]';
    const domicilio = values.direccionFiscal
      ? `${values.direccionFiscal}, ${values.codigoPostalNegocio} ${values.ciudadNegocio}, ${values.provinciaNegocio}`
      : '[●]';

    const lines: { text: string; bold?: boolean }[] = [
      { text: 'CONTRATO DE COLABORACIÓN', bold: true },
      { text: 'Entre' },
      { text: 'KOMVO VENTURES, S.L., con NIF B16496242 y domicilio en Paseo de la Castellana 121, Planta 4, Puerta A, 28046, Madrid (en adelante, “Komvo”),', bold: true },
      { text: 'y' },
      { text: `${nombreEstablecimiento}, con CIF/NIF ${cifNif} y domicilio en ${domicilio} (en adelante, el “Establecimiento”),`, bold: true },
      { text: 'ambas partes, reconociéndose capacidad legal suficiente, acuerdan formalizar el presente Contrato de Colaboración (el “Contrato”), que se regirá por las siguientes estipulaciones.' },
      { text: '1. Objeto y marco de la colaboración', bold: true },
      { text: 'El presente Contrato regula la incorporación del Establecimiento a la plataforma tecnológica “Komvo”, concebida como canal digital para la captación, gestión y formalización de planes de grupo en establecimientos de restauración y ocio.' },
      { text: 'La finalidad principal de la relación es la participación del Establecimiento en el modelo Marketplace de Komvo, en virtud del cual la Plataforma actúa como canal de ventas adicional, facilitando la captación de nuevos clientes y la gestión de reservas y pagos realizados por los usuarios a través de su entorno digital.' },
      { text: 'Como consecuencia de su alta en la Plataforma, el Establecimiento dispondrá de acceso a un entorno de gestión propio (dashboard), al que accederá mediante sus credenciales y desde el cual podrá administrar íntegramente la operativa vinculada a las reservas generadas en el Marketplace. Dicho entorno le permitirá, entre otras funciones, aceptar o rechazar solicitudes, gestionar disponibilidad y calendario, comunicarse con los usuarios a través del sistema de mensajería integrado, realizar el seguimiento de los planes confirmados y visualizar y retirar los fondos acumulados en su wallet conforme a lo previsto en este Contrato.' },
      { text: 'El mismo entorno de gestión podrá ser utilizado por el Establecimiento para administrar sus propios grupos generados directamente a través de sus canales digitales, bajo el denominado modelo SaaS o Embebido. Esta utilización no constituye un servicio autónomo ni altera la naturaleza principal del presente acuerdo, sino que forma parte del acceso ordinario al software por el mero hecho de estar dado de alta en Komvo. Su uso será voluntario para el Establecimiento y se regirá por el régimen económico específico previsto más adelante.' },
      { text: 'En todo caso, Komvo actúa exclusivamente como proveedor de infraestructura tecnológica y, cuando proceda, como intermediario digital. El servicio contratado por los usuarios será prestado única y exclusivamente por el Establecimiento bajo su entera responsabilidad.' },
      { text: '2. Régimen económico', bold: true },
      { text: '2.1 Modelo Marketplace', bold: true },
      { text: 'En el marco del modelo Marketplace, Komvo percibirá por su labor de intermediación una comisión equivalente al diez por ciento (10%) del importe total efectivamente cobrado en cada transacción gestionada a través de la Plataforma.' },
      { text: 'El precio mostrado al usuario tendrá carácter final y no incluirá recargo alguno aplicado por Komvo en este modelo.' },
      { text: 'El Establecimiento se obliga a mantener en la Plataforma condiciones económicas no superiores a las ofrecidas en su propio local, en su página web oficial o en cualesquiera otros canales propios o de terceros. Esta obligación responde a la coherencia comercial inherente a la utilización de la Plataforma como canal de ventas adicional. El incumplimiento reiterado de dicha obligación facultará a Komvo para suspender o resolver el presente Contrato.' },
      { text: '2.2 Utilización del dashboard para grupos propios (modelo SaaS)', bold: true },
      { text: 'Cuando el Establecimiento utilice el entorno de gestión para administrar reservas o grupos generados directamente por sus propios canales, no se aplicará comisión alguna a favor de Komvo sobre las ventas así gestionadas.' },
      { text: 'No obstante, cuando se utilice la infraestructura de pagos integrada en la Plataforma, se aplicará al usuario final un cargo por costes de procesamiento equivalente al tres por ciento (3%) del importe de la transacción más veinticinco céntimos de euro (0,25 €), circunstancia que será informada con carácter previo a la confirmación del pago.' },
      { text: 'La utilización de esta operativa SaaS no modifica ni condiciona la vigencia del modelo Marketplace, que constituye el núcleo económico del presente Contrato.' },
      { text: '3. Sistema de pagos, wallet y liquidaciones', bold: true },
      { text: 'Todos los pagos realizados por los usuarios, tanto en el modelo Marketplace como en la gestión de grupos propios, se procesarán exclusivamente a través de la pasarela integrada en la Plataforma, operada por Stripe como proveedor independiente de servicios de pago mediante el sistema Stripe Connect.' },
      { text: 'Para poder operar y recibir pagos, el Establecimiento deberá facilitar la información fiscal y bancaria requerida y completar el proceso de verificación exigido por el proveedor de pagos conforme a la normativa aplicable. En tanto no se encuentre debidamente creada y validada la correspondiente cuenta conectada, no podrá activar planes con pago anticipado ni percibir importes a través de la Plataforma.' },
      { text: 'En el modelo Marketplace, la comisión correspondiente a Komvo se retendrá automáticamente en el momento del procesamiento del pago. En el uso del dashboard para grupos propios, no se practicará retención alguna en concepto de comisión.' },
      { text: 'Los importes correspondientes al Establecimiento se asignarán a su wallet o saldo virtual dentro de la Plataforma. Los fondos vinculados a cada plan estarán disponibles para su retirada a partir de la finalización efectiva del evento o servicio contratado. Desde ese momento, el Establecimiento podrá ordenar la transferencia del saldo disponible a su cuenta bancaria vinculada cuando lo estime oportuno.' },
      { text: 'Komvo podrá retener temporalmente fondos cuando existan reclamaciones abiertas, disputas de pago, indicios razonables de fraude o incidencias que pudieran dar lugar a devolución.' },
      { text: '4. Operativa y obligaciones del Establecimiento', bold: true },
      { text: 'El Establecimiento se compromete a mantener actualizada su disponibilidad, condiciones económicas y políticas aplicables, incluyendo cancelaciones, no presentación, anticipos o fianzas.' },
      { text: 'Una vez confirmada una reserva, deberá respetar las condiciones comunicadas al usuario y abstenerse de modificar unilateralmente los elementos esenciales del servicio.' },
      { text: '5. Incumplimientos sustanciales', bold: true },
      { text: 'Se considerará incumplimiento grave, a efectos operativos, la cancelación injustificada de un plan confirmado, la denegación de acceso al grupo en la fecha acordada, la negativa a reconocer una reserva válida o cualquier actuación que frustre de manera sustancial la ejecución del plan contratado por el usuario.' },
      { text: 'En tales supuestos, el usuario tendrá derecho al reintegro íntegro de las cantidades abonadas. Komvo podrá ejecutar dicho reembolso con cargo a los importes correspondientes al Establecimiento, quien deberá reintegrar cualquier diferencia en un plazo máximo de siete (7) días naturales.' },
      { text: '6. Responsabilidad', bold: true },
      { text: 'El Establecimiento será el único responsable frente a los usuarios de la correcta prestación del servicio, incluyendo la calidad del mismo, el cumplimiento normativo, la seguridad alimentaria, la gestión de alérgenos y la atención in situ.' },
      { text: 'El Establecimiento mantendrá indemne a Komvo frente a cualesquiera reclamaciones, daños o sanciones que traigan causa directa de su actuación.' },
      { text: '7. Protección de datos', bold: true },
      { text: 'En el modelo Marketplace, cada parte actuará como responsable independiente respecto de los tratamientos derivados de su propia actividad.' },
      { text: 'Cuando el Establecimiento utilice el dashboard para la gestión de grupos propios bajo modalidad SaaS o Embebida, actuará como responsable del tratamiento y Komvo como encargado, formalizándose el correspondiente acuerdo de encargo conforme al Reglamento (UE) 2016/679.' },
      { text: '8. Duración y resolución', bold: true },
      { text: 'El presente Contrato tendrá duración indefinida.' },
      { text: 'Cualquiera de las partes podrá resolverlo mediante preaviso escrito con una antelación mínima de treinta (30) días.' },
      { text: 'Komvo podrá resolver de forma inmediata en caso de incumplimiento grave o reiterado, fraude o actuaciones que perjudiquen sustancialmente a los usuarios o a la reputación de la Plataforma.' },
      { text: '9. Legislación y jurisdicción', bold: true },
      { text: 'El presente Contrato se regirá por la legislación española. Para cuantas controversias pudieran derivarse de su interpretación o ejecución, las partes se someten a los Juzgados y Tribunales de Madrid capital.' },
    ];
    return lines.map((line) => (typeof line === 'string' ? { text: line } : line));
  };

  const handleDownloadContract = async () => {
    if (!pendingValues) return;
    const pdf = await renderContractPdf(pendingValues);
    if (!pdf) return;
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'acuerdo-komvo.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <Dialog open={isProcessing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurando tu cuenta de pagos</DialogTitle>
            <DialogDescription>
              Este proceso puede tardar unos minutos. No cierres esta ventana.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600">
            <div
              className={`rounded-xl border px-3 py-2 ${
                processingStep >= 1 ? 'border-[#7472fd]/30 bg-[#7472fd]/10 text-slate-900' : 'border-slate-200 bg-slate-50'
              }`}
            >
              1. Validando datos fiscales y personales.
            </div>
            <div
              className={`rounded-xl border px-3 py-2 ${
                processingStep >= 2 ? 'border-[#7472fd]/30 bg-[#7472fd]/10 text-slate-900' : 'border-slate-200 bg-slate-50'
              }`}
            >
              2. Enviando documentos de identidad a Stripe.
            </div>
            <div
              className={`rounded-xl border px-3 py-2 ${
                processingStep >= 3 ? 'border-[#7472fd]/30 bg-[#7472fd]/10 text-slate-900' : 'border-slate-200 bg-slate-50'
              }`}
            >
              3. Creando la cuenta de cobros y la cuenta bancaria.
            </div>
            <div
              className={`rounded-xl border px-3 py-2 ${
                processingStep >= 4 ? 'border-[#7472fd]/30 bg-[#7472fd]/10 text-slate-900' : 'border-slate-200 bg-slate-50'
              }`}
            >
              4. Guardando la configuración del local.
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showContract} onOpenChange={setShowContract}>
        <DialogContent className="max-h-[90vh] w-[90vw] max-w-[90vw] sm:max-w-[90vw] overflow-y-auto p-0">
          <div className="px-4 py-6">
          <DialogHeader>
            <DialogTitle>Contrato de colaboración Komvo</DialogTitle>
            <DialogDescription>
              Para continuar, debes leer y firmar este acuerdo. Sin firma no podremos configurar los pagos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-1">
            <div
              ref={contractRef}
              className="w-full max-w-none rounded-xl px-16 py-12 text-[18px] leading-8 shadow-lg"
              style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
            >
                <div className="mb-10 flex items-center justify-between text-[12px] uppercase tracking-[0.26em]" style={{ color: '#94a3b8' }}>
                  <span>Acuerdo Komvo</span>
                  <span>{new Date().toLocaleDateString('es-ES')}</span>
                </div>
                <div className="space-y-2">
                  {(pendingValues ? getContractBlocks(pendingValues) : [{ text: 'Cargando contrato...' }]).map(
                    (block, index) => (
                      <p
                        key={`contract-line-${index}`}
                        className={block.bold ? 'font-semibold' : 'font-normal'}
                        style={{ color: '#1f2937' }}
                      >
                        {block.text}
                      </p>
                    )
                  )}
                </div>
                <div className="mt-12 grid gap-10 text-[15px] lg:grid-cols-2" style={{ color: '#334155' }}>
                  <div className="rounded-lg p-5">
                    <p className="font-semibold" style={{ color: '#0f172a' }}>Por Komvo</p>
                    <p className="mt-2">Nombre: Francisco Javier Latasa Perez-Santana</p>
                    <div className="mt-8 flex h-24 items-center justify-center" style={{ borderBottom: '1px solid #cbd5f5' }}>
                      <img
                        src="/firma/firma-latasa.png"
                        alt="Firma Francisco Javier Latasa Perez-Santana"
                        className="h-20 w-auto object-contain"
                      />
                    </div>
                    <p className="mt-2" style={{ color: '#64748b' }}>Firma</p>
                  </div>
                  <div className="rounded-lg p-5">
                    <p className="font-semibold" style={{ color: '#0f172a' }}>
                      Por {pendingValues?.razonSocial || 'Restaurante'}
                    </p>
                    <p className="mt-2">
                      Nombre: {pendingValues?.nombre || ''} {pendingValues?.apellidos || ''}
                    </p>
                    <div className="mt-6 flex min-h-[110px] items-center justify-center" style={{ borderBottom: '1px solid #cbd5f5' }}>
                      {signatureDataUrl ? (
                        <img src={signatureDataUrl} alt="Firma" className="h-20 object-contain" />
                      ) : (
                        <span className="text-[13px]" style={{ color: '#94a3b8' }}>Firma pendiente</span>
                      )}
                    </div>
                    <p className="mt-2" style={{ color: '#64748b' }}>Firma</p>
                  </div>
                </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Firma del representante</p>
                <p className="text-xs text-slate-500">Dibuja tu firma a mano alzada.</p>
                <div className="mt-3 inline-flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-2">
                  <SignatureCanvas
                    ref={signatureRef}
                    penColor="#1f2937"
                    canvasProps={{ width: 520, height: 200, className: 'rounded-lg bg-white' }}
                    onEnd={() => {
                      if (signatureRef.current && !signatureRef.current.isEmpty()) {
                        const canvas = signatureRef.current.getCanvas();
                        setSignatureAspect(canvas.width / canvas.height || 1);
                        setSignatureDataUrl(signatureRef.current.toDataURL('image/png'));
                      }
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    onClick={() => {
                      signatureRef.current?.clear();
                      setSignatureDataUrl('');
                    }}
                  >
                    Borrar firma
                  </button>
                  <button
                    type="button"
                    className={`text-xs font-semibold ${
                      signatureDataUrl ? 'text-[#3b3af2] hover:text-[#2f2edb]' : 'text-slate-300 cursor-not-allowed'
                    }`}
                    onClick={handleDownloadContract}
                    disabled={!signatureDataUrl}
                  >
                    Descargar contrato
                  </button>
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#7472fd]"
                  checked={acceptedContract}
                  onChange={(event) => setAcceptedContract(event.target.checked)}
                />
                <span>
                  He leído y acepto el contrato. Declaro que estos datos son correctos y que tengo autorización para
                  firmar en nombre del restaurante.
                </span>
              </label>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowContract(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
                  disabled={
                    !pendingValues ||
                    !acceptedContract ||
                    !signatureRef.current ||
                    signatureRef.current.isEmpty()
                  }
                  onClick={async () => {
                    if (!pendingValues) return;
                    setShowContract(false);
                    await performSave(pendingValues);
                  }}
                >
                  Firmar y continuar
                </Button>
              </div>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(confirmSource)} onOpenChange={() => setConfirmSource(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar datos fiscales</DialogTitle>
            <DialogDescription>
              Solo asigna estos datos si TODOS los datos personales, fiscales y bancarios coinciden exactamente con
              este local. Si algún dato no coincide, tendrás que rellenarlos desde cero.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-600">
            <p>Esto afecta a datos personales, fiscales y bancarios.</p>
            <p>
              Una vez asignados, para cualquier cambio tendrás que contactar con{' '}
              <strong>contacto@komvoapp.com</strong> y recrear la cuenta Stripe desde cero.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmSource(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
              onClick={async () => {
                if (confirmSource) {
                  await assignFromSource(confirmSource);
                }
                setConfirmSource(null);
              }}
            >
              Confirmar asignación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {stripeLocked && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-900">
              Los datos fiscales de este local ya están asignados y están bloqueados. Para editarlos debes contactar con
              el equipo de Komvo en <strong>contacto@komvoapp.com</strong> para gestionar los cambios necesarios.
            </CardContent>
          </Card>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Restaurante</p>
            <h1 className="text-2xl font-semibold text-slate-900">Datos fiscales y pagos</h1>
          </div>
          <Button variant="outline" onClick={() => router.push(`/restaurantes/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        {availableSources.length > 0 && !stripeLocked && (
          <Card className="border-slate-200 bg-white">
            <CardContent className="space-y-3 p-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Configuración detectada</p>
              <p>
                Detectamos datos fiscales ya validados. Solo puedes asignarlos si TODOS los datos personales, fiscales y
                bancarios coinciden exactamente con este local. Si algún dato cambia, deberás rellenar todo desde cero.
              </p>
              <p>
                Una vez asignados, los datos quedarán bloqueados. Para cambios posteriores tendrás que contactar con
                <strong> contacto@komvoapp.com</strong> y recrear la cuenta Stripe.
              </p>
              <div className="grid gap-2">
                {availableSources.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="space-y-1 text-xs text-slate-500">
                      <p className="font-semibold text-slate-900">
                        {item.nombreRestaurante}
                        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-600">
                          {item.id === 'partner' ? 'Partner' : 'Restaurante'}
                        </span>
                      </p>
                      {item.assignedRestaurantes && item.assignedRestaurantes.length > 0 && (
                        <p className="text-[11px] text-slate-500">
                          Asignado en: {item.assignedRestaurantes.join(', ')}
                        </p>
                      )}
                      <div className="grid gap-3 text-xs text-slate-600 lg:grid-cols-3">
                        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Datos personales
                          </p>
                          <p>
                            <span className="font-semibold">Nombre:</span> {item.nombre || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">Apellidos:</span> {item.apellidos || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">Email:</span> {item.email || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">Teléfono:</span>{' '}
                            {(item.prefijo || '') + ' ' + (item.telefono || '') || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">Fecha nac.:</span> {item.fechaNacimiento || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">Dirección:</span>{' '}
                            {item.direccion || 'Pendiente'}, {item.ciudad || 'Pendiente'} {item.cp || ''}
                          </p>
                        </div>
                        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Datos fiscales
                          </p>
                          <p>
                            <span className="font-semibold">Razón social:</span> {item.razonSocial || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">NIF:</span> {item.nif || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">Dirección fiscal:</span>{' '}
                            {item.direccionFiscal || 'Pendiente'}, {item.ciudadNegocio || 'Pendiente'}{' '}
                            {item.codigoPostalNegocio || ''}
                          </p>
                          <p>
                            <span className="font-semibold">Provincia:</span> {item.provinciaNegocio || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">Teléfono negocio:</span>{' '}
                            {item.telefonoNegocio || 'Pendiente'}
                          </p>
                        </div>
                        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Datos bancarios
                          </p>
                          <p>
                            <span className="font-semibold">Titular:</span> {item.nombreTitular || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">Banco:</span> {item.nombreBanco || 'Pendiente'}
                          </p>
                          <p>
                            <span className="font-semibold">Cuenta:</span> {item.numeroCuenta || 'Pendiente'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setConfirmSource(item.id)} disabled={isSaving}>
                      Asignar datos
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-6">
            {isLoading ? (
              <p className="text-sm text-slate-500">Cargando datos...</p>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Tipo de cuenta</p>
                    <p className="text-xs text-slate-500">Define si el local es autónomo o empresa.</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <FormControl>
                          <select
                            value={field.value}
                            onChange={(event) => field.onChange(event.target.value)}
                            disabled={stripeLocked}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                          >
                            <option value="autonomo">Autónomo</option>
                            <option value="empresa">Empresa</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Datos personales</p>
                    <p className="text-xs text-slate-500">Persona responsable del local en pagos y validaciones fiscales.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="nombre" render={({ field }) => (
                      <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="apellidos" render={({ field }) => (
                      <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="prefijo" render={({ field }) => (
                      <FormItem><FormLabel>Prefijo</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="telefono" render={({ field }) => (
                      <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="fechaNacimiento" render={({ field }) => (
                      <FormItem><FormLabel>Fecha de nacimiento</FormLabel><FormControl><Input {...field} type="date" disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="direccion" render={({ field }) => (
                      <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="ciudad" render={({ field }) => (
                      <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="cp" render={({ field }) => (
                      <FormItem><FormLabel>Código postal</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Documentos de identidad</p>
                    <p className="text-xs text-slate-500">
                      Sube el DNI de la persona responsable para completar la validación fiscal.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                        <label className="text-xs font-semibold text-slate-500">DNI frontal</label>
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(event) => setDniFront(event.target.files?.[0] ?? null)}
                          disabled={stripeLocked}
                        />
                        {dniFront ? (
                          <p className="text-xs text-slate-500">{dniFront.name}</p>
                        ) : (
                          <p className="text-xs text-slate-400">Sube el frontal del DNI.</p>
                        )}
                      </div>
                      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                        <label className="text-xs font-semibold text-slate-500">DNI reverso</label>
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(event) => setDniBack(event.target.files?.[0] ?? null)}
                          disabled={stripeLocked}
                        />
                        {dniBack ? (
                          <p className="text-xs text-slate-500">{dniBack.name}</p>
                        ) : (
                          <p className="text-xs text-slate-400">Sube el reverso del DNI.</p>
                        )}
                      </div>
                    </div>
                    {dniError ? <p className="mt-2 text-xs font-medium text-rose-600">{dniError}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Datos fiscales</p>
                    <p className="text-xs text-slate-500">Datos legales del local para emitir cobros.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="razonSocial" render={({ field }) => (
                      <FormItem><FormLabel>Razón social</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="nif" render={({ field }) => (
                      <FormItem><FormLabel>CIF/NIF</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="direccionFiscal" render={({ field }) => (
                      <FormItem><FormLabel>Dirección fiscal</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="codigoPostalNegocio" render={({ field }) => (
                      <FormItem><FormLabel>CP del negocio</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="ciudadNegocio" render={({ field }) => (
                      <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="provinciaNegocio" render={({ field }) => (
                      <FormItem><FormLabel>Provincia</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="telefonoNegocio" render={({ field }) => (
                      <FormItem><FormLabel>Teléfono del negocio</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Datos bancarios</p>
                    <p className="text-xs text-slate-500">Cuenta donde se ingresarán los pagos del marketplace.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="numeroCuenta" render={({ field }) => (
                      <FormItem><FormLabel>Número de cuenta</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="nombreTitular" render={({ field }) => (
                      <FormItem><FormLabel>Titular de la cuenta</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="nombreBanco" render={({ field }) => (
                      <FormItem><FormLabel>Banco</FormLabel><FormControl><Input {...field} disabled={stripeLocked} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/restaurantes/${id}`)}
                      disabled={stripeLocked}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSaving || stripeLocked} className="bg-[#7472fd] text-white">
                      {isSaving ? 'Guardando...' : 'Guardar datos'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
