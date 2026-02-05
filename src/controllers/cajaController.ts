import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../supabase/supabase';
import '../types/express'; // Importar tipos personalizados
import notificacionesService from '../services/notificacionesService';
import { getHondurasDate, getStartOfDayHonduras, getEndOfDayHonduras, toISOStringHonduras } from '../utils/dateUtils';

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
  async getAllCajas(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, estado, restaurante_id, fecha_desde, fecha_hasta } = req.query;

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
        return res.status(400).json({ error: error.message });
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

      res.json({
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
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener todas las cajas abiertas de todos los restaurantes (solo administradores)
  async getAllCajasAbiertas(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, restaurante_id } = req.query;

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
        return res.status(400).json({ error: error.message });
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

      res.json({
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
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener todas las cajas de un restaurante
  async getCajas(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const { page = 1, limit = 10, estado, fecha_desde, fecha_hasta } = req.query;

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
        return res.status(400).json({ error: error.message });
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

      res.json({
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
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener caja actual (abierta) de un restaurante específico
  async getCajaActual(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;

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
        return res.status(400).json({ error: error.message });
      }

      const cajaActual = error && error.code === 'PGRST116' ? null : data;
      const [cajaActualWithNombre] = await enrichCajasWithUsuarioNombre(cajaActual ? [cajaActual] : []);

      // Agregar información del restaurante
      const cajaWithRestaurant = cajaActualWithNombre ? {
        ...cajaActualWithNombre,
        restaurante_nombre: (cajaActual as any)?.restaurantes?.nombre_restaurante || 'Restaurante desconocido'
      } : null;

      res.json({ data: cajaWithRestaurant });
    } catch (error) {
      console.error('Error getting caja actual:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener resumen de caja del día de un restaurante específico
  async getResumenCaja(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const { fecha } = req.query;

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
        return res.status(400).json({ error: cajaError.message });
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
        return res.json({ 
          data: {
            caja_actual: null,
            total_ventas_dia: 0,
            ventas_efectivo: 0,
            ventas_pos: 0,
            ventas_transferencia: 0,
            total_ingresos_dia: 0,
            total_egresos_dia: 0,
            total_gastos_dia: 0,
            gastos_dia: [],
            diferencia: 0
          }
        });
      }

      // Usar el restaurante_id de la caja abierta para calcular ventas y gastos
      const restauranteIdCaja = cajaActualWithRestaurant.restaurante_id;

      // Calcular fecha de inicio del día
      const fechaInicio = fecha ? getStartOfDayHonduras(fecha as string) : getStartOfDayHonduras();
      const fechaFin = getEndOfDayHonduras(fechaInicio);

      // Obtener todas las ventas del día con método de pago (del restaurante de la caja abierta)
      const { data: todasVentas, error: ventasError } = await client
        .from('pedidos')
        .select('total, metodo_pago_id')
        .eq('restaurante_id', restauranteIdCaja)
        .eq('pagado', true)
        .gte('created_at', toISOStringHonduras(fechaInicio))
        .lte('created_at', toISOStringHonduras(fechaFin));

      if (ventasError) {
        return res.status(400).json({ error: ventasError.message });
      }

      // Calcular ventas por método de pago
      const ventasEfectivo = todasVentas?.filter(v => v.metodo_pago_id === 1).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const ventasPOS = todasVentas?.filter(v => v.metodo_pago_id === 2).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const ventasTransferencia = todasVentas?.filter(v => v.metodo_pago_id === 3).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const totalVentasDia = todasVentas?.reduce((sum, venta) => sum + Number(venta.total), 0) || 0;

      // Obtener gastos del día (del restaurante de la caja abierta)
      const { data: gastos, error: gastosError } = await client
        .from('gastos')
        .select('*')
        .eq('restaurante_id', restauranteIdCaja)
        .gte('fecha_gasto', toISOStringHonduras(fechaInicio))
        .lte('fecha_gasto', toISOStringHonduras(fechaFin));

      if (gastosError) {
        return res.status(400).json({ error: gastosError.message });
      }

      const totalGastosDia = gastos?.reduce((sum, gasto) => sum + Number(gasto.monto), 0) || 0;

      const resumen = {
        caja_actual: cajaActualWithRestaurant || null,
        total_ventas_dia: totalVentasDia,
        ventas_efectivo: ventasEfectivo,
        ventas_pos: ventasPOS,
        ventas_transferencia: ventasTransferencia,
        total_ingresos_dia: cajaActualWithRestaurant?.total_ingresos || 0,
        total_egresos_dia: cajaActualWithRestaurant?.total_egresos || 0,
        total_gastos_dia: totalGastosDia,
        gastos_dia: gastos || [],
        diferencia: cajaActualWithRestaurant
          ? Number(cajaActualWithRestaurant.monto_final || 0) -
            Number(cajaActualWithRestaurant.monto_inicial) -
            totalVentasDia
          : 0
      };

      res.json({ data: resumen });
    } catch (error) {
      console.error('Error getting resumen caja:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Abrir caja
  async abrirCaja(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { restaurante_id, usuario_id, monto_inicial, observaciones } = req.body;

      // Validar campos requeridos
      if (!restaurante_id) {
        return res.status(400).json({ 
          error: 'El campo restaurante_id es requerido' 
        });
      }

      if (!usuario_id) {
        return res.status(400).json({ 
          error: 'El campo usuario_id es requerido' 
        });
      }

      if (monto_inicial === undefined || monto_inicial === null) {
        return res.status(400).json({ 
          error: 'El campo monto_inicial es requerido' 
        });
      }

      // Verificar permisos según rol
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede abrir caja en cualquier restaurante
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante
        const client = supabaseAdmin || supabase;
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(restaurante_id)) {
          return res.status(403).json({ 
            error: 'No tienes acceso a este restaurante' 
          });
        }
      } else {
        // Usuarios con roles personalizados: verificar acceso via usuarios_restaurantes
        const client = supabaseAdmin || supabase;
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        // Si tiene acceso via usuarios_restaurantes O por restaurante_id directo, permitir
        const tieneAcceso = restaurantIds.includes(restaurante_id) || 
                           req.user_info.restaurante_id === restaurante_id;
        
        if (!tieneAcceso) {
          return res.status(403).json({ 
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
        return res.status(400).json({ error: checkError.message });
      }

      if (cajaExistente) {
        // Hay una caja abierta en este restaurante - no permitir abrir otra
        return res.status(400).json({ 
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
        return res.status(400).json({ 
          error: error.message,
          details: error.details,
          hint: error.hint
        });
      }

      const [dataWithNombre] = await enrichCajasWithUsuarioNombre(data ? [data] : []);

      console.log(`Caja abierta exitosamente con saldo inicial de $${Number(monto_inicial).toFixed(2)}`);

      res.status(201).json({ data: dataWithNombre || null });
    } catch (error) {
      console.error('Error opening caja:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Cerrar caja
  async cerrarCaja(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = req.params;
      const {
        monto_final,
        observaciones,
        ventas_pos_reportadas,
        ventas_transferencia_reportadas,
        gastos_reportados,
        ventas_efectivo_reportadas
      } = req.body;

      const client = supabaseAdmin || supabase;
      // Obtener caja actual
      const { data: cajaActual, error: cajaError } = await client
        .from('caja')
        .select('*')
        .eq('id', id)
        .eq('estado', 'abierta')
        .single();

      if (cajaError) {
        return res.status(400).json({ error: 'Caja no encontrada o ya cerrada' });
      }

      // Verificar permisos según rol
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede cerrar cualquier caja
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante de la caja
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(cajaActual.restaurante_id)) {
          return res.status(403).json({ 
            error: 'No tienes acceso a esta caja' 
          });
        }
      } else {
        // Usuarios con roles personalizados: verificar acceso via usuarios_restaurantes
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        // Si tiene acceso via usuarios_restaurantes, permitir
        // Si no, verificar por restaurante_id directo en usuarios_info
        const tieneAcceso = restaurantIds.includes(cajaActual.restaurante_id) || 
                           req.user_info.restaurante_id === cajaActual.restaurante_id;
        
        if (!tieneAcceso) {
          return res.status(403).json({ 
            error: 'No tienes acceso a esta caja' 
          });
        }
      }

      // Calcular totales del día
      const fechaInicio = getStartOfDayHonduras(cajaActual.fecha_apertura);
      const fechaFin = getEndOfDayHonduras();

      // Obtener ventas del día por método de pago
      const { data: todasVentas, error: ventasError } = await client
        .from('pedidos')
        .select('total, metodo_pago_id')
        .eq('restaurante_id', cajaActual.restaurante_id)
        .eq('pagado', true)
        .gte('created_at', toISOStringHonduras(fechaInicio))
        .lte('created_at', toISOStringHonduras(fechaFin));

      if (ventasError) {
        return res.status(400).json({ error: ventasError.message });
      }

      // Calcular ventas por método de pago
      const ventasEfectivo = todasVentas?.filter(v => v.metodo_pago_id === 1).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const ventasPOS = todasVentas?.filter(v => v.metodo_pago_id === 2).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const ventasTransferencia = todasVentas?.filter(v => v.metodo_pago_id === 3).reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const totalVentasDia = todasVentas?.reduce((sum, venta) => sum + Number(venta.total), 0) || 0;

      // Obtener gastos del día
      const { data: gastos, error: gastosError } = await client
        .from('gastos')
        .select('monto')
        .eq('restaurante_id', cajaActual.restaurante_id)
        .gte('fecha_gasto', toISOStringHonduras(fechaInicio))
        .lte('fecha_gasto', toISOStringHonduras(fechaFin));

      if (gastosError) {
        return res.status(400).json({ error: gastosError.message });
      }

      const totalGastos = gastos?.reduce((sum, gasto) => sum + Number(gasto.monto), 0) || 0;

      // VALIDACIÓN: Calcular el efectivo que debe haber en caja
      const montoInicial = Number(cajaActual.monto_inicial);
      const ingresosAdicionales = Number(cajaActual.total_ingresos || 0);
      const efectivoEsperado = montoInicial + ventasEfectivo + ingresosAdicionales - totalGastos;
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
        const detalle = diferenciaEfectivo > tolerancia
          ? `efectivo ${diferenciaEfectivo > 0 ? 'sobrante' : 'faltante'} $${Math.abs(diferenciaEfectivo).toFixed(2)}`
          : 'existen diferencias en los montos reportados';
        mensajeValidacion = `⚠️ CAJA NO CUADRA - Se detectó ${detalle}`;
        console.warn(`${mensajeValidacion}. Esperado: $${efectivoEsperado.toFixed(2)}, Real: $${efectivoReal.toFixed(2)}`);
      }

      // Calcular diferencias totales para estado_cuadre
      const diferenciaTotalCalculada = 
        diferenciaEfectivo + 
        (diferenciaPOS || 0) + 
        (diferenciaTransferencia || 0) - 
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
          estado_cuadre: estadoCuadre
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const [dataWithNombre] = await enrichCajasWithUsuarioNombre(data ? [data] : []);

      res.json({ 
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
            total_gastos: totalGastos
          }
        }
      });
    } catch (error) {
      console.error('Error closing caja:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Actualizar caja (para ingresos/egresos adicionales)
  async actualizarCaja(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = req.params;
      const { total_ingresos, total_egresos, observaciones } = req.body;

      const client = supabaseAdmin || supabase;

      // Primero obtener la caja para verificar permisos
      const { data: cajaExistente, error: errorBuscar } = await client
        .from('caja')
        .select('id, restaurante_id, estado')
        .eq('id', id)
        .single();

      if (errorBuscar || !cajaExistente) {
        return res.status(404).json({ 
          error: 'Caja no encontrada' 
        });
      }

      if (cajaExistente.estado !== 'abierta') {
        return res.status(400).json({ 
          error: 'Solo se pueden actualizar cajas abiertas' 
        });
      }

      // Verificar permisos según rol
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede actualizar cualquier caja
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante de la caja
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(cajaExistente.restaurante_id)) {
          return res.status(403).json({ 
            error: 'No tienes acceso a esta caja' 
          });
        }
      } else {
        // Usuarios normales solo pueden actualizar cajas de su restaurante
        if (req.user_info.restaurante_id !== cajaExistente.restaurante_id) {
          return res.status(403).json({ 
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
        return res.status(400).json({ error: error.message });
      }

      const [dataWithNombre] = await enrichCajasWithUsuarioNombre(data ? [data] : []);

      res.json({ data: dataWithNombre || null });
    } catch (error) {
      console.error('Error updating caja:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener una caja específica
  async getCajaById(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const { id } = req.params;
      const client = supabaseAdmin || supabase;

      // Obtener la caja
      const { data: caja, error } = await client
        .from('caja')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Caja no encontrada' });
        }
        return res.status(400).json({ error: error.message });
      }

      // Verificar permisos según rol
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede ver cualquier caja
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante de la caja
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

        if (!restaurantIds.includes(caja.restaurante_id)) {
          return res.status(403).json({
            error: 'No tienes acceso a esta caja'
          });
        }
      } else {
        // Usuarios normales solo pueden ver cajas de su restaurante
          if (!req.user_info.restaurante_id) {
            return res.status(403).json({
              error: 'No tienes un restaurante asignado'
            });
          }
        if (req.user_info.restaurante_id !== caja.restaurante_id) {
          return res.status(403).json({
            error: 'No tienes acceso a esta caja'
          });
        }
      }

      const [dataWithNombre] = await enrichCajasWithUsuarioNombre([caja]);

      res.json({ data: dataWithNombre || null });
    } catch (error) {
      console.error('Error getting caja by id:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};
