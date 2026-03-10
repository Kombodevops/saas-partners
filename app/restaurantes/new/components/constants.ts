export const UBICACIONES = ['Chamberí', 'Barrio Salamanca', 'Azca/Bernabeu', 'Otras Zonas'] as const;

export const STEPS = [
  { key: 'basico', title: 'Básico' },
  { key: 'ubicacion', title: 'Ubicación' },
  { key: 'horarios', title: 'Horarios' },
  { key: 'raciones', title: 'Raciones' },
  { key: 'caracteristicas', title: 'Características' },
  { key: 'salas', title: 'Salas' },
  { key: 'consumiciones', title: 'Consumiciones' },
  { key: 'extras', title: 'Extras' },
  { key: 'archivos', title: 'Archivos' },
  { key: 'responsable', title: 'Responsable' },
  { key: 'resumen', title: 'Resumen' },
] as const;

export type StepKey = (typeof STEPS)[number]['key'];
