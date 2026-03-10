export interface PackResumen {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  activo: boolean;
  categoria?: string;
  subcategoria?: string;
}
