/**
 * Utilidades para manejo de fechas con zona horaria de Honduras
 */

/**
 * Obtiene la fecha actual en la zona horaria de Honduras
 * @returns Date object ajustado a Honduras (America/Tegucigalpa)
 */
export function getHondurasDate(): Date {
  const now = new Date();
  // Honduras está en UTC-6 (CST) o UTC-5 (CDT) durante horario de verano
  // Usamos una aproximación simple: UTC-6
  const hondurasOffset = -6 * 60; // -6 horas en minutos
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const hondurasTime = new Date(utc + (hondurasOffset * 60000));
  return hondurasTime;
}

/**
 * Obtiene el inicio del día en Honduras
 * @param fecha - Fecha opcional, si no se proporciona usa la fecha actual
 * @returns Date con las horas establecidas a 00:00:00.000
 */
export function getStartOfDayHonduras(fecha?: string | Date): Date {
  const date = fecha ? new Date(fecha) : getHondurasDate();
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Obtiene el final del día en Honduras
 * @param fecha - Fecha opcional, si no se proporciona usa la fecha actual
 * @returns Date con las horas establecidas a 23:59:59.999
 */
export function getEndOfDayHonduras(fecha?: string | Date): Date {
  const date = fecha ? new Date(fecha) : getHondurasDate();
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * Convierte una fecha a string ISO para almacenamiento en base de datos
 * @param fecha - Fecha a convertir
 * @returns String en formato ISO
 */
export function toISOStringHonduras(fecha: Date): string {
  return fecha.toISOString();
}

/**
 * Formatea una fecha para mostrar en Honduras
 * @param fecha - Fecha a formatear
 * @param includeTime - Si incluir la hora (default: true)
 * @returns String formateado
 */
export function formatDateHonduras(fecha: Date | string, includeTime: boolean = true): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  if (includeTime) {
    return date.toLocaleString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Tegucigalpa'
    });
  } else {
    return date.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Tegucigalpa'
    });
  }
}

