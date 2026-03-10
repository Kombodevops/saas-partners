'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { registerSchema, type RegisterFormData } from '@/lib/validators/register.validator';
import { AuthService } from '@/lib/services/auth.service';
import { buildRegisterAdminEmail, buildRegisterPartnerEmail } from '@/lib/emails/register';

const SECTION_CLASSES = 'space-y-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm';
const MAIL_ENDPOINT = process.env.NEXT_PUBLIC_SEND_MAIL_URL ?? '';
const KOMVO_EMAIL = process.env.NEXT_PUBLIC_KOMVO_EMAIL ?? '';

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessType: 'autonomo',
      nombre: '',
      apellidos: '',
      email: '',
      prefijo: '+34',
      telefono: '',
      fechaNacimiento: '',
      direccion: '',
      ciudad: '',
      cp: '',
      nombreNegocio: '',
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
      password: '',
      confirmPassword: '',
    },
  });

  const showNombreNegocio = true;

  const businessHint = useMemo(() => {
    return 'Persona responsable de la cuenta de Komvo.';
  }, []);

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitError('');
    setIsLoading(true);
    try {
      await AuthService.signUp(data, undefined, { createStripe: false });
      if (MAIL_ENDPOINT && KOMVO_EMAIL) {
        const logoUrl = process.env.NEXT_PUBLIC_WEB_URL
          ? `${process.env.NEXT_PUBLIC_WEB_URL}/komvo/logotipo-black.png`
          : undefined;
        const adminEmail = buildRegisterAdminEmail(data, logoUrl);
        await fetch(MAIL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: KOMVO_EMAIL,
            subject: adminEmail.subject,
            htmlContent: adminEmail.htmlContent,
          }),
        });

        const partnerEmail = buildRegisterPartnerEmail(logoUrl);
        await fetch(MAIL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: data.email,
            subject: partnerEmail.subject,
            htmlContent: partnerEmail.htmlContent,
          }),
        });
      }
      setShowSuccess(true);
    } catch (error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'auth/email-already-in-use') {
        setSubmitError('Este email ya está registrado.');
      } else if (errorCode === 'auth/invalid-email') {
        setSubmitError('El email no es válido.');
      } else if (errorCode === 'auth/weak-password') {
        setSubmitError('La contraseña es demasiado débil.');
      } else {
        setSubmitError('No se pudo crear la cuenta. Inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Dialog
        open={showSuccess}
        onOpenChange={(open) => {
          setShowSuccess(open);
          if (!open) {
            router.push('/login');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitud recibida</DialogTitle>
            <DialogDescription>
              Hemos recibido tu registro en Komvo Partners. En breve te contactaremos por el móvil o correo
              proporcionado para validar la cuenta y darte acceso a la plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600">
              <p>Muy pronto podrás empezar a atraer grupos a tus locales desde el marketplace y gestionar todo desde Komvo.</p>
            <p>Gracias por confiar en nosotros. Te escribimos en cuanto esté todo listo.</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowSuccess(false)}>
              Cerrar
            </Button>
            <Button type="button" className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]" onClick={() => router.push('/login')}>
              Ir al login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
        <div className="mb-8 space-y-6">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Registro de partners</p>
              <h1 className="text-3xl font-semibold text-slate-900">Crea tu cuenta en Komvo</h1>
              <p className="max-w-2xl text-sm text-slate-500">
                Completa los datos de acceso y contacto para empezar a usar Komvo Partners.
              </p>
            </div>
          </div>
          <Card className="border-slate-100 bg-[#10102f] text-white">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <h3 className="text-base font-semibold">¿Ya tienes cuenta?</h3>
                <p className="text-sm text-white/70">Accede con tu usuario y continúa configurando tu restaurante.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="bg-[#e2ff00] text-slate-900 hover:bg-[#d7f200]"
                onClick={() => router.push('/login')}
              >
                Iniciar sesión
              </Button>
            </CardContent>
          </Card>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid items-stretch gap-6">
              <div className="space-y-6">
                <section className={SECTION_CLASSES}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-900">
                          <User className="h-5 w-5 text-[#7472fd]" />
                          <h2 className="text-lg font-semibold">Información de la cuenta de Komvo</h2>
                        </div>
                        <p className="text-xs text-slate-500">
                          El email y la contraseña serán los datos de acceso y el email de contacto en Komvo Partners.
                        </p>
                      </div>
                  </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="nombre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nombre" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="apellidos"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apellidos</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Apellidos" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email de contacto</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="tu@email.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="telefono"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <FormField
                                  control={form.control}
                                  name="prefijo"
                                  render={({ field: prefixField }) => (
                                    <Input {...prefixField} className="w-20" />
                                  )}
                                />
                                <Input {...field} placeholder="Número de teléfono" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar contraseña</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="space-y-1 text-sm text-slate-500">
                <p>Al continuar aceptas los términos y la política de privacidad de Komvo.</p>
                <p>Te contactaremos por móvil o correo con el acceso a la plataforma.</p>
                {submitError ? <p className="text-xs font-medium text-red-500">{submitError}</p> : null}
              </div>
              <Button
                type="submit"
                className="h-11 gap-2 bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Siguiente'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
