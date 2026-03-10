'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AuthService } from '@/lib/services/auth.service';
import { loginSchema, LoginFormData } from '@/lib/validators/login.validator';
import { Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    </div>
  );
}
