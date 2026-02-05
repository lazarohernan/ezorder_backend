/**
 * Utilidades para manejo de fechas con zona horaria de Honduras
 */

/**
 * Obtiene la fecha actual en la zona horaria de Honduras
 * @returns Date object ajustado a Honduras (America/Tegucigalpa)
 */
export function getHondurasDate(): Date {
  // Usar Intl para obtener la fecha/hora real en Honduras de forma consistente
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
  return new Date(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second'))
  );
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

