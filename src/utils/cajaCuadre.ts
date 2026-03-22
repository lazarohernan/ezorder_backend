/**
 * Cuadre de caja: efectivo esperado y agregación de gastos en efectivo (usado en cajaController).
 */

/** Filtro PostgREST: pedidos que cuentan como venta para caja */
export const FILTRO_PEDIDOS_CUENTAN_CAJA =
  'pagado.eq.true,estado_pedido.in.(en_preparacion,listo,entregado)';

export type GastoConMetodo = { monto: number | string | null; metodo_pago_id?: number | null };

/** Efectivo o sin método (se asume salida de caja en efectivo) */
export function esGastoCuentaEfectivo(metodoPagoId: number | null | undefined): boolean {
  return metodoPagoId === 1 || metodoPagoId == null;
}

export function sumarMontoGastosEfectivo(gastos: GastoConMetodo[] | null | undefined): number {
  if (!gastos?.length) return 0;
  return gastos
    .filter((g) => esGastoCuentaEfectivo(g.metodo_pago_id))
    .reduce((sum, g) => sum + Number(g.monto || 0), 0);
}

export type ParametrosEfectivoEsperado = {
  montoInicial: number;
  ventasEfectivo: number;
  ingresosAdicionales: number;
  gastosEfectivo: number;
  totalRetiros: number;
};

/**
 * Efectivo que debería haber en caja al cerrar (misma fórmula que cerrarCaja).
 */
export function calcularEfectivoEsperadoCaja(p: ParametrosEfectivoEsperado): number {
  return (
    Number(p.montoInicial) +
    Number(p.ventasEfectivo) +
    Number(p.ingresosAdicionales) -
    Number(p.gastosEfectivo) -
    Number(p.totalRetiros)
  );
}

export function calcularDiferenciaEfectivo(
  efectivoDeclarado: number,
  efectivoEsperado: number,
): number {
  return Number(efectivoDeclarado) - Number(efectivoEsperado);
}
