export type FirestoreTimestampLike =
  | { __type__: 'Timestamp'; value: string }
  | Date
  | string;

export type Reserva = {
  fechaLimitePago: string;
  fechaSolicitud: FirestoreTimestampLike;
  usuarioRegistrado: boolean;
  estadoKomvo: string;
  restaurante: {
    id: string;
    slug: string;
    'Nombre del restaurante': string;
    horaCierre: string;
    Ubicación: string;
    'Dirección': string;
    'Código Postal': string;
    'Imagenes del restaurante': string[];
  };
  fechaLimiteAsistentes: string;
  fechaLimiteSala: string;
  estadoPlan: string;
  estadoSala: string;
  leadKomvo: boolean;
  pack: {
    Menus: Array<{
      Nombre?: string;
      disponibilidadPorRestaurante?: Array<{
        diasDisponibles?: string[];
        restauranteId: string;
      }>;
      restaurantesIds?: string[];
      'Descripción'?: string;
      Precio?: number;
      tipoServicio?: string;
    }>;
    Bebidas: null;
    'Cantidad de tickets': null;
    VecesSolicitado: null;
    'Tamaño del grupo': Record<string, unknown>;
    Disponibilidad: unknown[];
    Facturación: null;
    Pdf: null;
    prioridad: number;
    tipoPlan: string[];
    'Permitir comida al cliente': boolean;
    Subcategoria: null;
    slug: string;
    'Barra Libre': null;
    'Nombre del pack': string;
    'Precio por persona': null;
    'Características': unknown[];
    'Precio del pack completo': null;
    activo: boolean;
    Categoria: string;
    idRestaurante: null;
    Tickets: null;
    Comida: string;
    Cocktails: null;
    idPropietario: string;
    'Descripción': string;
    restaurantesIds: string[];
  };
  precio: {
    'Menú': {
      Nombre: string;
      disponibilidadPorRestaurante: Array<{
        diasDisponibles: string[];
        restauranteId: string;
      }>;
      restaurantesIds: string[];
      'Descripción': string;
      Precio: number;
      tipoServicio: string;
    };
  };
  sala: {
    permiteReservaSinCompraAnticipada: boolean;
    nombre: string;
    aforoMaximo: number;
    descripcion: string;
    aforoMinimo: number;
    precioPrivatizacion: number;
    caracteristicas: Record<string, string>;
  };
  usuario: {
    Email: string;
    'Nombre de usuario': string;
    Telefono: string;
    id: string;
    token: string;
  };
  partnerId: string;
  cancelledAt: FirestoreTimestampLike;
  cancelledBy: string;
  asistenciasFinal: number;
  paymentIntentId: string;
  pagado: boolean;
  numeroFinalAsistentes: number;
  sessionId: string;
  fechaPago: FirestoreTimestampLike;
  partnerEmail: string;
  motivo: string;
  fechaActualizacion: FirestoreTimestampLike;
  gestionExpiresAt: FirestoreTimestampLike;
  chat: boolean;
  asistentes: boolean;
  gestionTimeoutStatus: string;
  showChat: boolean;
  avatarUrl: string;
  showAsistentes: boolean;
  descripcionSala: string;
  tipoCompra: string;
  cambioSolicitado: {
    tipo: string;
    valorAnterior: string;
    valorNuevo: string;
    fechaSolicitud: string;
  };
  kombo: {
    horaFin: string;
    FechaCreacion: FirestoreTimestampLike;
    'Descripción': string;
    'Nombre del kombo': string;
    Fecha: string;
    Hora: string;
    nuevaFecha: string;
    'Tamaño del grupo': {
      max: string;
      min: string;
      nuevoMax: string;
    };
  };
  estado: string;
};
