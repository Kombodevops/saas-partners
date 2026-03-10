export interface RestauranteResumen {
  id: string;
  nombreRestaurante: string;
  direccion: string;
  ubicacion: string;
  tipoCocina?: string;
  logoRestaurante: string[];
  abierto: boolean;
  cartaDisponible: boolean;
  tieneRaciones: boolean;
  tieneExtras: boolean;
  tieneMasDeUnaImagen: boolean;
  stripeAccountId?: string;
  color?: string;
}
