import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase, supabaseAdmin } from '../supabase/supabase';
import notificacionesService from '../services/notificacionesService';
import { getHondurasDate, getStartOfDayHonduras, getEndOfDayHonduras, toISOStringHonduras } from '../utils/dateUtils';
import {
  FILTRO_PEDIDOS_CUENTAN_CAJA,
  sumarMontoGastosEfectivo,
  calcularEfectivoEsperadoCaja,
} from '../utils/cajaCuadre';

type CajaRecord = {
  usuario_id?: string | null;
  usuario_nombre?: string | null;
};

const enrichCajasWithUsuarioNombre = async <T extends CajaRecord>(
  cajas: T[]
): Promise<(T & { usuario_nombre: string | null })[]> => {
  if (!cajas.length) {
    return cajas.map((caja) => ({ ...caja, usuario_nombre: caja.usuario_nombre ?? null }));
  }

  const usuarioIds = Array.from(
    new Set(
      cajas
        .map((caja) => caja.usuario_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  if (!usuarioIds.length) {
    return cajas.map((caja) => ({ ...caja, usuario_nombre: caja.usuario_nombre ?? null }));
  }

  const client = supabaseAdmin || supabase;
  const { data: usuarios, error } = await client
    .from('usuarios_info')
    .select('id, nombre_usuario')
    .in('id', usuarioIds);

  if (error) {
    console.error('Error fetching usuario info for cajas:', error);
    return cajas.map((caja) => ({ ...caja, usuario_nombre: caja.usuario_nombre ?? null }));
  }

  const nombres = new Map<string, string | null>(
    (usuarios || []).map((usuario: { id: string; nombre_usuario: string | null }) => [
      usuario.id,
      usuario.nombre_usuario ?? null
    ])
  );

  return cajas.map((caja) => ({
    ...caja,
    usuario_nombre: caja.usuario_id ? nombres.get(caja.usuario_id) ?? null : null
  }));
};

export const cajaController = {
  // Obtener todas las cajas de todos los restaurantes (solo administradores)
  async getAllCajas(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = 1, limit = 10, estado, restaurante_id, fecha_desde, fecha_hasta } = request.query as { page?: number; limit?: number; estado?: string; restaurante_id?: string; fecha_desde?: string; fecha_hasta?: string };

      const client = supabaseAdmin || supabase;
      let query = client
        .from('caja')
        .select(`
          *,
          restaurantes:restaurante_id (
            id,
            nombre_restaurante
          )
        `)
        .order('fecha_apertura', { ascending: false });

      // Filtros opcionales
      if (estado) {
        query = query.eq('estado', estado);
      }

      if (restaurante_id) {
        query = query.eq('restaurante_id', restaurante_id);
      }

      // Filtros de fecha
      if (fecha_desde) {
        const fechaDesde = getStartOfDayHonduras(fecha_desde as string);
        query = query.gte('fecha_apertura', toISOStringHonduras(fechaDesde));
      }

      if (fecha_hasta) {
        const fechaHasta = getEndOfDayHonduras(fecha_hasta as string);
        query = query.lte('fecha_apertura', toISOStringHonduras(fechaHasta));
      }

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error } = await query.range(from, to);

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      let countQuery = client
        .from('caja')
        .select('*', { count: 'exact', head: true });

      if (estado) {
        countQuery = countQuery.eq('estado', estado);
      }

      if (restaurante_id) {
        countQuery = countQuery.eq('restaurante_id', restaurante_id);
      }

      if (fecha_desde) {
        const fechaDesde = getStartOfDayHonduras(fecha_desde as string);
        countQuery = countQuery.gte('fecha_apertura', toISOStringHonduras(fechaDesde));
      }

      if (fecha_hasta) {
        const fechaHasta = getEndOfDayHonduras(fecha_hasta as string);
        countQuery = countQuery.lte('fecha_apertura', toISOStringHonduras(fechaHasta));
      }

      const { count } = await countQuery;

      const dataWithUsuarios = await enrichCajasWithUsuarioNombre(data || []);

      // Agregar información del restaurante a cada caja
      const dataWithRestaurant = dataWithUsuarios.map(caja => ({
        ...caja,
        restaurante_nombre: caja.restaurantes?.nombre_restaurante || 'Restaurante desconocido'
      }));

      reply.send({
        data: dataWithRestaurant,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting all cajas:', error);
      throw error;
    }
  },

  // Obtener todas las cajas abiertas de todos los restaurantes (solo administradores)
  async getAllCajasAbiertas(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = 1, limit = 10, restaurante_id } = request.query as { page?: number; limit?: number; restaurante_id?: string };

      const client = supabaseAdmin || supabase;
      let query = client
        .from('caja')
        .select(`
          *,
          restaurantes:restaurante_id (
            id,
            nombre_restaurante
          )
        `)
        .eq('estado', 'abierta')
        .order('fecha_apertura', { ascending: false });

      if (restaurante_id) {
        query = query.eq('restaurante_id', restaurante_id);
      }

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error } = await query.range(from, to);

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      let countQuery = client
        .from('caja')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'abierta');

      if (restaurante_id) {
        countQuery = countQuery.eq('restaurante_id', restaurante_id);
      }

      const { count } = await countQuery;

      const dataWithUsuarios = await enrichCajasWithUsuarioNombre(data || []);

      // Agregar información del restaurante a cada caja
      const dataWithRestaurant = dataWithUsuarios.map(caja => ({
        ...caja,
        restaurante_nombre: caja.restaurantes?.nombre_restaurante || 'Restaurante desconocido'
      }));

      reply.send({
        data: dataWithRestaurant,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting all open cajas:', error);
      throw error;
    }
  },

  // Obtener todas las cajas de un restaurante
  async getCajas(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };
      const { page = 1, limit = 10, estado, fecha_desde, fecha_hasta } = request.query as { page?: number; limit?: number; estado?: string; fecha_desde?: string; fecha_hasta?: string };

      const client = supabaseAdmin || supabase;
      let query = client
        .from('caja')
        .select(`
          *,
          restaurantes:restaurante_id (
            id,
            nombre_restaurante
          )
        `)
        .eq('restaurante_id', restaurante_id)
        .order('fecha_apertura', { ascending: false });

      if (estado) {
        query = query.eq('estado', estado);
      }

      // Filtros de fecha
      if (fecha_desde) {
        const fechaDesde = getStartOfDayHonduras(fecha_desde as string);
        query = query.gte('fecha_apertura', toISOStringHonduras(fechaDesde));
      }

      if (fecha_hasta) {
        const fechaHasta = getEndOfDayHonduras(fecha_hasta as string);
        query = query.lte('fecha_apertura', toISOStringHonduras(fechaHasta));
      }

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error } = await query.range(from, to);

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      let countQuery = client
        .from('caja')
        .select('*', { count: 'exact', head: true })
        .eq('restaurante_id', restaurante_id);

      if (estado) {
        countQuery = countQuery.eq('estado', estado);
      }

      if (fecha_desde) {
        const fechaDesde = getStartOfDayHonduras(fecha_desde as string);
        countQuery = countQuery.gte('fecha_apertura', toISOStringHonduras(fechaDesde));
      }

      if (fecha_hasta) {
        const fechaHasta = getEndOfDayHonduras(fecha_hasta as string);
        countQuery = countQuery.lte('fecha_apertura', toISOStringHonduras(fechaHasta));
      }

      const { count } = await countQuery;

      const dataWithUsuarios = await enrichCajasWithUsuarioNombre(data || []);

      // Agregar información del restaurante a cada caja
      const dataWithRestaurant = dataWithUsuarios.map(caja => ({
        ...caja,
        restaurante_nombre: (caja as any).restaurantes?.nombre_restaurante || null
      }));

      reply.send({
        data: dataWithRestaurant,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting cajas:', error);
      throw error;
    }
  },

  // Obtener caja actual (abierta) de un restaurante específico
  async getCajaActual(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };

      console.log('🔍 [GET CAJA ACTUAL] Restaurante ID solicitado:', restaurante_id);

      const client = supabaseAdmin || supabase;
      // Buscar caja abierta del restaurante específico
      const { data, error } = await client
        .from('caja')
        .select(`
          *,
          restaurantes:restaurante_id (
            id,
            nombre_restaurante
          )
        `)
        .eq('estado', 'abierta')
        .eq('restaurante_id', restaurante_id)
        .order('fecha_apertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔍 [GET CAJA ACTUAL] Caja encontrada:', data ? { id: data.id, restaurante_id: data.restaurante_id } : 'null');

      if (error && error.code !== 'PGRST116') {
        console.error('Error al obtener caja actual:', error);
        return reply.code(400).send({ error: error.message });
      }

      const cajaActual = error && error.code === 'PGRST116' ? null : data;
      const [cajaActualWithNombre] = await enrichCajasWithUsuarioNombre(cajaActual ? [cajaActual] : []);

      // Agregar información del restaurante
      const cajaWithRestaurant = cajaActualWithNombre ? {
        ...cajaActualWithNombre,
        restaurante_nombre: (cajaActual as any)?.restaurantes?.nombre_restaurante || 'Restaurante desconocido'
      } : null;

      reply.send({ data: cajaWithRestaurant });
    } catch (error) {
      console.error('Error getting caja actual:', error);
      throw error;
    }
  },

  // Obtener resumen de caja del día de un restaurante específico
  async getResumenCaja(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };
      const { fecha } = request.query as { fecha?: string };

      const client = supabaseAdmin || supabase;
      // Obtener caja actual del restaurante específico
      const { data: cajaActual, error: cajaError } = await client
        .from('caja')
        .select(`
          *,
          restaurantes:restaurante_id (
            id,
            nombre_restaurante
          )
        `)
        .eq('estado', 'abierta')
        .eq('restaurante_id', restaurante_id)
        .order('fecha_apertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cajaError && cajaError.code !== 'PGRST116') {
        return reply.code(400).send({ error: cajaError.message });
      }

      const [cajaActualWithNombre] = await enrichCajasWithUsuarioNombre(
        cajaActual ? [cajaActual] : []
      );

      // Agregar información del restaurante a la caja actual
      const cajaActualWithRestaurant = cajaActualWithNombre ? {
        ...cajaActualWithNombre,
        restaurante_nombre: (cajaActual as any)?.restaurantes?.nombre_restaurante || 'Restaurante desconocido'
      } : null;

      // Si no hay caja abierta, devolver resumen vacío
      if (!cajaActualWithRestaurant) {
        return reply.send({ 
          data: {
            caja_actual: null,
            total_ventas_dia: 0,
            ventas_efectivo: 0,
            ventas_pos: 0,
            ventas_transferencia: 0,
            total_ingresos_dia: 0,
            total_egresos_dia: 0,
            total_gastos_dia: 0,
            gastos_efectivo_dia: 0,
            gastos_dia: [],
            diferencia: 0
          }
        });
      }

      // Usar el restaurante_id de la caja abierta para calcular ventas y gastos
      const restauranteIdCaja = cajaActualWithRestaurant.restaurante_id;

      // Ventas: desde la apertura de esta caja hasta ahora (sesión real), no solo el calendario “hoy”
      const aperturaISO = cajaActualWithRestaurant.fecha_apertura;
      const hastaISO = toISOStringHonduras(getHondurasDate());

      // Obtener ventas de la sesión con método de pago (del restaurante de la caja abierta)
      const { data: todasVentas, error: ventasError } = await client
        .from('pedidos')
        .select('total, metodo_pago_id')
        .eq('restaurante_id', restauranteIdCaja)
        .or(FILTRO_PEDIDOS_CUENTAN_CAJA)
        .gte('created_at', aperturaISO)
        .lte('created_at', hastaISO);

      if (ventasError) {
        return reply.code(400).send({ error: ventasError.message });
      }

      // Calcular ventas por método de pago
      const ventasEfectivo = todasVentas?.filter(v => v.metodo_pago_id === 1).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const ventasPOS = todasVentas?.filter(v => v.metodo_pago_id === 2).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const ventasTransferencia = todasVentas?.filter(v => v.metodo_pago_id === 3).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const totalVentasDia = todasVentas?.reduce((sum, venta) => sum + Number(venta.total), 0) || 0;

      // Obtener gastos de la sesión real de caja (desde apertura hasta ahora)
      const { data: gastos, error: gastosError } = await client
        .from('gastos')
        .select('*')
        .eq('restaurante_id', restauranteIdCaja)
        .gte('fecha_gasto', aperturaISO)
        .lte('fecha_gasto', hastaISO);

      if (gastosError) {
        return reply.code(400).send({ error: gastosError.message });
      }

      const totalGastosDia = gastos?.reduce((sum, gasto) => sum + Number(gasto.monto), 0) || 0;
      const gastosEfectivoDia = sumarMontoGastosEfectivo(gastos || []);

      // Obtener retiros de la sesión abierta
      let retirosDia: Array<{ id: string; nombre_responsable: string; hora_retiro: string; monto: number; observaciones?: string | null }> = [];
      let totalRetirosDia = 0;

      if (cajaActualWithRestaurant) {
        const { data: retiros, error: retirosError } = await client
          .from('retiros_caja')
          .select('id, nombre_responsable, hora_retiro, monto, observaciones')
          .eq('caja_id', cajaActualWithRestaurant.id)
          .order('hora_retiro', { ascending: true });

        if (!retirosError && retiros) {
          retirosDia = retiros;
          totalRetirosDia = retiros.reduce((sum, r) => sum + Number(r.monto), 0);
        }
      }

      const resumen = {
        caja_actual: cajaActualWithRestaurant || null,
        total_ventas_dia: totalVentasDia,
        ventas_efectivo: ventasEfectivo,
        ventas_pos: ventasPOS,
        ventas_transferencia: ventasTransferencia,
        total_ingresos_dia: cajaActualWithRestaurant?.total_ingresos || 0,
        total_egresos_dia: cajaActualWithRestaurant?.total_egresos || 0,
        total_gastos_dia: totalGastosDia,
        gastos_efectivo_dia: gastosEfectivoDia,
        gastos_dia: gastos || [],
        total_retiros_dia: totalRetirosDia,
        retiros_dia: retirosDia,
        diferencia: cajaActualWithRestaurant
          ? Number(cajaActualWithRestaurant.monto_final || 0) -
            Number(cajaActualWithRestaurant.monto_inicial) -
            totalVentasDia
          : 0
      };

      reply.send({ data: resumen });
    } catch (error) {
      console.error('Error getting resumen caja:', error);
      throw error;
    }
  },

  // Abrir caja
  async abrirCaja(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { restaurante_id, usuario_id, monto_inicial, observaciones } = request.body as { restaurante_id: string; usuario_id: string; monto_inicial: number; observaciones?: string };

      // Validar campos requeridos
      if (!restaurante_id) {
        return reply.code(400).send({ 
          error: 'El campo restaurante_id es requerido' 
        });
      }

      if (!usuario_id) {
        return reply.code(400).send({ 
          error: 'El campo usuario_id es requerido' 
        });
      }

      if (monto_inicial === undefined || monto_inicial === null) {
        return reply.code(400).send({ 
          error: 'El campo monto_inicial es requerido' 
        });
      }

      // Verificar permisos según rol
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede abrir caja en cualquier restaurante
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante
        const client = supabaseAdmin || supabase;
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(restaurante_id)) {
          return reply.code(403).send({ 
            error: 'No tienes acceso a este restaurante' 
          });
        }
      } else {
        // Usuarios con roles personalizados: verificar acceso via usuarios_restaurantes
        const client = supabaseAdmin || supabase;
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        // Si tiene acceso via usuarios_restaurantes O por restaurante_id directo, permitir
        const tieneAcceso = restaurantIds.includes(restaurante_id) || 
                           request.user_info.restaurante_id === restaurante_id;
        
        if (!tieneAcceso) {
          return reply.code(403).send({ 
            error: 'No puedes abrir caja para este restaurante' 
          });
        }
      }

      const client = supabaseAdmin || supabase;
      
      // VALIDACIÓN 1: Verificar si ya hay una caja abierta en ESTE restaurante
      const { data: cajaExistente, error: checkError } = await client
        .from('caja')
        .select('id, usuario_id, fecha_apertura, restaurante_id')
        .eq('estado', 'abierta')
        .eq('restaurante_id', restaurante_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar caja existente:', checkError);
        return reply.code(400).send({ error: checkError.message });
      }

      if (cajaExistente) {
        // Hay una caja abierta en este restaurante - no permitir abrir otra
        return reply.code(400).send({ 
          error: 'Ya existe una caja abierta en este restaurante. Debe cerrarla antes de abrir una nueva.',
          caja_existente: cajaExistente
        });
      }

      // VALIDACIÓN 2: Verificar última caja cerrada del día anterior
      const hoy = getStartOfDayHonduras();
      
      const { data: ultimaCaja } = await client
        .from('caja')
        .select('*')
        .eq('restaurante_id', restaurante_id)
        .eq('estado', 'cerrada')
        .order('fecha_cierre', { ascending: false })
        .limit(1)
        .single();

      // Si hay una caja anterior, validar que esté cerrada correctamente
      if (ultimaCaja) {
        const fechaCierre = new Date(ultimaCaja.fecha_cierre);
        const esDelDiaAnterior = fechaCierre < hoy;
        
        // Log para debugging pero no notificar
        if (!esDelDiaAnterior) {
          console.log('Advertencia: La última caja fue cerrada hoy');
        }

        // Validar cuadre de caja anterior
        const montoEsperado = Number(ultimaCaja.monto_inicial) + Number(ultimaCaja.total_ventas) - Number(ultimaCaja.total_egresos || 0);
        const montoReal = Number(ultimaCaja.monto_final);
        const diferencia = Math.abs(montoReal - montoEsperado);
        
        if (diferencia > 0.01) { // Tolerancia de 1 centavo
          console.log(`Advertencia: Caja anterior no cuadra. Diferencia: $${diferencia.toFixed(2)}`);
        }
      }

      // Crear nueva caja
      const { data, error } = await client
        .from('caja')
        .insert({
          restaurante_id,
          usuario_id,
          monto_inicial: Number(monto_inicial),
          observaciones,
          estado: 'abierta'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error al crear caja:', error);
        return reply.code(400).send({ 
          error: error.message,
          details: error.details,
          hint: error.hint
        });
      }

      const [dataWithNombre] = await enrichCajasWithUsuarioNombre(data ? [data] : []);

      console.log(`Caja abierta exitosamente con saldo inicial de $${Number(monto_inicial).toFixed(2)}`);

      return reply.code(201).send({ data: dataWithNombre || null });
    } catch (error) {
      console.error('Error opening caja:', error);
      throw error;
    }
  },

  // Cerrar caja
  async cerrarCaja(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = request.params as { id: string };
      const {
        monto_final,
        observaciones,
        ventas_pos_reportadas,
        ventas_transferencia_reportadas,
        gastos_reportados,
        ventas_efectivo_reportadas,
        denominacion_conteo
      } = request.body as { monto_final?: number; observaciones?: string; ventas_pos_reportadas?: unknown; ventas_transferencia_reportadas?: unknown; gastos_reportados?: unknown; ventas_efectivo_reportadas?: unknown; denominacion_conteo?: unknown };

      const client = supabaseAdmin || supabase;
      // Obtener caja actual
      const { data: cajaActual, error: cajaError } = await client
        .from('caja')
        .select('*')
        .eq('id', id)
        .eq('estado', 'abierta')
        .single();

      if (cajaError) {
        return reply.code(400).send({ error: 'Caja no encontrada o ya cerrada' });
      }

      // Verificar permisos según rol
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede cerrar cualquier caja
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante de la caja
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(cajaActual.restaurante_id)) {
          return reply.code(403).send({ 
            error: 'No tienes acceso a esta caja' 
          });
        }
      } else {
        // Usuarios con roles personalizados: verificar acceso via usuarios_restaurantes
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        // Si tiene acceso via usuarios_restaurantes, permitir
        // Si no, verificar por restaurante_id directo en usuarios_info
        const tieneAcceso = restaurantIds.includes(cajaActual.restaurante_id) || 
                           request.user_info.restaurante_id === cajaActual.restaurante_id;
        
        if (!tieneAcceso) {
          return reply.code(403).send({ 
            error: 'No tienes acceso a esta caja' 
          });
        }
      }

      // Ventas de la sesión: desde apertura de caja hasta el cierre (ahora)
      const sesionDesde = cajaActual.fecha_apertura;
      const sesionHasta = toISOStringHonduras(getHondurasDate());

      // Obtener ventas de la sesión por método de pago (mismo criterio que reportes de ventas)
      const { data: todasVentas, error: ventasError } = await client
        .from('pedidos')
        .select('total, metodo_pago_id')
        .eq('restaurante_id', cajaActual.restaurante_id)
        .or(FILTRO_PEDIDOS_CUENTAN_CAJA)
        .gte('created_at', sesionDesde)
        .lte('created_at', sesionHasta);

      if (ventasError) {
        return reply.code(400).send({ error: ventasError.message });
      }

      // Calcular ventas por método de pago
      const ventasEfectivo = todasVentas?.filter(v => v.metodo_pago_id === 1).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const ventasPOS = todasVentas?.filter(v => v.metodo_pago_id === 2).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const ventasTransferencia = todasVentas?.filter(v => v.metodo_pago_id === 3).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const totalVentasDia = todasVentas?.reduce((sum, venta) => sum + Number(venta.total), 0) || 0;

      // Gastos de la sesión real de caja (con método de pago para efectivo en caja)
      const { data: gastos, error: gastosError } = await client
        .from('gastos')
        .select('monto, metodo_pago_id')
        .eq('restaurante_id', cajaActual.restaurante_id)
        .gte('fecha_gasto', sesionDesde)
        .lte('fecha_gasto', sesionHasta);

      if (gastosError) {
        return reply.code(400).send({ error: gastosError.message });
      }

      const totalGastos = gastos?.reduce((sum, gasto) => sum + Number(gasto.monto), 0) || 0;
      const gastosEfectivo = sumarMontoGastosEfectivo(gastos || []);

      // Obtener total de retiros de esta caja
      const totalRetiros = Number(cajaActual.total_retiros || 0);

      // VALIDACIÓN: Calcular el efectivo que debe haber en caja
      // Solo se restan gastos en efectivo (no los pagados por POS/transferencia)
      const montoInicial = Number(cajaActual.monto_inicial);
      const ingresosAdicionales = Number(cajaActual.total_ingresos || 0);
      const efectivoEsperado = calcularEfectivoEsperadoCaja({
        montoInicial,
        ventasEfectivo,
        ingresosAdicionales,
        gastosEfectivo,
        totalRetiros,
      });
      const efectivoReal = Number(monto_final);

      const parseReportado = (valor: unknown): number | null => {
        if (valor === undefined || valor === null || valor === '') return null;
        const parsed = Number(valor);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const reportadoPOS = parseReportado(ventas_pos_reportadas);
      const reportadoTransferencia = parseReportado(ventas_transferencia_reportadas);
      const reportadoGastos = parseReportado(gastos_reportados);
      const reportadoEfectivoVentas = parseReportado(ventas_efectivo_reportadas);

      const diferenciaEfectivo = efectivoReal - efectivoEsperado;
      const diferenciaPOS = reportadoPOS !== null ? reportadoPOS - ventasPOS : null;
      const diferenciaTransferencia = reportadoTransferencia !== null ? reportadoTransferencia - ventasTransferencia : null;
      const diferenciaGastos = reportadoGastos !== null ? reportadoGastos - totalGastos : null;
      const diferenciaVentasEfectivo = reportadoEfectivoVentas !== null ? reportadoEfectivoVentas - ventasEfectivo : null;

      // Crear mensaje de validación según el diagrama
      let mensajeValidacion = '';
      const tolerancia = 0.01;

      const diferenciasEvaluables = [
        diferenciaEfectivo,
        diferenciaPOS,
        diferenciaTransferencia,
        diferenciaGastos,
        diferenciaVentasEfectivo
      ].filter((diff): diff is number => diff !== null);

      const cuadra = diferenciasEvaluables.every(diff => Math.abs(diff) <= tolerancia);

      if (cuadra) {
        mensajeValidacion = '✅ CAJA CUADRA EN 0 - Los montos coinciden correctamente';
        console.log(`Caja cerrada correctamente. Total ventas efectivo: $${ventasEfectivo.toFixed(2)}, POS: $${ventasPOS.toFixed(2)}, Transferencia: $${ventasTransferencia.toFixed(2)}, Gastos: $${totalGastos.toFixed(2)}`);
      } else {
        let detalle = '';
        if (Math.abs(diferenciaEfectivo) > tolerancia) {
          detalle = `efectivo ${diferenciaEfectivo > 0 ? 'sobrante' : 'faltante'} L.${Math.abs(diferenciaEfectivo).toFixed(2)}`;
        } else {
          // Buscar cuál diferencia específica causó el descuadre
          const detalles: string[] = [];
          if (diferenciaPOS !== null && Math.abs(diferenciaPOS) > tolerancia) detalles.push(`POS (dif: L.${Math.abs(diferenciaPOS).toFixed(2)})`);
          if (diferenciaTransferencia !== null && Math.abs(diferenciaTransferencia) > tolerancia) detalles.push(`Transferencia (dif: L.${Math.abs(diferenciaTransferencia).toFixed(2)})`);
          if (diferenciaGastos !== null && Math.abs(diferenciaGastos) > tolerancia) detalles.push(`Gastos (dif: L.${Math.abs(diferenciaGastos).toFixed(2)})`);
          if (diferenciaVentasEfectivo !== null && Math.abs(diferenciaVentasEfectivo) > tolerancia) detalles.push(`Ventas efectivo (dif: L.${Math.abs(diferenciaVentasEfectivo).toFixed(2)})`);
          detalle = detalles.length > 0 ? `diferencias en: ${detalles.join(', ')}` : 'diferencias en los montos reportados';
        }
        mensajeValidacion = `⚠️ CAJA NO CUADRA - Se detectó ${detalle}`;
        console.warn(`${mensajeValidacion}. Esperado: $${efectivoEsperado.toFixed(2)}, Real: $${efectivoReal.toFixed(2)}`);
      }

      // Calcular diferencias totales para estado_cuadre
      // La diferencia total debe corresponder a la suma visible de la tabla
      // "Declarado vs sistema" para evitar discrepancias entre filas y footer.
      const diferenciaTotalCalculada = 
        diferenciaEfectivo + 
        (diferenciaPOS || 0) + 
        (diferenciaTransferencia || 0) + 
        (diferenciaGastos || 0);
      
      const estadoCuadre = Math.abs(diferenciaTotalCalculada) < tolerancia ? 'cuadrada' : 'descuadrada';

      // Actualizar caja con toda la información incluyendo campos de cierre manual
      const { data, error } = await client
        .from('caja')
        .update({
          fecha_cierre: toISOStringHonduras(getHondurasDate()),
          monto_final: efectivoReal,
          total_ventas: totalVentasDia,
          total_ingresos: Number(cajaActual.total_ingresos || 0),
          total_egresos: totalGastos,
          estado: 'cerrada',
          observaciones: observaciones || cajaActual.observaciones,
          
          // Datos declarados manualmente por el usuario
          efectivo_declarado: efectivoReal,
          ventas_pos_declaradas: reportadoPOS,
          ventas_transferencia_declaradas: reportadoTransferencia,
          gastos_declarados: reportadoGastos,
          
          // Datos calculados por el sistema
          efectivo_sistema: efectivoEsperado,
          ventas_pos_sistema: ventasPOS,
          ventas_transferencia_sistema: ventasTransferencia,
          gastos_sistema: totalGastos,
          
          // Diferencias
          diferencia_efectivo: diferenciaEfectivo,
          diferencia_pos: diferenciaPOS,
          diferencia_transferencia: diferenciaTransferencia,
          diferencia_gastos: diferenciaGastos,
          diferencia_total: diferenciaTotalCalculada,
          
          // Estado del cuadre
          estado_cuadre: estadoCuadre,

          // Retiros y denominaciones
          total_retiros: totalRetiros,
          denominacion_conteo: denominacion_conteo || null
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      const [dataWithNombre] = await enrichCajasWithUsuarioNombre(data ? [data] : []);

      reply.send({ 
        data: dataWithNombre || null,
        validacion: {
          cuadra,
          mensaje: mensajeValidacion,
          efectivo_esperado: efectivoEsperado,
          efectivo_real: efectivoReal,
          diferencias: {
            efectivo: diferenciaEfectivo,
            ventas_pos: diferenciaPOS,
            ventas_transferencia: diferenciaTransferencia,
            gastos: diferenciaGastos,
            ventas_efectivo: diferenciaVentasEfectivo
          },
          diferencia: diferenciaEfectivo,
          esperado: {
            efectivo: efectivoEsperado,
            ventas_efectivo: ventasEfectivo,
            ventas_pos: ventasPOS,
            ventas_transferencia: ventasTransferencia,
            gastos: totalGastos
          },
          reportado: {
            efectivo: efectivoReal,
            ventas_efectivo: reportadoEfectivoVentas ?? ventasEfectivo,
            ventas_pos: reportadoPOS ?? ventasPOS,
            ventas_transferencia: reportadoTransferencia ?? ventasTransferencia,
            gastos: reportadoGastos ?? totalGastos
          },
          detalles: {
            monto_inicial: montoInicial,
            ventas_pos: ventasPOS,
            ventas_transferencia: ventasTransferencia,
            total_ventas: totalVentasDia,
            total_gastos: totalGastos,
            total_retiros: totalRetiros
          }
        }
      });
    } catch (error) {
      console.error('Error closing caja:', error);
      throw error;
    }
  },

  // Actualizar caja (para ingresos/egresos adicionales)
  async actualizarCaja(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = request.params as { id: string };
      const { total_ingresos, total_egresos, observaciones } = request.body as { total_ingresos?: number; total_egresos?: number; observaciones?: string };

      const client = supabaseAdmin || supabase;

      // Primero obtener la caja para verificar permisos
      const { data: cajaExistente, error: errorBuscar } = await client
        .from('caja')
        .select('id, restaurante_id, estado')
        .eq('id', id)
        .single();

      if (errorBuscar || !cajaExistente) {
        return reply.code(404).send({ 
          error: 'Caja no encontrada' 
        });
      }

      if (cajaExistente.estado !== 'abierta') {
        return reply.code(400).send({ 
          error: 'Solo se pueden actualizar cajas abiertas' 
        });
      }

      // Verificar permisos según rol
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede actualizar cualquier caja
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante de la caja
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(cajaExistente.restaurante_id)) {
          return reply.code(403).send({ 
            error: 'No tienes acceso a esta caja' 
          });
        }
      } else {
        // Usuarios normales solo pueden actualizar cajas de su restaurante
        if (request.user_info.restaurante_id !== cajaExistente.restaurante_id) {
          return reply.code(403).send({ 
            error: 'No tienes acceso a esta caja' 
          });
        }
      }

      const { data, error } = await client
        .from('caja')
        .update({
          total_ingresos: total_ingresos ? Number(total_ingresos) : undefined,
          total_egresos: total_egresos ? Number(total_egresos) : undefined,
          observaciones: observaciones || undefined
        })
        .eq('id', id)
        .eq('estado', 'abierta')
        .select('*')
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      const [dataWithNombre] = await enrichCajasWithUsuarioNombre(data ? [data] : []);

      reply.send({ data: dataWithNombre || null });
    } catch (error) {
      console.error('Error updating caja:', error);
      throw error;
    }
  },

  // Registrar un retiro de caja
  async registrarRetiro(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({ error: 'No se encontró información del usuario autenticado' });
      }

      const { id } = request.params as { id: string };
      const { nombre_responsable, monto, observaciones } = request.body as { nombre_responsable: string; monto: number; observaciones?: string };

      if (!nombre_responsable || !monto) {
        return reply.code(400).send({ error: 'nombre_responsable y monto son requeridos' });
      }

      if (Number(monto) <= 0) {
        return reply.code(400).send({ error: 'El monto debe ser mayor a 0' });
      }

      const client = supabaseAdmin || supabase;

      // Verificar que la caja exista y esté abierta
      const { data: caja, error: cajaError } = await client
        .from('caja')
        .select('id, restaurante_id, estado, total_retiros')
        .eq('id', id)
        .single();

      if (cajaError || !caja) {
        return reply.code(404).send({ error: 'Caja no encontrada' });
      }

      if (caja.estado !== 'abierta') {
        return reply.code(400).send({ error: 'Solo se pueden registrar retiros en cajas abiertas' });
      }

      // Insertar el retiro
      const { data: retiro, error: retiroError } = await client
        .from('retiros_caja')
        .insert({
          caja_id: id,
          restaurante_id: caja.restaurante_id,
          nombre_responsable,
          monto: Number(monto),
          observaciones: observaciones || null
        })
        .select('*')
        .single();

      if (retiroError) {
        return reply.code(400).send({ error: retiroError.message });
      }

      // Actualizar total_retiros en la caja
      const nuevoTotal = Number(caja.total_retiros || 0) + Number(monto);
      await client
        .from('caja')
        .update({ total_retiros: nuevoTotal })
        .eq('id', id);

      return reply.code(201).send({ data: retiro });
    } catch (error) {
      console.error('Error registering retiro:', error);
      throw error;
    }
  },

  // Listar retiros de una caja
  async getRetirosCaja(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const client = supabaseAdmin || supabase;

      const { data, error } = await client
        .from('retiros_caja')
        .select('*')
        .eq('caja_id', id)
        .order('hora_retiro', { ascending: true });

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      reply.send({ data: data || [] });
    } catch (error) {
      console.error('Error getting retiros:', error);
      throw error;
    }
  },

  // Eliminar un retiro
  async eliminarRetiro(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({ error: 'No se encontró información del usuario autenticado' });
      }

      const { retiro_id } = request.params as { retiro_id: string };
      const client = supabaseAdmin || supabase;

      // Obtener el retiro para saber el monto y la caja
      const { data: retiro, error: fetchError } = await client
        .from('retiros_caja')
        .select('id, caja_id, monto')
        .eq('id', retiro_id)
        .single();

      if (fetchError || !retiro) {
        return reply.code(404).send({ error: 'Retiro no encontrado' });
      }

      // Verificar que la caja esté abierta
      const { data: caja } = await client
        .from('caja')
        .select('id, estado, total_retiros')
        .eq('id', retiro.caja_id)
        .single();

      if (!caja || caja.estado !== 'abierta') {
        return reply.code(400).send({ error: 'No se pueden eliminar retiros de cajas cerradas' });
      }

      // Eliminar el retiro
      const { error: deleteError } = await client
        .from('retiros_caja')
        .delete()
        .eq('id', retiro_id);

      if (deleteError) {
        return reply.code(400).send({ error: deleteError.message });
      }

      // Actualizar total_retiros en la caja
      const nuevoTotal = Math.max(0, Number(caja.total_retiros || 0) - Number(retiro.monto));
      await client
        .from('caja')
        .update({ total_retiros: nuevoTotal })
        .eq('id', retiro.caja_id);

      reply.send({ message: 'Retiro eliminado correctamente' });
    } catch (error) {
      console.error('Error deleting retiro:', error);
      throw error;
    }
  },

  // Obtener una caja específica
  async getCajaById(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const { id } = request.params as { id: string };
      const client = supabaseAdmin || supabase;

      // Obtener la caja
      const { data: caja, error } = await client
        .from('caja')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return reply.code(404).send({ error: 'Caja no encontrada' });
        }
        return reply.code(400).send({ error: error.message });
      }

      // Verificar permisos según rol
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede ver cualquier caja
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante de la caja
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

        if (!restaurantIds.includes(caja.restaurante_id)) {
          return reply.code(403).send({
            error: 'No tienes acceso a esta caja'
          });
        }
      } else {
        // Usuarios normales solo pueden ver cajas de su restaurante
          if (!request.user_info.restaurante_id) {
            return reply.code(403).send({
              error: 'No tienes un restaurante asignado'
            });
          }
        if (request.user_info.restaurante_id !== caja.restaurante_id) {
          return reply.code(403).send({
            error: 'No tienes acceso a esta caja'
          });
        }
      }

      const [dataWithNombre] = await enrichCajasWithUsuarioNombre([caja]);

      reply.send({ data: dataWithNombre || null });
    } catch (error) {
      console.error('Error getting caja by id:', error);
      throw error;
    }
  }
};
