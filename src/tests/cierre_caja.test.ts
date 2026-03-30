import { describe, it, expect } from 'vitest';
import {
  calcularEfectivoEsperadoCaja,
  calcularDiferenciaEfectivo,
  sumarMontoGastosEfectivo,
  esGastoCuentaEfectivo,
} from '../utils/cajaCuadre';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para simular el cierre completo igual que cerrarCaja() en el backend
// ─────────────────────────────────────────────────────────────────────────────

type Pedido  = { total: number; metodo_pago_id: number };
type Gasto   = { monto: number; metodo_pago_id: number | null };

function simularCierre(params: {
  montoInicial:        number;
  pedidos:             Pedido[];
  gastos:              Gasto[];
  totalRetiros:        number;
  ingresosAdicionales: number;
  efectivoDeclarado:   number;
  posDeclarado:        number;
  transferenciaDeclarada: number;
  gastosDeclarados:    number;
}) {
  const ventasEfectivo     = params.pedidos.filter(p => p.metodo_pago_id === 1).reduce((s, p) => s + p.total, 0);
  const ventasPOS          = params.pedidos.filter(p => p.metodo_pago_id === 2).reduce((s, p) => s + p.total, 0);
  const ventasTransferencia= params.pedidos.filter(p => p.metodo_pago_id === 3).reduce((s, p) => s + p.total, 0);
  const totalVentas        = params.pedidos.reduce((s, p) => s + p.total, 0);
  const totalGastos        = params.gastos.reduce((s, g) => s + g.monto, 0);
  const gastosEfectivo     = sumarMontoGastosEfectivo(params.gastos);

  const efectivoSistema = calcularEfectivoEsperadoCaja({
    montoInicial:        params.montoInicial,
    ventasEfectivo,
    ingresosAdicionales: params.ingresosAdicionales,
    gastosEfectivo,
    totalRetiros:        params.totalRetiros,
  });

  const TOLERANCIA = 0.01;
  const difEfectivo      = calcularDiferenciaEfectivo(params.efectivoDeclarado, efectivoSistema);
  const difPOS           = params.posDeclarado           - ventasPOS;
  const difTransferencia = params.transferenciaDeclarada - ventasTransferencia;
  const difGastos        = params.gastosDeclarados       - totalGastos;
  const difTotal         = difEfectivo + difPOS + difTransferencia + difGastos;
  const cuadra           = Math.abs(difTotal) < TOLERANCIA;

  return {
    // Valores sistema
    efectivoSistema, ventasEfectivo, ventasPOS, ventasTransferencia,
    totalVentas, totalGastos, gastosEfectivo,
    // Diferencias
    difEfectivo, difPOS, difTransferencia, difGastos, difTotal,
    cuadra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Cierre de caja — escenario real (original)', () => {

  describe('esGastoCuentaEfectivo', () => {
    it('metodo_pago_id=1 (efectivo) cuenta como salida de caja', () =>
      expect(esGastoCuentaEfectivo(1)).toBe(true));
    it('metodo_pago_id=null (sin método) también cuenta como efectivo', () =>
      expect(esGastoCuentaEfectivo(null)).toBe(true));
    it('metodo_pago_id=2 (POS) NO descuenta del efectivo', () =>
      expect(esGastoCuentaEfectivo(2)).toBe(false));
    it('metodo_pago_id=3 (transferencia) NO descuenta del efectivo', () =>
      expect(esGastoCuentaEfectivo(3)).toBe(false));
  });

  describe('sumarMontoGastosEfectivo', () => {
    it('suma solo los gastos pagados en efectivo', () => {
      const gastos = [
        { monto: 100, metodo_pago_id: 1 },
        { monto: 500, metodo_pago_id: 2 },
        { monto: 200, metodo_pago_id: 3 },
        { monto: 50,  metodo_pago_id: null },
      ];
      expect(sumarMontoGastosEfectivo(gastos)).toBe(150);
    });
    it('devuelve 0 si no hay gastos', () => {
      expect(sumarMontoGastosEfectivo([])).toBe(0);
      expect(sumarMontoGastosEfectivo(null)).toBe(0);
    });
  });

  describe('calcularEfectivoEsperadoCaja', () => {
    it('L.200 inicial + L.728 efectivo - L.100 gasto = L.828', () => {
      expect(calcularEfectivoEsperadoCaja({
        montoInicial: 200, ventasEfectivo: 728,
        ingresosAdicionales: 0, gastosEfectivo: 100, totalRetiros: 0,
      })).toBe(828);
    });
    it('retiros reducen el efectivo esperado', () => {
      expect(calcularEfectivoEsperadoCaja({
        montoInicial: 200, ventasEfectivo: 728,
        ingresosAdicionales: 0, gastosEfectivo: 100, totalRetiros: 200,
      })).toBe(628);
    });
    it('caja sin ventas ni gastos: efectivo = monto inicial', () => {
      expect(calcularEfectivoEsperadoCaja({
        montoInicial: 10000, ventasEfectivo: 0,
        ingresosAdicionales: 0, gastosEfectivo: 0, totalRetiros: 0,
      })).toBe(10000);
    });
  });

  describe('sesionHasta — fix de timezone', () => {
    it('new Date().toISOString() es mayor que fecha_apertura', () => {
      const apertura = new Date();
      apertura.setSeconds(apertura.getSeconds() - 30);
      expect(new Date(new Date().toISOString()).getTime()).toBeGreaterThan(apertura.getTime());
    });

    it('bug anterior: rango invertido con offset UTC-6 (simulación)', () => {
      const fechaAperturaUTC   = new Date('2026-03-30T09:16:00.000Z');
      const sesionHastaBuggy   = new Date('2026-03-30T03:23:00.000Z'); // hora Honduras como UTC
      const sesionHastaCorecto = new Date('2026-03-30T09:23:00.000Z'); // new Date()

      expect(sesionHastaBuggy.getTime()).toBeLessThan(fechaAperturaUTC.getTime());
      expect(sesionHastaCorecto.getTime()).toBeGreaterThan(fechaAperturaUTC.getTime());
      const diffH = (sesionHastaCorecto.getTime() - sesionHastaBuggy.getTime()) / 3600000;
      expect(diffH).toBe(6);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Cierre de caja — flujo completo de un día', () => {
  /**
   * Escenario: restaurante con turno completo
   *
   *  Apertura:    L.5,000
   *
   *  Pedidos pagados:
   *    Efectivo  → L.350 + L.520 + L.180 = L.1,050
   *    POS       → L.420 + L.650         = L.1,070
   *    Transfer  → L.300 + L.800         = L.1,100
   *    Total ventas = L.3,220
   *
   *  Gastos:
   *    Insumos en efectivo   L.200  (id=1)
   *    Servicios en efectivo L.150  (id=1)
   *    Proveedor en POS      L.500  (id=2) ← no descuenta efectivo
   *    Total gastos = L.850 | gastos efectivo = L.350
   *
   *  Retiros: L.1,000
   *  Ingresos adicionales: L.0
   *
   *  efectivo_sistema = 5000 + 1050 - 350 - 1000 = L.4,700
   */

  const pedidos: Pedido[] = [
    { total: 350, metodo_pago_id: 1 },
    { total: 520, metodo_pago_id: 1 },
    { total: 180, metodo_pago_id: 1 },
    { total: 420, metodo_pago_id: 2 },
    { total: 650, metodo_pago_id: 2 },
    { total: 300, metodo_pago_id: 3 },
    { total: 800, metodo_pago_id: 3 },
  ];

  const gastos: Gasto[] = [
    { monto: 200, metodo_pago_id: 1 },
    { monto: 150, metodo_pago_id: 1 },
    { monto: 500, metodo_pago_id: 2 },
  ];

  it('ventas se clasifican correctamente por método de pago', () => {
    const r = simularCierre({
      montoInicial: 5000, pedidos, gastos,
      totalRetiros: 1000, ingresosAdicionales: 0,
      efectivoDeclarado: 4700, posDeclarado: 1070,
      transferenciaDeclarada: 1100, gastosDeclarados: 850,
    });
    expect(r.ventasEfectivo).toBe(1050);
    expect(r.ventasPOS).toBe(1070);
    expect(r.ventasTransferencia).toBe(1100);
    expect(r.totalVentas).toBe(3220);
  });

  it('solo los gastos en efectivo descuentan del efectivo de caja', () => {
    const r = simularCierre({
      montoInicial: 5000, pedidos, gastos,
      totalRetiros: 1000, ingresosAdicionales: 0,
      efectivoDeclarado: 4700, posDeclarado: 1070,
      transferenciaDeclarada: 1100, gastosDeclarados: 850,
    });
    expect(r.totalGastos).toBe(850);      // total todos los gastos
    expect(r.gastosEfectivo).toBe(350);   // solo los de efectivo
  });

  it('efectivo_sistema = 5000 + 1050 - 350 (gastos efectivo) - 1000 (retiro) = 4700', () => {
    const r = simularCierre({
      montoInicial: 5000, pedidos, gastos,
      totalRetiros: 1000, ingresosAdicionales: 0,
      efectivoDeclarado: 4700, posDeclarado: 1070,
      transferenciaDeclarada: 1100, gastosDeclarados: 850,
    });
    expect(r.efectivoSistema).toBe(4700);
  });

  it('caja cuadra si el cajero declara los valores exactos del sistema', () => {
    const r = simularCierre({
      montoInicial: 5000, pedidos, gastos,
      totalRetiros: 1000, ingresosAdicionales: 0,
      efectivoDeclarado: 4700, posDeclarado: 1070,
      transferenciaDeclarada: 1100, gastosDeclarados: 850,
    });
    expect(r.difEfectivo).toBe(0);
    expect(r.difPOS).toBe(0);
    expect(r.difTransferencia).toBe(0);
    expect(r.difGastos).toBe(0);
    expect(r.cuadra).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Cierre de caja — caja descuadrada (cajero declara mal)', () => {
  /**
   * Mismo escenario anterior pero el cajero comete errores al declarar:
   *   - Dice que tiene L.5,000 en efectivo (tiene L.4,700 → faltante L.300)
   *   - Dice que POS fue L.800 (fue L.1,070 → faltante L.270)
   *   - Tranferencia y gastos los declara correcto
   */

  const pedidos: Pedido[] = [
    { total: 350, metodo_pago_id: 1 },
    { total: 520, metodo_pago_id: 1 },
    { total: 180, metodo_pago_id: 1 },
    { total: 420, metodo_pago_id: 2 },
    { total: 650, metodo_pago_id: 2 },
    { total: 300, metodo_pago_id: 3 },
    { total: 800, metodo_pago_id: 3 },
  ];

  const gastos: Gasto[] = [
    { monto: 200, metodo_pago_id: 1 },
    { monto: 150, metodo_pago_id: 1 },
    { monto: 500, metodo_pago_id: 2 },
  ];

  it('detecta sobrante cuando el cajero declara más efectivo del esperado', () => {
    const r = simularCierre({
      montoInicial: 5000, pedidos, gastos,
      totalRetiros: 1000, ingresosAdicionales: 0,
      efectivoDeclarado: 5000,  // declara L.5,000 pero sistema espera L.4,700
      posDeclarado: 1070,
      transferenciaDeclarada: 1100,
      gastosDeclarados: 850,
    });
    expect(r.difEfectivo).toBe(300);   // sobrante de L.300
    expect(r.cuadra).toBe(false);
  });

  it('detecta faltante en POS', () => {
    const r = simularCierre({
      montoInicial: 5000, pedidos, gastos,
      totalRetiros: 1000, ingresosAdicionales: 0,
      efectivoDeclarado: 4700,
      posDeclarado: 800,   // declara L.800 pero sistema registró L.1,070
      transferenciaDeclarada: 1100,
      gastosDeclarados: 850,
    });
    expect(r.difPOS).toBe(-270);   // faltante L.270
    expect(r.cuadra).toBe(false);
  });

  it('la diferencia total acumula todos los descuadres', () => {
    const r = simularCierre({
      montoInicial: 5000, pedidos, gastos,
      totalRetiros: 1000, ingresosAdicionales: 0,
      efectivoDeclarado: 5000,  // +300 sobrante
      posDeclarado: 800,        // -270 faltante
      transferenciaDeclarada: 1100,
      gastosDeclarados: 850,
    });
    expect(r.difTotal).toBe(30);   // 300 - 270 = +30
    expect(r.cuadra).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Cierre de caja — casos límite', () => {

  it('caja con solo efectivo sin POS ni transferencia', () => {
    const r = simularCierre({
      montoInicial: 1000,
      pedidos: [
        { total: 400, metodo_pago_id: 1 },
        { total: 250, metodo_pago_id: 1 },
      ],
      gastos: [{ monto: 50, metodo_pago_id: 1 }],
      totalRetiros: 0, ingresosAdicionales: 0,
      efectivoDeclarado: 1600, posDeclarado: 0,
      transferenciaDeclarada: 0, gastosDeclarados: 50,
    });
    // 1000 + 650 - 50 = 1600
    expect(r.efectivoSistema).toBe(1600);
    expect(r.cuadra).toBe(true);
  });

  it('caja con múltiples retiros reduce correctamente el efectivo', () => {
    // 3 retiros durante la sesión
    const totalRetiros = 500 + 300 + 200; // = 1000
    const r = simularCierre({
      montoInicial: 5000,
      pedidos: [{ total: 800, metodo_pago_id: 1 }],
      gastos: [],
      totalRetiros, ingresosAdicionales: 0,
      efectivoDeclarado: 4800, posDeclarado: 0,
      transferenciaDeclarada: 0, gastosDeclarados: 0,
    });
    // 5000 + 800 - 1000 retiros = 4800
    expect(r.efectivoSistema).toBe(4800);
    expect(r.cuadra).toBe(true);
  });

  it('gasto sin método de pago se trata como efectivo', () => {
    const gastos: Gasto[] = [
      { monto: 300, metodo_pago_id: null }, // sin método → efectivo
    ];
    const r = simularCierre({
      montoInicial: 2000,
      pedidos: [{ total: 500, metodo_pago_id: 1 }],
      gastos,
      totalRetiros: 0, ingresosAdicionales: 0,
      efectivoDeclarado: 2200, posDeclarado: 0,
      transferenciaDeclarada: 0, gastosDeclarados: 300,
    });
    // 2000 + 500 - 300 = 2200
    expect(r.gastosEfectivo).toBe(300);
    expect(r.efectivoSistema).toBe(2200);
    expect(r.cuadra).toBe(true);
  });

  it('caja vacía: sin ventas, sin gastos, sin retiros — devuelve monto inicial', () => {
    const r = simularCierre({
      montoInicial: 3000,
      pedidos: [], gastos: [],
      totalRetiros: 0, ingresosAdicionales: 0,
      efectivoDeclarado: 3000, posDeclarado: 0,
      transferenciaDeclarada: 0, gastosDeclarados: 0,
    });
    expect(r.efectivoSistema).toBe(3000);
    expect(r.cuadra).toBe(true);
  });
});
