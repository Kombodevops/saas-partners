import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Partner } from '../types/partner';
import type { Worker } from '../types/worker';
import { RegisterFormData } from '../validators/register.validator';
import { PartnerFiscalSchema, type PartnerFiscal } from '../validators/partner-fiscal';

const PARTNER_CACHE_KEY = 'komvo_partner_id';
const WORKER_CACHE_KEY = 'komvo_worker_id';

export class AuthService {
  // Iniciar sesión con email y contraseña
  static async signIn(email: string, password: string): Promise<{ user: User; partner: Partner; worker?: Worker }> {
    try {
      // Autenticar con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verificar si el usuario existe en la colección partners
      const partnerDoc = await getDoc(doc(db, 'partners', user.uid));
      
      if (!partnerDoc.exists()) {
        const workerDoc = await getDoc(doc(db, 'workers', user.uid));
        if (!workerDoc.exists()) {
          await signOut(auth);
          throw new Error('Usuario no encontrado en el sistema de partners');
        }

        const workerData = workerDoc.data() as Worker;
        if (!workerData.active) {
          await signOut(auth);
          throw new Error('Usuario desactivado');
        }

        const partnerRef = await getDoc(doc(db, 'partners', workerData.partnerId));
        if (!partnerRef.exists()) {
          await signOut(auth);
          throw new Error('Partner no encontrado para este trabajador');
        }

        const partnerData = partnerRef.data();
        if (!partnerData?.perfilCompletado) {
          await signOut(auth);
          return Promise.reject({ code: 'auth/invalid-login' });
        }

        const partner = {
          id: partnerRef.id,
          ...partnerData,
        } as Partner;

        this.setCachedPartnerId(workerData.partnerId);
        this.setCachedWorkerId(workerDoc.id);
        return { user, partner, worker: { ...workerData, id: workerDoc.id } };
      }

      const partnerData = partnerDoc.data();
      if (!partnerData?.perfilCompletado) {
        await signOut(auth);
        return Promise.reject({ code: 'auth/invalid-login' });
      }

      const partner = {
        id: partnerDoc.id,
        ...partnerData,
      } as Partner;

      this.setCachedPartnerId(partnerDoc.id);
      this.setCachedWorkerId(null);
      return { user, partner };
    } catch (error) {
      console.error('Error en signIn:', error);
      throw error;
    }
  }

  // Crear cuenta de partner y guardar su perfil
  static async signUp(
    data: RegisterFormData,
    _dniFiles?: { front: File; back: File },
    options?: { createStripe?: boolean }
  ): Promise<{ user: User; partner: Partner }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      const stripeAccountId = options?.createStripe ? await this.createStripeAccount(user.uid, data) : '';

      const safeValue = (value?: string) => value?.trim() || '';
      const defaultImage =
        'https://firebasestorage.googleapis.com/v0/b/kombodevops-f894b.appspot.com/o/imagenesCorporativas%2FimagenUsuarioDefecto.jpg?alt=media&token=3c5c3a38-b853-4c06-9199-75d171c778fa';

      const partnerPayload = {
        Email: data.email,
        Prefijo: data.prefijo,
        'Número de teléfono': data.telefono,
        reservas: [],
        restaurantes: [],
        packs: [],
        personal: [],
        chatIds: [],
        imagen: [defaultImage],
        perfilMigrado: true,
        token: 'token',
        perfilCompletado: false,
        isBusiness: data.businessType === 'empresa' ? true : false,
        'Razón social': safeValue(data.razonSocial),
        NIF: safeValue(data.nif),
        'Dirección Fiscal': safeValue(data.direccionFiscal),
        'Código Postal del negocio': safeValue(data.codigoPostalNegocio),
        'Ciudad del negocio': safeValue(data.ciudadNegocio),
        'Provincia del negocio': safeValue(data.provinciaNegocio),
        'Teléfono del negocio': safeValue(data.telefonoNegocio),
        'Numero de cuenta': safeValue(data.numeroCuenta),
        'Nombre y apellidos del titular de la cuenta': safeValue(data.nombreTitular),
        'Nombre del banco': safeValue(data.nombreBanco),
        'Fecha de nacimiento': safeValue(data.fechaNacimiento),
        Dirección: safeValue(data.direccion),
        Ciudad: safeValue(data.ciudad),
        CP: safeValue(data.cp),
        stripeAccountId: stripeAccountId || '',
      };

      try {
        const cleanPayload = Object.fromEntries(
          Object.entries(partnerPayload).filter(([, value]) => value !== undefined)
        ) as Record<string, unknown>;
        await setDoc(doc(db, 'partners', user.uid), cleanPayload);
      } catch (error) {
        await deleteUser(user);
        throw error;
      }

      return {
        user,
        partner: {
          id: user.uid,
          email: data.email,
          nombre: data.nombre,
          apellidos: data.apellidos,
          nombreNegocio: data.nombreNegocio?.trim() || '',
          numeroTelefono: data.telefono,
          prefijo: data.prefijo,
          imagen: [defaultImage],
          reservas: [],
          restaurantes: [],
          packs: [],
          personal: [],
          chatIds: [],
          perfilCompletado: false,
          perfilMigrado: true,
          stripeAccountId: stripeAccountId || '',
          token: 'token',
          cp: '',
          ciudad: '',
          ciudadNegocio: '',
          codigoPostalNegocio: '',
          direccion: '',
          direccionFiscal: '',
          fechaNacimiento: '',
          nif: '',
          nombreTitular: '',
          numeroCuenta: '',
          provinciaNegocio: '',
          razonSocial: '',
          telefonoNegocio: '',
        },
      };
    } catch (error) {
      console.error('Error en signUp:', error);
      throw error;
    }
  }

  // Cerrar sesión
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
      this.setCachedPartnerId(null);
      this.setCachedWorkerId(null);
    } catch (error) {
      console.error('Error en signOut:', error);
      throw error;
    }
  }

  // Obtener usuario actual
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  static getCachedPartnerId(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(PARTNER_CACHE_KEY);
  }

  static getCachedWorkerId(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(WORKER_CACHE_KEY);
  }

  static getCurrentPartnerIdSync(): string | null {
    return this.getCachedPartnerId() ?? auth.currentUser?.uid ?? null;
  }

  static async getCurrentPartnerId(): Promise<string | null> {
    const cached = this.getCachedPartnerId();
    if (cached) return cached;
    const user = auth.currentUser;
    if (!user) return null;
    const workerDoc = await getDoc(doc(db, 'workers', user.uid));
    if (workerDoc.exists()) {
      const workerData = workerDoc.data() as Worker;
      this.setCachedPartnerId(workerData.partnerId);
      this.setCachedWorkerId(workerDoc.id);
      return workerData.partnerId;
    }
    this.setCachedPartnerId(user.uid);
    return user.uid;
  }

  // Obtener idToken actual
  static async getIdToken(forceRefresh = false): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken(forceRefresh);
    } catch (error) {
      console.error('Error al obtener idToken:', error);
      return null;
    }
  }

  // Verificar si el usuario actual es un partner válido
  static async getCurrentPartner(): Promise<Partner | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const partnerDoc = await getDoc(doc(db, 'partners', user.uid));
      if (partnerDoc.exists()) {
        this.setCachedPartnerId(partnerDoc.id);
        this.setCachedWorkerId(null);
        return {
          id: partnerDoc.id,
          ...partnerDoc.data()
        } as Partner;
      }
      const workerDoc = await getDoc(doc(db, 'workers', user.uid));
      if (!workerDoc.exists()) return null;
      const workerData = workerDoc.data() as Worker;
      const partnerRef = await getDoc(doc(db, 'partners', workerData.partnerId));
      if (!partnerRef.exists()) return null;
      this.setCachedPartnerId(workerData.partnerId);
      this.setCachedWorkerId(workerDoc.id);
      return {
        id: partnerRef.id,
        ...partnerRef.data(),
      } as Partner;
    } catch (error) {
      console.error('Error al obtener partner actual:', error);
      return null;
    }
  }

  static async getCurrentWorker(): Promise<Worker | null> {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const workerDoc = await getDoc(doc(db, 'workers', user.uid));
      if (!workerDoc.exists()) return null;
      const workerData = workerDoc.data() as Worker;
      return { ...workerData, id: workerDoc.id };
    } catch (error) {
      console.error('Error al obtener trabajador actual:', error);
      return null;
    }
  }

  static async getCurrentPartnerFiscal(): Promise<PartnerFiscal | null> {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const partnerId = await this.getCurrentPartnerId();
      if (!partnerId) return null;
      const partnerDoc = await getDoc(doc(db, 'partners', partnerId));
      if (!partnerDoc.exists()) return null;
      return PartnerFiscalSchema.parse(partnerDoc.data());
    } catch (error) {
      console.error('Error al obtener partner fiscal:', error);
      return null;
    }
  }

  // Observador de cambios en el estado de autenticación
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return auth.onAuthStateChanged(callback);
  }

  private static setCachedPartnerId(value: string | null) {
    if (typeof window === 'undefined') return;
    if (!value) {
      sessionStorage.removeItem(PARTNER_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(PARTNER_CACHE_KEY, value);
  }

  private static setCachedWorkerId(value: string | null) {
    if (typeof window === 'undefined') return;
    if (!value) {
      sessionStorage.removeItem(WORKER_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(WORKER_CACHE_KEY, value);
  }

  private static async createStripeAccount(partnerId: string, data: RegisterFormData) {
    const functionUrl = process.env.NEXT_PUBLIC_CREATE_STRIPE_ACCOUNT;
    if (!functionUrl) {
      return `stripe_account_pending_${partnerId}`;
    }

    const payload = {
      partnerId,
      email: data.email,
      business: data.businessType === 'empresa',
      nuevoPartner: {
        Email: data.email,
        nombre: data.nombre,
        Apellidos: data.apellidos,
        'Nombre del negocio': data.businessType === 'autonomo' ? data.nombreNegocio?.trim() || '' : data.razonSocial,
        'Razón social': data.razonSocial,
        NIF: data.nif,
        'Dirección Fiscal': data.direccionFiscal,
        'Código Postal del negocio': data.codigoPostalNegocio,
        'Ciudad del negocio': data.ciudadNegocio,
        'Provincia del negocio': data.provinciaNegocio,
        'Teléfono del negocio': data.telefonoNegocio,
        'Numero de cuenta': data.numeroCuenta,
        'Nombre y apellidos del titular de la cuenta': data.nombreTitular,
        'Nombre del banco': data.nombreBanco,
        Prefijo: data.prefijo,
        'Número de teléfono': data.telefono,
        'Fecha de nacimiento': data.fechaNacimiento,
        Dirección: data.direccion,
        Ciudad: data.ciudad,
        CP: data.cp,
        isBusiness: data.businessType === 'empresa',
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return `stripe_account_pending_${partnerId}`;
      }
      const responseData = (await response.json()) as { accountId?: string };
      return responseData.accountId ?? `stripe_account_pending_${partnerId}`;
    } catch (error) {
      return `stripe_account_pending_${partnerId}`;
    }
  }
}
