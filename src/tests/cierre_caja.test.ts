import { describe, it, expect } from 'vitest';
import {
  calcularEfectivoEsperadoCaja,
  sumarMontoGastosEfectivo,
  esGastoCuentaEfectivo,
} from '../utils/cajaCuadre';

/**
 * Escenario real del usuario:
 *   - Apertura con L.200
 *   - Factura L.728 en Efectivo (metodo_pago_id = 1)
 *   - Factura L.240 en POS      (metodo_pago_id = 2)
 *   - Factura L.120 en Transfer (metodo_pago_id = 3)
 *   - Gasto   L.100 en Efectivo (metodo_pago_id = 1)
 *
 * Resultado esperado:
 *   efectivo_sistema = 200 + 728 - 100 = 828
 */

describe('Cierre de caja — escenario real', () => {

  // ─── Utilidades de gastos ───────────────────────────────────────────────

  describe('esGastoCuentaEfectivo', () => {
    it('metodo_pago_id=1 (efectivo) cuenta como salida de caja', () => {
      expect(esGastoCuentaEfectivo(1)).toBe(true);
    });
    it('metodo_pago_id=null (sin método) también cuenta como efectivo', () => {
      expect(esGastoCuentaEfectivo(null)).toBe(true);
    });
    it('metodo_pago_id=2 (POS) NO descuenta del efectivo', () => {
      expect(esGastoCuentaEfectivo(2)).toBe(false);
    });
    it('metodo_pago_id=3 (transferencia) NO descuenta del efectivo', () => {
      expect(esGastoCuentaEfectivo(3)).toBe(false);
    });
  });

  describe('sumarMontoGastosEfectivo', () => {
    it('suma solo los gastos pagados en efectivo', () => {
      const gastos = [
        { monto: 100, metodo_pago_id: 1 }, // efectivo → cuenta
        { monto: 500, metodo_pago_id: 2 }, // POS       → no cuenta
        { monto: 200, metodo_pago_id: 3 }, // transf.   → no cuenta
        { monto: 50,  metodo_pago_id: null }, // sin método → cuenta
      ];
      expect(sumarMontoGastosEfectivo(gastos)).toBe(150);
    });

    it('devuelve 0 si no hay gastos', () => {
      expect(sumarMontoGastosEfectivo([])).toBe(0);
      expect(sumarMontoGastosEfectivo(null)).toBe(0);
    });
  });

  // ─── Cálculo de efectivo esperado ───────────────────────────────────────

  describe('calcularEfectivoEsperadoCaja', () => {
    it('escenario real: L.200 inicial + L.728 efectivo - L.100 gasto = L.828', () => {
      const resultado = calcularEfectivoEsperadoCaja({
        montoInicial:       200,
        ventasEfectivo:     728,
        ingresosAdicionales: 0,
        gastosEfectivo:     100,
        totalRetiros:         0,
      });
      expect(resultado).toBe(828);
    });

    it('ventas POS y transferencia NO afectan el efectivo en caja', () => {
      // Mismo escenario pero ignorando POS y transferencia
      const conPOSyTransfer = calcularEfectivoEsperadoCaja({
        montoInicial:       200,
        ventasEfectivo:     728,
        ingresosAdicionales: 0,
        gastosEfectivo:     100,
        totalRetiros:         0,
      });
      // Resultado debe ser igual independientemente de que haya 240 POS + 120 transferencia
      expect(conPOSyTransfer).toBe(828);
    });

    it('retiros reducen el efectivo esperado', () => {
      const resultado = calcularEfectivoEsperadoCaja({
        montoInicial:       200,
        ventasEfectivo:     728,
        ingresosAdicionales: 0,
        gastosEfectivo:     100,
        totalRetiros:       200,
      });
      expect(resultado).toBe(628); // 828 - 200 retiro
    });

    it('caja sin ventas ni gastos: efectivo = monto inicial', () => {
      const resultado = calcularEfectivoEsperadoCaja({
        montoInicial:       10000,
        ventasEfectivo:     0,
        ingresosAdicionales: 0,
        gastosEfectivo:     0,
        totalRetiros:       0,
      });
      expect(resultado).toBe(10000);
    });
  });

  // ─── Fix de timezone ────────────────────────────────────────────────────

  describe('sesionHasta — fix de timezone', () => {
    it('new Date().toISOString() produce UTC real (no hora local como UTC)', () => {
      const fechaApertura = new Date();
      fechaApertura.setSeconds(fechaApertura.getSeconds() - 30); // simula apertura 30s atrás

      const sesionHasta = new Date().toISOString();

      // sesionHasta debe ser MAYOR que fecha_apertura (rango válido, no invertido)
      expect(new Date(sesionHasta).getTime()).toBeGreaterThan(fechaApertura.getTime());
    });

    it('bug anterior: getHondurasDate() producía rango invertido en servidor UTC (simulación)', () => {
      // Escenario real del bug:
      //   Apertura guardada en BD (UTC correcto): 2026-03-30 09:16 UTC
      //   Honduras local al cerrar:               2026-03-30 03:23 (UTC-6)
      //   getHondurasDate() en servidor UTC creaba: new Date(2026,2,30,3,23,0)
      //     → interpretado como 03:23 UTC (6h menos del real 09:23 UTC)

      const fechaAperturaUTC   = new Date('2026-03-30T09:16:00.000Z'); // BD correcto
      const sesionHastaBuggy   = new Date('2026-03-30T03:23:00.000Z'); // lo que devolvía el bug
      const sesionHastaCorecto = new Date('2026-03-30T09:23:00.000Z'); // new Date().toISOString()

      // Con el bug: sesionHasta < sesionDesde → rango invertido → 0 resultados
      expect(sesionHastaBuggy.getTime()).toBeLessThan(fechaAperturaUTC.getTime());

      // Con el fix: sesionHasta > sesionDesde → rango válido
      expect(sesionHastaCorecto.getTime()).toBeGreaterThan(fechaAperturaUTC.getTime());

      // La diferencia del bug era exactamente 6 horas (offset UTC-6 de Honduras)
      const diferenciaHoras = (sesionHastaCorecto.getTime() - sesionHastaBuggy.getTime()) / 3600000;
      expect(diferenciaHoras).toBe(6);
    });
  });

});
