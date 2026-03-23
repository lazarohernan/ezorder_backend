import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from '../supabase/supabase';

const client = supabaseAdmin || supabase;

const TIMEZONE_HN = 'America/Tegucigalpa';

type DescuentoConProgramacion = {
  programado?: boolean | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  dias_semana?: number[] | null;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

const getNowHNParts = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_HN,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    fecha: `${map.year}-${map.month}-${map.day}`,
    hora: `${map.hour}:${map.minute}:${map.second}`,
    diaSemana: weekdayMap[map.weekday] ?? now.getDay(),
  };
};

const normalizarHora = (hora?: string | null) => {
  if (!hora) return null;
  if (!TIME_REGEX.test(hora)) return null;
  return hora.length === 5 ? `${hora}:00` : hora;
};

const normalizarDiasSemana = (dias: unknown): number[] | null => {
  if (!Array.isArray(dias)) return null;
  const normalizados = [...new Set(dias.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  return normalizados.length > 0 ? normalizados.sort((a, b) => a - b) : null;
};

const validarProgramacion = (payload: DescuentoConProgramacion) => {
  const {
    programado = false,
    fecha_inicio = null,
    fecha_fin = null,
    hora_inicio = null,
    hora_fin = null,
    dias_semana = null,
  } = payload;

  if (!programado) return null;

  if (fecha_inicio && !DATE_REGEX.test(fecha_inicio)) {
    return 'La fecha de inicio debe tener formato YYYY-MM-DD';
  }
  if (fecha_fin && !DATE_REGEX.test(fecha_fin)) {
    return 'La fecha de fin debe tener formato YYYY-MM-DD';
  }
  if (fecha_inicio && fecha_fin && fecha_inicio > fecha_fin) {
    return 'La fecha de inicio no puede ser mayor que la fecha de fin';
  }

  if (hora_inicio && !TIME_REGEX.test(hora_inicio)) {
    return 'La hora de inicio debe tener formato HH:mm';
  }
  if (hora_fin && !TIME_REGEX.test(hora_fin)) {
    return 'La hora de fin debe tener formato HH:mm';
  }

  if (dias_semana !== null) {
    if (!Array.isArray(dias_semana) || dias_semana.length === 0) {
      return 'Debes seleccionar al menos un día de la semana';
    }
    const diasInvalidos = dias_semana.some((d) => !Number.isInteger(d) || d < 0 || d > 6);
    if (diasInvalidos) {
      return 'Los días de semana deben estar entre 0 (domingo) y 6 (sábado)';
    }
  }

  return null;
};

const descuentoEstaVigente = (descuento: DescuentoConProgramacion & { activo?: boolean }) => {
  if (!descuento.activo) return false;
  if (!descuento.programado) return true;

  const ahora = getNowHNParts();
  const fechaInicio = descuento.fecha_inicio || null;
  const fechaFin = descuento.fecha_fin || null;
  const horaInicio = normalizarHora(descuento.hora_inicio);
  const horaFin = normalizarHora(descuento.hora_fin);
  const diasSemana = Array.isArray(descuento.dias_semana) ? descuento.dias_semana : null;

  if (fechaInicio && ahora.fecha < fechaInicio) return false;
  if (fechaFin && ahora.fecha > fechaFin) return false;

  if (diasSemana && diasSemana.length > 0 && !diasSemana.includes(ahora.diaSemana)) {
    return false;
  }

  if (horaInicio && horaFin) {
    // Soporta ventanas que cruzan medianoche (ej. 22:00-02:00)
    const enRangoNormal = horaInicio <= horaFin && ahora.hora >= horaInicio && ahora.hora <= horaFin;
    const enRangoCruzaMedianoche = horaInicio > horaFin && (ahora.hora >= horaInicio || ahora.hora <= horaFin);
    if (!enRangoNormal && !enRangoCruzaMedianoche) return false;
  } else if (horaInicio && ahora.hora < horaInicio) {
    return false;
  } else if (horaFin && ahora.hora > horaFin) {
    return false;
  }

  return true;
};

// Obtener todos los descuentos
export const getDescuentos = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { data, error } = await client
      .from('descuentos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('Error al obtener descuentos:', error);
    return reply.code(500).send({
      success: false,
      message: 'Error al obtener descuentos',
      error: error.message
    });
  }
};

// Obtener descuento por ID
export const getDescuentoById = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = (request.params as any);

    const { data, error } = await client
      .from('descuentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return reply.code(404).send({
        success: false,
        message: 'Descuento no encontrado'
      });
    }

    return reply.code(200).send({
      success: true,
      data: data
    });
  } catch (error: any) {
    console.error('Error al obtener descuento:', error);
    return reply.code(500).send({
      success: false,
      message: 'Error al obtener descuento',
      error: error.message
    });
  }
};

// Obtener solo descuentos activos
export const getDescuentosActivos = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { data, error } = await client
      .from('descuentos')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    const descuentosVigentes = (data || []).filter(descuentoEstaVigente);

    return reply.code(200).send({
      success: true,
      data: descuentosVigentes
    });
  } catch (error: any) {
    console.error('Error al obtener descuentos activos:', error);
    return reply.code(500).send({
      success: false,
      message: 'Error al obtener descuentos activos',
      error: error.message
    });
  }
};

// Crear nuevo descuento
export const createDescuento = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const {
      nombre,
      porcentaje,
      activo = true,
      programado = false,
      fecha_inicio = null,
      fecha_fin = null,
      hora_inicio = null,
      hora_fin = null,
      dias_semana = null,
    } = (request.body as any);

    // Validaciones
    if (!nombre || nombre.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'El nombre del descuento es requerido'
      });
    }

    if (porcentaje === undefined || porcentaje === null || porcentaje <= 0 || porcentaje > 100) {
      return reply.code(400).send({
        success: false,
        message: 'El porcentaje debe ser un número entre 1 y 100'
      });
    }

    const programacionNormalizada: DescuentoConProgramacion = {
      programado: Boolean(programado),
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      hora_inicio: normalizarHora(hora_inicio),
      hora_fin: normalizarHora(hora_fin),
      dias_semana: normalizarDiasSemana(dias_semana),
    };

    const errorProgramacion = validarProgramacion(programacionNormalizada);
    if (errorProgramacion) {
      return reply.code(400).send({
        success: false,
        message: errorProgramacion,
      });
    }

    const { data, error } = await client
      .from('descuentos')
      .insert({
        nombre: nombre.trim(),
        porcentaje: Number(porcentaje),
        activo: Boolean(activo),
        programado: programacionNormalizada.programado,
        fecha_inicio: programacionNormalizada.programado ? programacionNormalizada.fecha_inicio : null,
        fecha_fin: programacionNormalizada.programado ? programacionNormalizada.fecha_fin : null,
        hora_inicio: programacionNormalizada.programado ? programacionNormalizada.hora_inicio : null,
        hora_fin: programacionNormalizada.programado ? programacionNormalizada.hora_fin : null,
        dias_semana: programacionNormalizada.programado ? programacionNormalizada.dias_semana : null,
      })
      .select()
      .single();

    if (error) throw error;

    return reply.code(201).send({
      success: true,
      data: data,
      message: 'Descuento creado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al crear descuento:', error);
    return reply.code(500).send({
      success: false,
      message: 'Error al crear descuento',
      error: error.message
    });
  }
};

// Actualizar descuento existente
export const updateDescuento = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = (request.params as any);
    const {
      nombre,
      porcentaje,
      activo,
      programado,
      fecha_inicio,
      fecha_fin,
      hora_inicio,
      hora_fin,
      dias_semana,
    } = (request.body as any);

    // Validaciones
    if (nombre !== undefined && nombre.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'El nombre del descuento no puede estar vacío'
      });
    }

    if (porcentaje !== undefined && (porcentaje <= 0 || porcentaje > 100)) {
      return reply.code(400).send({
        success: false,
        message: 'El porcentaje debe ser un número entre 1 y 100'
      });
    }

    const { data: descuentoActual, error: errorActual } = await client
      .from('descuentos')
      .select('*')
      .eq('id', id)
      .single();

    if (errorActual || !descuentoActual) {
      return reply.code(404).send({
        success: false,
        message: 'Descuento no encontrado'
      });
    }

    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre.trim();
    if (porcentaje !== undefined) updateData.porcentaje = Number(porcentaje);
    if (activo !== undefined) updateData.activo = Boolean(activo);

    if (programado !== undefined) {
      updateData.programado = Boolean(programado);
    }
    if (fecha_inicio !== undefined) {
      updateData.fecha_inicio = fecha_inicio || null;
    }
    if (fecha_fin !== undefined) {
      updateData.fecha_fin = fecha_fin || null;
    }
    if (hora_inicio !== undefined) {
      updateData.hora_inicio = normalizarHora(hora_inicio);
    }
    if (hora_fin !== undefined) {
      updateData.hora_fin = normalizarHora(hora_fin);
    }
    if (dias_semana !== undefined) {
      updateData.dias_semana = normalizarDiasSemana(dias_semana);
    }

    const mergedProgramacion: DescuentoConProgramacion = {
      programado: updateData.programado ?? descuentoActual.programado ?? false,
      fecha_inicio: updateData.fecha_inicio ?? descuentoActual.fecha_inicio ?? null,
      fecha_fin: updateData.fecha_fin ?? descuentoActual.fecha_fin ?? null,
      hora_inicio: updateData.hora_inicio ?? descuentoActual.hora_inicio ?? null,
      hora_fin: updateData.hora_fin ?? descuentoActual.hora_fin ?? null,
      dias_semana: updateData.dias_semana ?? descuentoActual.dias_semana ?? null,
    };

    const errorProgramacion = validarProgramacion(mergedProgramacion);
    if (errorProgramacion) {
      return reply.code(400).send({
        success: false,
        message: errorProgramacion,
      });
    }

    if (!mergedProgramacion.programado) {
      updateData.fecha_inicio = null;
      updateData.fecha_fin = null;
      updateData.hora_inicio = null;
      updateData.hora_fin = null;
      updateData.dias_semana = null;
    }

    const { data, error } = await client
      .from('descuentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return reply.code(404).send({
        success: false,
        message: 'Descuento no encontrado'
      });
    }

    return reply.code(200).send({
      success: true,
      data: data,
      message: 'Descuento actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al actualizar descuento:', error);
    return reply.code(500).send({
      success: false,
      message: 'Error al actualizar descuento',
      error: error.message
    });
  }
};

// Eliminar descuento
export const deleteDescuento = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = (request.params as any);

    const { error } = await client
      .from('descuentos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      message: 'Descuento eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar descuento:', error);
    return reply.code(500).send({
      success: false,
      message: 'Error al eliminar descuento',
      error: error.message
    });
  }
};
