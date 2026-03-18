'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AuthService } from '@/lib/services/auth.service';
import { loginSchema, LoginFormData } from '@/lib/validators/login.validator';
import { Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });


  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AuthService.signIn(data.email, data.password);
      
      // Login exitoso, redirigir al dashboard
      console.log('Login exitoso:', result.partner.nombreNegocio);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Error en login:', err);
      setError('Usuario y/o contraseña incorrectos');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    const email = resetEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setResetError('Introduce un correo electrónico.');
      setResetLoading(false);
      return;
    }
    if (!emailRegex.test(email)) {
      setResetError('Formato de email inválido.');
      setResetLoading(false);
      return;
    }

    try {
      const endpoint = process.env.NEXT_PUBLIC_SEND_RESET_PASSWORD;
      if (!endpoint) {
        throw new Error('No se ha configurado NEXT_PUBLIC_SEND_RESET_PASSWORD.');
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResetError(payload?.error || 'No se pudo enviar el correo de recuperación.');
        return;
      }
      setResetSuccess('Te hemos enviado un correo para cambiar la contraseña.');
    } catch (err) {
      console.error('Error enviando reset password', err);
      setResetError('No se pudo enviar el correo de recuperación.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 500px at 15% 10%, rgba(116, 114, 253, 0.18), transparent 70%), radial-gradient(700px 400px at 85% 20%, rgba(226, 255, 0, 0.2), transparent 60%)',
        }}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full">
          <Card className="rounded-[32px] border-slate-200/80 bg-white/95 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader className="space-y-2 text-left">
              <CardTitle className="text-2xl font-semibold text-slate-900">
                Inicia sesión en Komvo
              </CardTitle>
              <CardDescription className="text-sm text-slate-600">
                Accede con tu correo y continúa gestionando reservas y operaciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="tu@email.com"
                            {...field}
                            disabled={isLoading}
                            className="h-11 border-slate-200 bg-white/90"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Contraseña</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="•••••••"
                            {...field}
                            disabled={isLoading}
                            className="h-11 border-slate-200 bg-white/90"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full text-base shadow-[0_12px_30px_-15px_rgba(116,114,253,0.8)]"
                    style={{
                      backgroundColor: 'rgba(116, 114, 253, 1)',
                      borderColor: 'rgba(116, 114, 253, 1)',
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Iniciar sesión
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    className="w-full text-left text-sm font-medium text-slate-600 underline transition-colors hover:text-slate-900"
                    onClick={() => {
                      setResetOpen(true);
                      setResetEmail(form.getValues('email') || '');
                      setResetError(null);
                      setResetSuccess(null);
                    }}
                    disabled={isLoading}
                  >
                    He olvidado mi contraseña
                  </button>
                </form>
              </Form>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>¿No tienes una cuenta?</span>
                <button
                  onClick={() => router.push('/register')}
                  className="font-medium transition-colors"
                  style={{ color: 'rgba(116, 114, 253, 1)' }}
                >
                  Regístrate aquí
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={resetOpen}
        onOpenChange={(nextOpen) => {
          setResetOpen(nextOpen);
          if (!nextOpen) {
            setResetEmail('');
            setResetError(null);
            setResetSuccess(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">
                Te enviaremos un correo con el enlace para restablecer tu contraseña.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Correo electrónico</label>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                disabled={resetLoading}
                className="h-11 border-slate-200 bg-white/90"
              />
            </div>
            {resetError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {resetSuccess}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetLoading}>
                Cancelar
              </Button>
              <Button
                className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
                onClick={handlePasswordReset}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar correo'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
