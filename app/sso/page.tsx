'use client';

import { signInWithCustomToken } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { auth } from '@/lib/firebase';
import { AuthService } from '@/lib/services/auth.service';

type Status =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'success' };

function safeRedirectPath(input: string | null | undefined): string {
  const value = (input ?? '').trim();
  if (!value) return '/dashboard';
  if (!value.startsWith('/')) return '/dashboard';
  return value;
}

function getHashParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

function clearSsoCaches() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('komvo_restaurantes_cache');
    sessionStorage.removeItem('komvo_partner_id');
    sessionStorage.removeItem('komvo_worker_id');
  } catch {
    // ignore
  }
}

export default function SsoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: 'loading' });

  const exchangeUrl = useMemo(() => {
    return (process.env.NEXT_PUBLIC_PARTNER_IMPERSONATION_EXCHANGE_URL ?? '').trim();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        if (!exchangeUrl) {
          setStatus({
            state: 'error',
            message:
              'Falta configurar NEXT_PUBLIC_PARTNER_IMPERSONATION_EXCHANGE_URL.',
          });
          return;
        }

        clearSsoCaches();
        try {
          await AuthService.signOut();
        } catch {
          // ignore
        }
        clearSsoCaches();

        const hashParams = getHashParams();
        const code = (hashParams.get('code') ?? '').trim();
        const reservaId = (hashParams.get('reservaId') ?? '').trim();
        const redirect = safeRedirectPath(hashParams.get('redirect'));

        if (!code) {
          setStatus({ state: 'error', message: 'Código SSO inválido.' });
          return;
        }

        const resp = await fetch(exchangeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const json = (await resp.json()) as
          | {
              success: true;
              customToken: string;
              redirect?: string;
              reservaId?: string | null;
            }
          | { success: false; error?: string };

        if (!resp.ok || !json.success) {
          const msg =
            (!json.success && json.error ? json.error : null) ??
            'Error de SSO.';
          setStatus({ state: 'error', message: msg });
          return;
        }

        const token = (json.customToken ?? '').trim();
        if (!token) {
          setStatus({ state: 'error', message: 'Token SSO inválido.' });
          return;
        }

        await signInWithCustomToken(auth, token);
        try {
          await AuthService.getCurrentPartnerId();
        } catch {
          // ignore
        }

        const finalRedirect = safeRedirectPath(json.redirect ?? redirect);
        const url = new URL(finalRedirect, window.location.origin);
        if (reservaId) url.searchParams.set('reservaId', reservaId);

        setStatus({ state: 'success' });
        router.replace(url.pathname + url.search + url.hash);
      } catch (e) {
        setStatus({
          state: 'error',
          message: e instanceof Error ? e.message : 'Error de SSO.',
        });
      }
    };

    void run();
  }, [exchangeUrl, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">Accediendo...</div>
        <div className="mt-2 text-sm text-muted-foreground">
          {status.state === 'loading' && 'Iniciando sesión como partner.'}
          {status.state === 'success' && 'Redirigiendo...'}
          {status.state === 'error' && status.message}
        </div>
      </div>
    </div>
  );
}
