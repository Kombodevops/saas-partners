export interface Partner {
  id: string;
  isBusiness?: boolean;
  nombre?: string;
  apellidos: string;
  cp: string;
  ciudad: string;
  ciudadNegocio: string;
  codigoPostalNegocio: string;
  dnib?: string;
  dnif?: string;
  direccion: string;
  direccionFiscal: string;
  email: string;
  fechaNacimiento: string;
  nif: string;
  nombreNegocio: string;
  nombreTitular: string;
  numeroCuenta: string;
  numeroTelefono: string;
  prefijo: string;
  provinciaNegocio: string;
  razonSocial: string;
  telefonoNegocio: string;
  chatIds: string[];
  imagen: string[];
  perfilCompletado: boolean;
  perfilMigrado?: boolean;
  reservas: string[];
  restaurantes: string[];
  packs: string[];
  personal: string[];
  stripeAccountId: string;
  token: string;
}

// Getters útiles
export interface PartnerUtils {
  nombreCompleto: string;
  imagenPerfil: string;
  tieneRestaurantes: boolean;
  totalRestaurantes: number;
  totalReservas: number;
}

// Funciones de utilidad para Partner
export const partnerUtils = {
  getNombreCompleto: (partner: Partner): string => `${partner.nombreNegocio} ${partner.apellidos}`,
  getImagenPerfil: (partner: Partner): string => partner.imagen.length > 0 ? partner.imagen[0] : '',
  tieneRestaurantes: (partner: Partner): boolean => partner.restaurantes.length > 0,
  getTotalRestaurantes: (partner: Partner): number => partner.restaurantes.length,
  getTotalReservas: (partner: Partner): number => partner.reservas.length,
};

// Tipo para los datos del formulario de login
export interface LoginFormData {
  email: string;
  password: string;
}
