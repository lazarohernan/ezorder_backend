export interface Caja {
  id: string;
  created_at: string;
  restaurante_id: string;
  restaurante_nombre?: string | null;
  usuario_id: string;
  usuario_nombre?: string | null;
  fecha_apertura: string;
  fecha_cierre?: string | null;
  monto_inicial: number;
  monto_final?: number | null;
  total_ventas: number;
  total_ingresos: number;
  total_egresos: number;
  estado: 'abierta' | 'cerrada';
  observaciones?: string;
  updated_at: string;
}

export interface CajaCreate {
  restaurante_id: string;
  usuario_id: string;
  monto_inicial: number;
  observaciones?: string;
}

export interface CajaUpdate {
  fecha_cierre?: string | null;
  monto_final?: number | null;
  total_ventas?: number;
  total_ingresos?: number;
  total_egresos?: number;
  estado?: 'abierta' | 'cerrada';
  observaciones?: string;
}

export interface CajaCierre {
  monto_final: number;
  ventas_pos_reportadas?: number;
  ventas_transferencia_reportadas?: number;
  gastos_reportados?: number;
  ventas_efectivo_reportadas?: number;
  observaciones?: string;
}

export interface CajaResumen {
  caja_actual?: Caja;
  total_ventas_dia: number;
  ventas_efectivo?: number;
  ventas_pos?: number;
  ventas_transferencia?: number;
  total_ingresos_dia: number;
  total_egresos_dia: number;
  total_gastos_dia?: number;
  gastos_dia?: Array<{
    id: string;
    categoria: string;
    descripcion: string;
    monto: number;
    fecha_gasto: string;
  }>;
  diferencia: number;
}
