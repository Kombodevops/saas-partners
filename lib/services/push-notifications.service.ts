import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { AuthService } from '@/lib/services/auth.service';

export class PushNotificationsService {
  static async sendNotification(params: {
    title: string;
    body: string;
    deviceToken: string;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!params.title || !params.body || !params.deviceToken) return { ok: false, error: 'missing-params' };
    const idToken = await AuthService.getIdToken();
    if (!idToken) return { ok: false, error: 'missing-auth-token' };

    try {
      const callable = httpsCallable(functions, 'sendNotification');
      await callable({ title: params.title, body: params.body, token: params.deviceToken });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'unknown-error' };
    }
  }

  static async sendNotificationHttp(params: {
    title: string;
    body: string;
    deviceToken: string;
  }): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
    const PUSH_HTTP_ENDPOINT = process.env.NEXT_PUBLIC_SEND_PUSH_NOTIFICATION ?? '';
    if (!PUSH_HTTP_ENDPOINT) return { ok: false, error: 'missing-endpoint' };
    if (!params.title || !params.body || !params.deviceToken) return { ok: false, error: 'missing-params' };

    const idToken = await AuthService.getIdToken();
    if (!idToken) return { ok: false, error: 'missing-auth-token' };

    try {
      const res = await fetch(PUSH_HTTP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: params.title,
          body: params.body,
          token: params.deviceToken,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, error: text || `http-${res.status}` };
      }

      const json = (await res.json().catch(() => null)) as { messageId?: string } | null;
      return { ok: true, messageId: json?.messageId };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'unknown-error' };
    }
  }
}
