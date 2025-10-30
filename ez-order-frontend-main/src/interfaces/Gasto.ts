export interface Gasto {
  id: string;
  created_at: string;
  updated_at: string;
  restaurante_id: string;
  usuario_id: string;
  usuario_nombre?: string | null;
  fecha_gasto: string;
  categoria: string;
  descripcion: string;
  monto: number;
  metodo_pago_id?: number | null;
  metodo_pago?: string | null;
  proveedor?: string | null;
}

export interface GastoCreate {
  restaurante_id: string;
  usuario_id: string;
  fecha_gasto?: string;
  categoria: string;
  descripcion: string;
  monto: number;
  metodo_pago_id?: number | null;
  proveedor?: string;
}

export interface GastoUpdate {
  fecha_gasto?: string;
  categoria?: string;
  descripcion?: string;
  monto?: number;
  metodo_pago_id?: number | null;
  proveedor?: string;
}

export interface GastoResumenCategoria {
  categoria: string;
  total: number;
}

export interface GastoTotal {
  total_gastos: number;
  cantidad_gastos: number;
}

// Categorías sugeridas para gastos
export const CATEGORIAS_GASTO = [
  'Compras de insumos',
  'Servicios',
  'Salarios/Nómina',
  'Mantenimiento',
  'Alquiler',
  'Marketing/Publicidad',
  'Impuestos',
  'Transporte',
  'Otros'
] as const;

export type CategoriaGasto = typeof CATEGORIAS_GASTO[number];

