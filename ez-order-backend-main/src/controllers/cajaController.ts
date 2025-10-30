import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../supabase/supabase';
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
      const { page = 1, limit = 10, estado, restaurante_id } = req.query;

      const client = supabaseAdmin || supabase;
      let query = client
        .from('caja')
        .select(`
          *,
          restaurantes:restaurante_id (
            id,
            nombre
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

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error } = await query
        .range(from, to)
        .select(`
          *,
          restaurantes:restaurante_id (
            id,
            nombre
          )
        `);

      const { count } = await client
        .from('caja')
        .select('*', { count: 'exact', head: true })
        .eq(restaurante_id ? 'restaurante_id' : '', restaurante_id || '');

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const dataWithUsuarios = await enrichCajasWithUsuarioNombre(data || []);

      // Agregar información del restaurante a cada caja
      const dataWithRestaurant = dataWithUsuarios.map(caja => ({
        ...caja,
        restaurante_nombre: caja.restaurantes?.nombre || 'Restaurante desconocido'
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
            nombre
          )
        `)
        .eq('estado', 'abierta')
        .order('fecha_apertura', { ascending: false });

      if (restaurante_id) {
        query = query.eq('restaurante_id', restaurante_id);
      }

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error } = await query
        .range(from, to)
        .select(`
          *,
          restaurantes:restaurante_id (
            id,
            nombre
          )
        `);

      const { count } = await client
        .from('caja')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'abierta')
        .eq(restaurante_id ? 'restaurante_id' : '', restaurante_id || '');

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const dataWithUsuarios = await enrichCajasWithUsuarioNombre(data || []);

      // Agregar información del restaurante a cada caja
      const dataWithRestaurant = dataWithUsuarios.map(caja => ({
        ...caja,
        restaurante_nombre: caja.restaurantes?.nombre || 'Restaurante desconocido'
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
      const { page = 1, limit = 10, estado } = req.query;

      const client = supabaseAdmin || supabase;
      let query = client
        .from('caja')
        .select('*')
        .eq('restaurante_id', restaurante_id)
        .order('fecha_apertura', { ascending: false });

      if (estado) {
        query = query.eq('estado', estado);
      }

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error } = await query
        .range(from, to)
        .select('*');

      const { count } = await client
        .from('caja')
        .select('*', { count: 'exact', head: true })
        .eq('restaurante_id', restaurante_id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const dataWithUsuarios = await enrichCajasWithUsuarioNombre(data || []);

      res.json({
        data: dataWithUsuarios,
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

  // Obtener caja actual (abierta) de un restaurante
  async getCajaActual(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;

      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('caja')
        .select('*')
        .eq('restaurante_id', restaurante_id)
        .eq('estado', 'abierta')
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(400).json({ error: error.message });
      }

      const [cajaActualWithNombre] = await enrichCajasWithUsuarioNombre(data ? [data] : []);

      res.json({ data: cajaActualWithNombre || null });
    } catch (error) {
      console.error('Error getting caja actual:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener resumen de caja del día
  async getResumenCaja(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const { fecha } = req.query;

      const client = supabaseAdmin || supabase;
      // Obtener caja actual
      const { data: cajaActual, error: cajaError } = await client
        .from('caja')
        .select('*')
        .eq('restaurante_id', restaurante_id)
        .eq('estado', 'abierta')
        .single();

      if (cajaError && cajaError.code !== 'PGRST116') {
        return res.status(400).json({ error: cajaError.message });
      }

      const [cajaActualWithNombre] = await enrichCajasWithUsuarioNombre(
        cajaActual ? [cajaActual] : []
      );

      // Calcular fecha de inicio del día
      const fechaInicio = fecha ? getStartOfDayHonduras(fecha as string) : getStartOfDayHonduras();
      const fechaFin = getEndOfDayHonduras(fechaInicio);

      // Obtener todas las ventas del día con método de pago
      const { data: todasVentas, error: ventasError } = await client
        .from('pedidos')
        .select('total, metodo_pago_id')
        .eq('restaurante_id', restaurante_id)
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
        .select('*')
        .eq('restaurante_id', restaurante_id)
        .gte('fecha_gasto', toISOStringHonduras(fechaInicio))
        .lte('fecha_gasto', toISOStringHonduras(fechaFin));

      if (gastosError) {
        return res.status(400).json({ error: gastosError.message });
      }

      const totalGastosDia = gastos?.reduce((sum, gasto) => sum + Number(gasto.monto), 0) || 0;

      const resumen = {
        caja_actual: cajaActualWithNombre || null,
        total_ventas_dia: totalVentasDia,
        ventas_efectivo: ventasEfectivo,
        ventas_pos: ventasPOS,
        ventas_transferencia: ventasTransferencia,
        total_ingresos_dia: cajaActualWithNombre?.total_ingresos || 0,
        total_egresos_dia: cajaActualWithNombre?.total_egresos || 0,
        total_gastos_dia: totalGastosDia,
        gastos_dia: gastos || [],
        diferencia: cajaActualWithNombre
          ? Number(cajaActualWithNombre.monto_final || 0) -
            Number(cajaActualWithNombre.monto_inicial) -
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

      const client = supabaseAdmin || supabase;
      
      // VALIDACIÓN 1: Verificar si ya hay una caja abierta
      const { data: cajaExistente, error: checkError } = await client
        .from('caja')
        .select('id, usuario_id, fecha_apertura')
        .eq('restaurante_id', restaurante_id)
        .eq('estado', 'abierta')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar caja existente:', checkError);
        return res.status(400).json({ error: checkError.message });
      }

      if (cajaExistente) {
        // No notificar aquí para evitar problemas con usuario_id
        return res.status(400).json({ 
          error: 'Ya existe una caja abierta para este restaurante',
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
      const { id } = req.params;
      const { monto_final, observaciones } = req.body;

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
      const efectivoEsperado = montoInicial + totalVentasDia - totalGastos;
      const efectivoReal = Number(monto_final);
      const diferencia = efectivoReal - efectivoEsperado;

      // Crear mensaje de validación según el diagrama
      let mensajeValidacion = '';
      let cuadra = true;

      if (Math.abs(diferencia) > 0.01) { // Tolerancia de 1 centavo
        cuadra = false;
        if (diferencia > 0) {
          mensajeValidacion = `⚠️ CAJA NO CUADRA - Hay un sobrante de $${Math.abs(diferencia).toFixed(2)}`;
        } else {
          mensajeValidacion = `⚠️ CAJA NO CUADRA - Hay un faltante de $${Math.abs(diferencia).toFixed(2)}`;
        }
        console.log(`${mensajeValidacion}. Efectivo esperado: $${efectivoEsperado.toFixed(2)}, Efectivo real: $${efectivoReal.toFixed(2)}`);
      } else {
        mensajeValidacion = '✅ CAJA CUADRA - Los montos coinciden correctamente';
        console.log(`Caja cerrada correctamente. Total ventas: $${totalVentasDia.toFixed(2)}, Gastos: $${totalGastos.toFixed(2)}`);
      }

      // Actualizar caja con toda la información
      const { data, error } = await client
        .from('caja')
        .update({
          fecha_cierre: toISOStringHonduras(getHondurasDate()),
          monto_final: efectivoReal,
          total_ventas: totalVentasDia,
          total_ingresos: ventasPOS + ventasTransferencia,
          total_egresos: totalGastos,
          estado: 'cerrada',
          observaciones: observaciones || cajaActual.observaciones
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
          diferencia: diferencia,
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
      const { id } = req.params;
      const { total_ingresos, total_egresos, observaciones } = req.body;

      const client = supabaseAdmin || supabase;
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
      const { id } = req.params;

      const client = supabaseAdmin || supabase;

      // Obtener la caja con validación de restaurante
      let query = client
        .from('caja')
        .select('*')
        .eq('id', id);

      // Para usuarios no administradores, filtrar por restaurante asignado
      if (req.user_info) {
        const isSuperAdmin = req.user_info.rol_id === 1 || req.user_info.rol_id === 2 || req.user_info.es_super_admin;
        const hasSuperAdminRole = req.user_info.rol_personalizado_id &&
          (await client
            .from('roles_personalizados')
            .select('es_super_admin')
            .eq('id', req.user_info.rol_personalizado_id)
            .single()
          ).data?.es_super_admin;

        if (!isSuperAdmin && !hasSuperAdminRole) {
          // Usuario normal: solo puede ver cajas de su restaurante
          if (!req.user_info.restaurante_id) {
            return res.status(403).json({
              error: 'No tienes un restaurante asignado'
            });
          }
          query = query.eq('restaurante_id', req.user_info.restaurante_id);
        }
        // Administradores pueden ver todas las cajas
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Caja no encontrada o no tienes acceso' });
        }
        return res.status(400).json({ error: error.message });
      }

      const [dataWithNombre] = await enrichCajasWithUsuarioNombre(data ? [data] : []);

      res.json({ data: dataWithNombre || null });
    } catch (error) {
      console.error('Error getting caja by id:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};
