import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase, supabaseAdmin } from '../supabase/supabase';

const TEGUCIGALPA_TIME_ZONE = 'America/Tegucigalpa';

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TEGUCIGALPA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const formatDateKeyInTegucigalpa = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  const parts = DATE_KEY_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('No se pudo formatear la fecha para America/Tegucigalpa');
  }

  return `${year}-${month}-${day}`;
};

const parseDateKeyStartUtc = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 6, 0, 0, 0));
};

const parseDateKeyNextStartUtc = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1, 6, 0, 0, 0));
};

const applyFacturaDateFilters = <T extends { gte: Function; lt: Function }>(
  query: T,
  fechaInicio?: string,
  fechaFin?: string,
) => {
  let nextQuery = query;

  if (fechaInicio) {
    nextQuery = nextQuery.gte('fecha_factura', parseDateKeyStartUtc(fechaInicio).toISOString());
  }

  if (fechaFin) {
    nextQuery = nextQuery.lt('fecha_factura', parseDateKeyNextStartUtc(fechaFin).toISOString());
  }

  return nextQuery;
};

const buildTodayFacturaRange = () => {
  const todayKey = formatDateKeyInTegucigalpa(new Date());
  return {
    fechaInicio: todayKey,
    fechaFin: todayKey,
  };
};

/**
 * Extrae el número correlativo de un string de rango autorizado.
 * Ej: "000-001-01-00000251" -> 251
 */
const extraerNumeroDeRango = (rango: string): number => {
  const partes = rango.split('-');
  const ultimaParte = partes[partes.length - 1];
  return parseInt(ultimaParte, 10);
};

/**
 * Construye el número de factura completo dado un prefijo y un número correlativo.
 * Ej: prefijo "000-001-01", numero 195 -> "000-001-01-00000195"
 */
const construirNumeroFactura = (rangoInicial: string, numero: number): string => {
  const partes = rangoInicial.split('-');
  const prefijo = partes.slice(0, 3).join('-');
  const padded = numero.toString().padStart(8, '0');
  return `${prefijo}-${padded}`;
};

const getClient = () => supabaseAdmin || supabase;

const resolveRestaurantePrincipalId = async (restauranteId: string): Promise<string> => {
  const client = getClient();

  const { data: restaurante, error: restauranteError } = await client
    .from('restaurantes')
    .select('id, propietario_id')
    .eq('id', restauranteId)
    .single();

  if (restauranteError || !restaurante) {
    return restauranteId;
  }

  if (!restaurante.propietario_id) {
    return restauranteId;
  }

  const { data: propietarioInfo, error: propietarioError } = await client
    .from('usuarios_info')
    .select('restaurante_id')
    .eq('id', restaurante.propietario_id)
    .single();

  if (propietarioError || !propietarioInfo?.restaurante_id) {
    return restauranteId;
  }

  return propietarioInfo.restaurante_id;
};

const getDatosFiscalesActivos = async (restauranteId: string) => {
  const client = getClient();
  const restaurantePrincipalId = await resolveRestaurantePrincipalId(restauranteId);

  const { data, error } = await client
    .from('datos_fiscales')
    .select('*')
    .eq('restaurante_id', restaurantePrincipalId)
    .eq('activo', true)
    .single();

  return {
    data,
    error,
    restaurantePrincipalId,
  };
};

export const facturacionController = {
  // ==================== DATOS FISCALES ====================

  // Obtener datos fiscales activos de un restaurante
  async getDatosFiscales(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };
      const { data, error } = await getDatosFiscalesActivos(restaurante_id);

      if (error && error.code !== 'PGRST116') {
        return reply.code(400).send({ error: error.message });
      }

      reply.send({ data: data || null });
    } catch (error) {
      console.error('Error getting datos fiscales:', error);
      throw error;
    }
  },

  // Crear datos fiscales
  async createDatosFiscales(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const {
        restaurante_id,
        nombre_negocio,
        rtn_negocio,
        direccion_negocio,
        correo_negocio,
        telefono_negocio,
        codigo_cai,
        rango_autorizado_inicial,
        rango_autorizado_final,
        fecha_limite_emision
      } = request.body as {
        restaurante_id: string;
        nombre_negocio: string;
        rtn_negocio: string;
        direccion_negocio?: string;
        correo_negocio?: string;
        telefono_negocio?: string;
        codigo_cai: string;
        rango_autorizado_inicial: string;
        rango_autorizado_final: string;
        fecha_limite_emision: string;
      };

      if (!restaurante_id || !nombre_negocio || !rtn_negocio || !codigo_cai ||
          !rango_autorizado_inicial || !rango_autorizado_final || !fecha_limite_emision) {
        return reply.code(400).send({
          error: 'Faltan campos obligatorios: restaurante_id, nombre_negocio, rtn_negocio, codigo_cai, rango_autorizado_inicial, rango_autorizado_final, fecha_limite_emision'
        });
      }

      const client = supabaseAdmin || supabase;
      const restaurantePrincipalId = await resolveRestaurantePrincipalId(restaurante_id);

      if (restaurante_id !== restaurantePrincipalId) {
        return reply.code(400).send({
          error: 'Los datos fiscales se administran únicamente desde el restaurante principal.'
        });
      }

      // Verificar permisos según rol
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol !== 1 && id_rol !== 2) {
        if (request.user_info.restaurante_id !== restaurante_id) {
          return reply.code(403).send({
            error: 'No tienes acceso a este restaurante'
          });
        }
      }

      // Desactivar datos fiscales anteriores del mismo restaurante
      await client
        .from('datos_fiscales')
        .update({ activo: false })
        .eq('restaurante_id', restaurante_id)
        .eq('activo', true);

      // Calcular numero_actual basado en rango inicial
      const numeroInicial = extraerNumeroDeRango(rango_autorizado_inicial);

      const { data, error } = await client
        .from('datos_fiscales')
        .insert({
          restaurante_id,
          nombre_negocio,
          rtn_negocio,
          direccion_negocio: direccion_negocio || null,
          correo_negocio: correo_negocio || null,
          telefono_negocio: telefono_negocio || null,
          codigo_cai,
          rango_autorizado_inicial,
          rango_autorizado_final,
          fecha_limite_emision,
          numero_actual: numeroInicial - 1,
          activo: true
        })
        .select('*')
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      return reply.code(201).send({ data });
    } catch (error) {
      console.error('Error creating datos fiscales:', error);
      throw error;
    }
  },

  // Actualizar datos fiscales
  async updateDatosFiscales(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const { id } = request.params as { id: string };
      const {
        nombre_negocio,
        rtn_negocio,
        direccion_negocio,
        correo_negocio,
        telefono_negocio,
        codigo_cai,
        rango_autorizado_inicial,
        rango_autorizado_final,
        fecha_limite_emision
      } = request.body as {
        nombre_negocio?: string;
        rtn_negocio?: string;
        direccion_negocio?: string;
        correo_negocio?: string;
        telefono_negocio?: string;
        codigo_cai?: string;
        rango_autorizado_inicial?: string;
        rango_autorizado_final?: string;
        fecha_limite_emision?: string;
      };

      const client = supabaseAdmin || supabase;

      // Verificar que existe
      const { data: existing, error: findError } = await client
        .from('datos_fiscales')
        .select('id, restaurante_id')
        .eq('id', id)
        .single();

      if (findError || !existing) {
        return reply.code(404).send({ error: 'Datos fiscales no encontrados' });
      }

      const restaurantePrincipalId = await resolveRestaurantePrincipalId(existing.restaurante_id);
      if (existing.restaurante_id !== restaurantePrincipalId) {
        return reply.code(400).send({
          error: 'Los datos fiscales se administran únicamente desde el restaurante principal.'
        });
      }

      // Verificar permisos
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol !== 1 && id_rol !== 2) {
        if (request.user_info.restaurante_id !== existing.restaurante_id) {
          return reply.code(403).send({
            error: 'No tienes acceso a estos datos fiscales'
          });
        }
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (nombre_negocio !== undefined) updateData.nombre_negocio = nombre_negocio;
      if (rtn_negocio !== undefined) updateData.rtn_negocio = rtn_negocio;
      if (direccion_negocio !== undefined) updateData.direccion_negocio = direccion_negocio;
      if (correo_negocio !== undefined) updateData.correo_negocio = correo_negocio;
      if (telefono_negocio !== undefined) updateData.telefono_negocio = telefono_negocio;
      if (codigo_cai !== undefined) updateData.codigo_cai = codigo_cai;
      if (rango_autorizado_inicial !== undefined) updateData.rango_autorizado_inicial = rango_autorizado_inicial;
      if (rango_autorizado_final !== undefined) updateData.rango_autorizado_final = rango_autorizado_final;
      if (fecha_limite_emision !== undefined) updateData.fecha_limite_emision = fecha_limite_emision;

      const { data, error } = await client
        .from('datos_fiscales')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      reply.send({ data });
    } catch (error) {
      console.error('Error updating datos fiscales:', error);
      throw error;
    }
  },

  // ==================== FACTURAS ====================

  // Obtener facturas de un restaurante (con paginación y filtros)
  async getFacturas(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };
      const { page = 1, limit = 20, fecha_inicio, fecha_fin, estado } = request.query as {
        page?: number;
        limit?: number;
        fecha_inicio?: string;
        fecha_fin?: string;
        estado?: string;
      };

      const client = supabaseAdmin || supabase;
      let query = client
        .from('facturas')
        .select('*, pedidos(id, numero_ticket, tipo_pedido, estado_pedido, created_at)')
        .eq('restaurante_id', restaurante_id)
        .order('fecha_factura', { ascending: false });

      query = applyFacturaDateFilters(query, fecha_inicio, fecha_fin);
      if (estado) {
        query = query.eq('estado', estado);
      }

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error } = await query.range(from, to);

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      // Conteo total
      let countQuery = client
        .from('facturas')
        .select('*', { count: 'exact', head: true })
        .eq('restaurante_id', restaurante_id);

      countQuery = applyFacturaDateFilters(countQuery, fecha_inicio, fecha_fin);
      if (estado) {
        countQuery = countQuery.eq('estado', estado);
      }

      const { count } = await countQuery;

      reply.send({
        data: data || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting facturas:', error);
      throw error;
    }
  },

  // Obtener facturas del día
  async getFacturasHoy(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };
      const client = supabaseAdmin || supabase;
      const { fechaInicio, fechaFin } = buildTodayFacturaRange();

      const { data, error } = await applyFacturaDateFilters(
        client
        .from('facturas')
        .select('*, pedidos(id, numero_ticket, tipo_pedido, estado_pedido, created_at)')
        .eq('restaurante_id', restaurante_id)
        .order('fecha_factura', { ascending: false }),
        fechaInicio,
        fechaFin,
      );

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      reply.send({ data: data || [] });
    } catch (error) {
      console.error('Error getting facturas de hoy:', error);
      throw error;
    }
  },

  // Obtener detalle de una factura
  async getFacturaDetalle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const client = supabaseAdmin || supabase;

      const { data, error } = await client
        .from('facturas')
        .select(`
          *,
          datos_fiscales(*),
          pedidos(id, numero_ticket, tipo_pedido, estado_pedido, created_at)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      reply.send({ data });
    } catch (error) {
      console.error('Error getting factura detalle:', error);
      throw error;
    }
  },

  // Resumen de facturas del día
  async getResumenDia(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };
      const {
        fecha_inicio,
        fecha_fin,
        estado,
        scope,
      } = request.query as {
        fecha_inicio?: string;
        fecha_fin?: string;
        estado?: string;
        scope?: 'today' | 'historial';
      };
      const client = supabaseAdmin || supabase;

      const shouldUseTodayByDefault = scope !== 'historial' && !fecha_inicio && !fecha_fin;
      const range = shouldUseTodayByDefault
        ? buildTodayFacturaRange()
        : { fechaInicio: fecha_inicio, fechaFin: fecha_fin };

      let query = client
        .from('facturas')
        .select('total, isv, estado')
        .eq('restaurante_id', restaurante_id);

      query = applyFacturaDateFilters(query, range.fechaInicio, range.fechaFin);

      if (estado) {
        query = query.eq('estado', estado);
      }

      const { data, error } = await query;

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      const facturas = data || [];
      const emitidas = facturas.filter(f => f.estado === 'emitida');

      reply.send({
        data: {
          total_facturado: emitidas.reduce((sum, f) => sum + Number(f.total), 0),
          total_isv: emitidas.reduce((sum, f) => sum + Number(f.isv), 0),
          cantidad_facturas: emitidas.length,
          cantidad_anuladas: facturas.filter(f => f.estado === 'anulada').length
        }
      });
    } catch (error) {
      console.error('Error getting resumen del día:', error);
      throw error;
    }
  },

  // Anular una factura
  async anularFactura(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const { id } = request.params as { id: string };
      const client = supabaseAdmin || supabase;

      const { data: facturaExistente, error: findError } = await client
        .from('facturas')
        .select('id, restaurante_id, estado')
        .eq('id', id)
        .single();

      if (findError || !facturaExistente) {
        return reply.code(404).send({ error: 'Factura no encontrada' });
      }

      if (facturaExistente.estado === 'anulada') {
        return reply.code(400).send({ error: 'La factura ya está anulada' });
      }

      // Verificar permisos
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol !== 1 && id_rol !== 2) {
        if (request.user_info.restaurante_id !== facturaExistente.restaurante_id) {
          return reply.code(403).send({
            error: 'No tienes acceso a esta factura'
          });
        }
      }

      const { data, error } = await client
        .from('facturas')
        .update({ estado: 'anulada' })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      reply.send({ data });
    } catch (error) {
      console.error('Error anulando factura:', error);
      throw error;
    }
  },

  // Generar factura desde un pedido
  async generarFactura(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const {
        pedido_id,
        restaurante_id,
        nombre_cliente,
        rtn_cliente,
        metodo_pago_id
      } = request.body as {
        pedido_id: string;
        restaurante_id: string;
        nombre_cliente?: string;
        rtn_cliente?: string;
        metodo_pago_id?: string;
      };

      if (!pedido_id || !restaurante_id) {
        return reply.code(400).send({
          error: 'Faltan campos obligatorios: pedido_id, restaurante_id'
        });
      }

      const client = supabaseAdmin || supabase;

      // 0. Verificar si ya existe una factura para este pedido
      const { data: facturaExistente } = await client
        .from('facturas')
        .select('*, datos_fiscales:datos_fiscales_id(*)')
        .eq('pedido_id', pedido_id)
        .eq('estado', 'emitida')
        .maybeSingle();

      if (facturaExistente) {
        const { datos_fiscales: df, ...facturaSinDf } = facturaExistente;
        return reply.code(200).send({
          data: {
            factura: facturaSinDf,
            datos_fiscales: df
          }
        });
      }

      // 1. Obtener datos fiscales activos
      const {
        data: datosFiscales,
        error: dfError,
      } = await getDatosFiscalesActivos(restaurante_id);

      if (dfError || !datosFiscales) {
        return reply.code(400).send({
          error: 'No se encontraron datos fiscales activos para este restaurante ni para su restaurante principal. Configure los datos de facturación en el principal.'
        });
      }

      // 2. Validar fecha límite de emisión
      const fechaLimite = new Date(datosFiscales.fecha_limite_emision);
      if (new Date() > fechaLimite) {
        return reply.code(400).send({
          error: 'La fecha límite de emisión ha expirado. Actualice los datos fiscales con un nuevo CAI.'
        });
      }

      // 3. Validar rango disponible
      const rangoFinal = extraerNumeroDeRango(datosFiscales.rango_autorizado_final);
      const siguienteNumero = datosFiscales.numero_actual + 1;

      if (siguienteNumero > rangoFinal) {
        return reply.code(400).send({
          error: 'Se ha agotado el rango autorizado de facturación. Solicite un nuevo rango.'
        });
      }

      // 4. Obtener datos del pedido
      const { data: pedido, error: pedidoError } = await client
        .from('pedidos')
        .select('*')
        .eq('id', pedido_id)
        .single();

      if (pedidoError || !pedido) {
        return reply.code(404).send({ error: 'Pedido no encontrado' });
      }

      // 5. Construir número de factura
      const numeroFactura = construirNumeroFactura(
        datosFiscales.rango_autorizado_inicial,
        siguienteNumero
      );

      // 6. Incrementar numero_actual atómicamente
      const { error: updateError } = await client
        .from('datos_fiscales')
        .update({ numero_actual: siguienteNumero })
        .eq('id', datosFiscales.id)
        .eq('numero_actual', datosFiscales.numero_actual); // Optimistic locking

      if (updateError) {
        return reply.code(500).send({
          error: 'Error al actualizar el correlativo. Intente de nuevo.'
        });
      }

      // 7. Crear la factura
      const { data: factura, error: facturaError } = await client
        .from('facturas')
        .insert({
          restaurante_id,
          pedido_id,
          datos_fiscales_id: datosFiscales.id,
          usuario_id: request.user_info.id || null,
          numero_factura: numeroFactura,
          nombre_cliente: nombre_cliente || 'Consumidor final',
          rtn_cliente: rtn_cliente || null,
          subtotal: pedido.subtotal,
          descuento: pedido.descuento,
          importe_exento: pedido.importe_exento || 0,
          importe_exonerado: pedido.importe_exonerado || 0,
          importe_gravado: pedido.importe_gravado || 0,
          isv: pedido.impuesto,
          total: pedido.total,
          metodo_pago_id: metodo_pago_id || pedido.metodo_pago_id
        })
        .select('*')
        .single();

      if (facturaError) {
        return reply.code(400).send({ error: facturaError.message });
      }

      // Devolver factura + datos fiscales para generar PDF
      return reply.code(201).send({
        data: {
          factura,
          datos_fiscales: datosFiscales
        }
      });
    } catch (error) {
      console.error('Error generando factura:', error);
      throw error;
    }
  }
};
