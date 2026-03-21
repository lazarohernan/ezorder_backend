import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../supabase/supabase';
import NotificacionesService from '../services/notificacionesService';

// Interfaces
interface InventarioItem {
  id: string;
  nombre: string;
  descripcion?: string;
  restaurante_id: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo?: number;
  unidad_medida: string;
  costo_unitario: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Helper: obtener restaurante_ids según rol del usuario
async function getRestauranteIds(client: any, user_info: any): Promise<string[] | null> {
  const rol_id = user_info?.rol_id ?? 3;
  if (rol_id === 1) return null; // Super Admin ve todo

  if (rol_id === 2) {
    const { data } = await client
      .from('usuarios_restaurantes')
      .select('restaurante_id')
      .eq('usuario_id', user_info.id);
    return data?.map((ur: any) => ur.restaurante_id) || [];
  }

  return user_info.restaurante_id ? [user_info.restaurante_id] : [];
}

// Helper: verificar si el usuario tiene acceso a un restaurante específico
async function tieneAccesoRestaurante(client: any, user_info: any, restaurante_id: string): Promise<boolean> {
  const rol_id = user_info?.rol_id ?? 3;
  if (rol_id === 1) return true;

  if (rol_id === 2) {
    const { data } = await client
      .from('usuarios_restaurantes')
      .select('restaurante_id')
      .eq('usuario_id', user_info.id)
      .eq('restaurante_id', restaurante_id)
      .single();
    return !!data;
  }

  return user_info.restaurante_id === restaurante_id;
}

// Obtener todos los items de inventario con filtros
export const obtenerInventario = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const { busqueda, estado_stock, activo, restaurante_id, pagina = 1, limite = 10 } = req.query;

    const client = supabaseAdmin || supabase;

    let query = client
      .from('inventario')
      .select('*', { count: 'exact' });

    // Filtrar por restaurante según rol
    const restauranteIds = await getRestauranteIds(client, req.user_info);
    if (restauranteIds !== null) {
      if (restauranteIds.length === 0) {
        return res.json({ ok: true, data: [], total: 0, pagina: Number(pagina), total_paginas: 0 });
      }
      query = query.in('restaurante_id', restauranteIds);
    }

    // Filtro opcional por restaurante (para admins/super admins en UI)
    if (typeof restaurante_id === 'string' && restaurante_id.trim()) {
      query = query.eq('restaurante_id', restaurante_id.trim());
    }

    if (busqueda) query = query.ilike('nombre', `%${busqueda}%`);
    if (activo !== undefined) query = query.eq('activo', activo === 'true');
    if (estado_stock === 'agotado') query = query.eq('stock_actual', 0);

    const offset = (Number(pagina) - 1) * Number(limite);
    query = query.range(offset, offset + Number(limite) - 1);
    query = query.order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error al obtener inventario:', error);
      return res.status(500).json({ ok: false, message: 'Error al obtener inventario', error: error.message });
    }

    res.json({
      ok: true,
      data: data || [],
      total: count || 0,
      pagina: Number(pagina),
      total_paginas: Math.ceil((count || 0) / Number(limite))
    });
  } catch (error) {
    console.error('Error en obtenerInventario:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Obtener un item de inventario por ID
export const obtenerInventarioPorId = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('inventario')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ ok: false, message: 'Item de inventario no encontrado' });
    }

    const acceso = await tieneAccesoRestaurante(client, req.user_info, data.restaurante_id);
    if (!acceso) {
      return res.status(403).json({ ok: false, message: 'No tienes acceso a este inventario' });
    }

    res.json({ ok: true, data });
  } catch (error) {
    console.error('Error en obtenerInventarioPorId:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Crear nuevo item de inventario
export const crearInventario = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const { nombre, descripcion, restaurante_id, stock_actual, stock_minimo, stock_maximo, unidad_medida, costo_unitario, codigo_sku, tiene_desglose } = req.body;

    if (!nombre || stock_actual === undefined || stock_minimo === undefined || !restaurante_id) {
      return res.status(400).json({ ok: false, message: 'Faltan datos requeridos: nombre, restaurante_id, stock_actual, stock_minimo' });
    }

    const client = supabaseAdmin || supabase;

    const acceso = await tieneAccesoRestaurante(client, req.user_info, restaurante_id);
    if (!acceso) {
      return res.status(403).json({ ok: false, message: 'No tienes acceso a este restaurante' });
    }

    // Verificar que no exista un producto con el mismo nombre en el mismo restaurante
    const { data: existente } = await client
      .from('inventario')
      .select('id')
      .eq('restaurante_id', restaurante_id)
      .ilike('nombre', nombre.trim())
      .eq('activo', true)
      .limit(1);

    if (existente && existente.length > 0) {
      return res.status(400).json({ ok: false, message: `Ya existe un producto llamado "${nombre}" en este restaurante` });
    }

    const { data, error } = await client
      .from('inventario')
      .insert({ nombre: nombre.trim(), descripcion, restaurante_id, stock_actual, stock_minimo, stock_maximo, unidad_medida: unidad_medida || null, costo_unitario: costo_unitario ?? 0, codigo_sku: codigo_sku || null, tiene_desglose: tiene_desglose ?? false })
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear inventario:', error);
      return res.status(500).json({ ok: false, message: 'Error al crear inventario', error: error.message });
    }

    res.status(201).json({ ok: true, data, message: 'Producto de inventario creado exitosamente' });
  } catch (error) {
    console.error('Error en crearInventario:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Actualizar item de inventario
export const actualizarInventario = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;

    const { data: existing, error: checkError } = await client
      .from('inventario')
      .select('id, restaurante_id')
      .eq('id', req.params.id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ ok: false, message: 'Item de inventario no encontrado' });
    }

    const acceso = await tieneAccesoRestaurante(client, req.user_info, existing.restaurante_id);
    if (!acceso) {
      return res.status(403).json({ ok: false, message: 'No tienes acceso a este inventario' });
    }

    const { nombre, descripcion, stock_minimo, stock_maximo, unidad_medida, costo_unitario, activo, codigo_sku, tiene_desglose } = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };

    if (nombre !== undefined) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (stock_minimo !== undefined) updateData.stock_minimo = stock_minimo;
    if (stock_maximo !== undefined) updateData.stock_maximo = stock_maximo;
    if (unidad_medida !== undefined) updateData.unidad_medida = unidad_medida;
    if (costo_unitario !== undefined) updateData.costo_unitario = costo_unitario;
    if (activo !== undefined) updateData.activo = activo;
    if (codigo_sku !== undefined) updateData.codigo_sku = codigo_sku;
    if (tiene_desglose !== undefined) updateData.tiene_desglose = tiene_desglose;

    const { data, error } = await client
      .from('inventario')
      .update(updateData)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error al actualizar inventario:', error);
      return res.status(500).json({ ok: false, message: 'Error al actualizar inventario', error: error.message });
    }

    res.json({ ok: true, data, message: 'Inventario actualizado exitosamente' });
  } catch (error) {
    console.error('Error en actualizarInventario:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Eliminar item de inventario
export const eliminarInventario = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;

    const { data: existing, error: checkError } = await client
      .from('inventario')
      .select('id, restaurante_id')
      .eq('id', req.params.id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ ok: false, message: 'Item de inventario no encontrado' });
    }

    const acceso = await tieneAccesoRestaurante(client, req.user_info, existing.restaurante_id);
    if (!acceso) {
      return res.status(403).json({ ok: false, message: 'No tienes acceso a este inventario' });
    }

    const { error } = await client.from('inventario').delete().eq('id', req.params.id);

    if (error) {
      console.error('Error al eliminar inventario:', error);
      return res.status(500).json({ ok: false, message: 'Error al eliminar inventario', error: error.message });
    }

    res.json({ ok: true, message: 'Inventario eliminado exitosamente' });
  } catch (error) {
    console.error('Error en eliminarInventario:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Obtener movimientos de inventario
export const obtenerMovimientos = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const { inventario_id, tipo_movimiento, fecha_desde, fecha_hasta, pagina = 1, limite = 10 } = req.query;

    const client = supabaseAdmin || supabase;

    let query = client
      .from('movimientos_inventario')
      .select(`
        *,
        inventario:inventario_id (id, nombre, restaurante_id),
        usuario:usuario_id (id, nombre_usuario)
      `, { count: 'exact' });

    // Filtrar por restaurante según rol
    const restauranteIds = await getRestauranteIds(client, req.user_info);
    if (restauranteIds !== null) {
      if (restauranteIds.length === 0) {
        return res.json({ ok: true, data: [], total: 0, pagina: Number(pagina), total_paginas: 0 });
      }
      // Obtener inventario_ids de los restaurantes del usuario
      const { data: invIds } = await client
        .from('inventario')
        .select('id')
        .in('restaurante_id', restauranteIds);
      const inventarioIds = invIds?.map((i: any) => i.id) || [];
      if (inventarioIds.length === 0) {
        return res.json({ ok: true, data: [], total: 0, pagina: Number(pagina), total_paginas: 0 });
      }
      query = query.in('inventario_id', inventarioIds);
    }

    if (inventario_id) query = query.eq('inventario_id', inventario_id);
    if (tipo_movimiento) query = query.eq('tipo_movimiento', tipo_movimiento);
    if (fecha_desde) query = query.gte('created_at', fecha_desde);
    if (fecha_hasta) query = query.lte('created_at', fecha_hasta);

    const offset = (Number(pagina) - 1) * Number(limite);
    query = query.range(offset, offset + Number(limite) - 1);
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error al obtener movimientos:', error);
      return res.status(500).json({ ok: false, message: 'Error al obtener movimientos', error: error.message });
    }

    res.json({
      ok: true,
      data: data || [],
      total: count || 0,
      pagina: Number(pagina),
      total_paginas: Math.ceil((count || 0) / Number(limite))
    });
  } catch (error) {
    console.error('Error en obtenerMovimientos:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Crear movimiento de inventario
export const crearMovimiento = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const { inventario_id, tipo_movimiento, cantidad, motivo, referencia } = req.body;

    if (!inventario_id || !tipo_movimiento || !cantidad || !motivo) {
      return res.status(400).json({ ok: false, message: 'Faltan datos requeridos' });
    }

    if (!['entrada', 'salida', 'ajuste'].includes(tipo_movimiento)) {
      return res.status(400).json({ ok: false, message: 'Tipo de movimiento inválido' });
    }

    const client = supabaseAdmin || supabase;

    const { data: inventario, error: invError } = await client
      .from('inventario')
      .select('id, stock_actual, stock_minimo, nombre, restaurante_id')
      .eq('id', inventario_id)
      .single();

    if (invError || !inventario) {
      return res.status(404).json({ ok: false, message: 'Item de inventario no encontrado' });
    }

    const acceso = await tieneAccesoRestaurante(client, req.user_info, inventario.restaurante_id);
    if (!acceso) {
      return res.status(403).json({ ok: false, message: 'No tienes acceso a este inventario' });
    }

    if (tipo_movimiento === 'salida' && inventario.stock_actual < cantidad) {
      return res.status(400).json({ ok: false, message: 'Stock insuficiente para esta operación' });
    }

    const { data, error } = await client
      .from('movimientos_inventario')
      .insert({ inventario_id, tipo_movimiento, cantidad, motivo, referencia, usuario_id: req.user_info.id })
      .select(`*, inventario:inventario_id (id, nombre, stock_actual, stock_minimo, restaurante_id)`)
      .single();

    if (error) {
      console.error('Error al crear movimiento — detalle:', JSON.stringify(error));
      console.error('Datos enviados:', { inventario_id, tipo_movimiento, cantidad, motivo, usuario_id: req.user_info.id });
      return res.status(500).json({ ok: false, message: 'Error al crear movimiento', error: error.message });
    }

    // Desglose automático: si es entrada y el producto tiene desglose, crear entradas para cada pieza
    if (tipo_movimiento === 'entrada') {
      const { data: reglas } = await client
        .from('inventario_desglose')
        .select('componente_id, cantidad')
        .eq('producto_id', inventario_id);

      if (reglas && reglas.length > 0) {
        for (const regla of reglas) {
          await client
            .from('movimientos_inventario')
            .insert({
              inventario_id: regla.componente_id,
              tipo_movimiento: 'entrada',
              cantidad: cantidad * regla.cantidad,
              motivo: `Desglose automático de ${inventario.nombre} (×${cantidad})`,
              referencia: data.id,
              usuario_id: req.user_info.id,
            });
        }
      }
    }

    // Verificar alertas de stock tras el movimiento
    const { data: invActualizado } = await client
      .from('inventario')
      .select('id, stock_actual, stock_minimo, nombre, restaurante_id')
      .eq('id', inventario_id)
      .single();

    if (invActualizado) {
      const { stock_actual, stock_minimo, nombre, restaurante_id } = invActualizado;

      const { data: alertasRecientes } = await client
        .from('alertas_stock')
        .select('id, tipo_alerta, created_at')
        .eq('inventario_id', inventario_id)
        .eq('leida', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (alertasRecientes && alertasRecientes.length > 0) {
        const alerta = alertasRecientes[0];
        const segundosDesdeCreacion = (Date.now() - new Date(alerta.created_at).getTime()) / 1000;

        if (segundosDesdeCreacion <= 2 && restaurante_id && nombre) {
          try {
            if (alerta.tipo_alerta === 'stock_agotado') {
              await NotificacionesService.notificarProductoAgotado(inventario_id, nombre, restaurante_id);
            } else {
              await NotificacionesService.notificarStockBajo(inventario_id, nombre, restaurante_id, stock_actual, stock_minimo);
            }
          } catch (e) {
            console.error('Error al enviar notificación de stock:', e);
          }
        }
      }

      if (tipo_movimiento === 'entrada' && stock_actual > stock_minimo && inventario.stock_actual <= stock_minimo) {
        try {
          await NotificacionesService.notificarStockRecargado(inventario_id, nombre, restaurante_id, stock_actual);
        } catch (e) {
          console.error('Error al enviar notificación de stock recargado:', e);
        }
      }
    }

    res.status(201).json({ ok: true, data, message: 'Movimiento creado exitosamente' });
  } catch (error) {
    console.error('Error en crearMovimiento:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Obtener alertas de stock
export const obtenerAlertas = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const { leida, tipo_alerta, pagina = 1, limite = 10, restaurante_id: restauranteIdParam } = req.query;

    const client = supabaseAdmin || supabase;

    let query = client
      .from('alertas_stock')
      .select(`*, inventario:inventario_id (id, nombre, restaurante_id)`, { count: 'exact' });

    let restauranteIds = await getRestauranteIds(client, req.user_info);
    // Si se pasa restaurante_id, filtrar solo por ese restaurante (evita confusión al mezclar varios)
    if (typeof restauranteIdParam === 'string' && restauranteIdParam.trim()) {
      const idFiltro = restauranteIdParam.trim();
      if (restauranteIds === null) {
        restauranteIds = [idFiltro]; // Super Admin puede filtrar por cualquier restaurante
      } else if (restauranteIds.includes(idFiltro)) {
        restauranteIds = [idFiltro]; // Admin/usuario: solo si tiene acceso
      }
    }
    if (restauranteIds !== null) {
      if (restauranteIds.length === 0) {
        return res.json({ ok: true, data: [], total: 0 });
      }
      const { data: invIds } = await client
        .from('inventario')
        .select('id')
        .in('restaurante_id', restauranteIds);
      const inventarioIds = invIds?.map((i: any) => i.id) || [];
      if (inventarioIds.length === 0) {
        return res.json({ ok: true, data: [], total: 0 });
      }
      query = query.in('inventario_id', inventarioIds);
    }

    if (leida !== undefined) query = query.eq('leida', leida === 'true');
    if (tipo_alerta) query = query.eq('tipo_alerta', tipo_alerta);

    const offset = (Number(pagina) - 1) * Number(limite);
    query = query.range(offset, offset + Number(limite) - 1);
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error al obtener alertas:', error);
      return res.status(500).json({ ok: false, message: 'Error al obtener alertas', error: error.message });
    }

    res.json({ ok: true, data: data || [], total: count || 0 });
  } catch (error) {
    console.error('Error en obtenerAlertas:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Marcar alerta como leída
export const marcarAlertaLeida = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;

    const { data: alerta, error: alertaError } = await client
      .from('alertas_stock')
      .select(`*, inventario:inventario_id (restaurante_id)`)
      .eq('id', req.params.id)
      .single();

    if (alertaError || !alerta) {
      return res.status(404).json({ ok: false, message: 'Alerta no encontrada' });
    }

    const acceso = await tieneAccesoRestaurante(client, req.user_info, alerta.inventario?.restaurante_id);
    if (!acceso) {
      return res.status(403).json({ ok: false, message: 'No tienes acceso a esta alerta' });
    }

    const { data, error } = await client
      .from('alertas_stock')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ ok: false, message: 'Error al marcar alerta como leída', error: error.message });
    }

    res.json({ ok: true, data, message: 'Alerta marcada como leída' });
  } catch (error) {
    console.error('Error en marcarAlertaLeida:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Marcar todas las alertas como leídas
export const marcarTodasAlertasLeidas = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;
    const restauranteIds = await getRestauranteIds(client, req.user_info);

    let alertaIds: string[] = [];

    if (restauranteIds === null) {
      // Super Admin: marcar todas
      const { data } = await client.from('alertas_stock').select('id').eq('leida', false);
      alertaIds = data?.map((a: any) => a.id) || [];
    } else {
      if (restauranteIds.length === 0) {
        return res.json({ ok: true, message: 'No hay alertas pendientes' });
      }
      const { data: invIds } = await client
        .from('inventario')
        .select('id')
        .in('restaurante_id', restauranteIds);
      const inventarioIds = invIds?.map((i: any) => i.id) || [];
      if (inventarioIds.length === 0) {
        return res.json({ ok: true, message: 'No hay alertas pendientes' });
      }
      const { data } = await client
        .from('alertas_stock')
        .select('id')
        .eq('leida', false)
        .in('inventario_id', inventarioIds);
      alertaIds = data?.map((a: any) => a.id) || [];
    }

    if (alertaIds.length === 0) {
      return res.json({ ok: true, message: 'No hay alertas pendientes por marcar como leídas' });
    }

    const { error } = await client
      .from('alertas_stock')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .in('id', alertaIds);

    if (error) {
      return res.status(500).json({ ok: false, message: 'Error al marcar alertas', error: error.message });
    }

    res.json({ ok: true, message: 'Todas las alertas han sido marcadas como leídas' });
  } catch (error) {
    console.error('Error en marcarTodasAlertasLeidas:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Eliminar alerta de stock
export const eliminarAlerta = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;

    const { data: alerta, error: alertaError } = await client
      .from('alertas_stock')
      .select(`*, inventario:inventario_id (restaurante_id)`)
      .eq('id', req.params.id)
      .single();

    if (alertaError || !alerta) {
      return res.status(404).json({ ok: false, message: 'Alerta no encontrada' });
    }

    const acceso = await tieneAccesoRestaurante(client, req.user_info, alerta.inventario?.restaurante_id);
    if (!acceso) {
      return res.status(403).json({ ok: false, message: 'No tienes acceso a esta alerta' });
    }

    const { error } = await client.from('alertas_stock').delete().eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ ok: false, message: 'Error al eliminar alerta', error: error.message });
    }

    res.json({ ok: true, message: 'Alerta eliminada' });
  } catch (error) {
    console.error('Error en eliminarAlerta:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Obtener productos con stock bajo
export const obtenerProductosStockBajo = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;

    let query = client
      .from('inventario')
      .select('*')
      .eq('activo', true)
      .gt('stock_actual', 0);

    const restauranteIds = await getRestauranteIds(client, req.user_info);
    if (restauranteIds !== null) {
      if (restauranteIds.length === 0) return res.json({ ok: true, data: [] });
      query = query.in('restaurante_id', restauranteIds);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ ok: false, message: 'Error al obtener productos con stock bajo', error: error.message });
    }

    // Filtrar productos donde stock_actual <= stock_minimo
    const stockBajo = (data || []).filter((item: any) => item.stock_actual <= item.stock_minimo);

    res.json({ ok: true, data: stockBajo });
  } catch (error) {
    console.error('Error en obtenerProductosStockBajo:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Verificar stock disponible por inventario_id (inventario ya no tiene menu_id)
export const verificarStockDisponible = async (req: Request, res: Response) => {
  try {
    const { inventarioId } = req.params;
    const { cantidad } = req.query;

    if (!cantidad) {
      return res.status(400).json({ ok: false, message: 'Cantidad requerida' });
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('inventario')
      .select('stock_actual')
      .eq('id', inventarioId)
      .eq('activo', true)
      .single();

    if (error || !data) {
      return res.json({ ok: true, disponible: true, stock_actual: 0 });
    }

    res.json({
      ok: true,
      disponible: data.stock_actual >= Number(cantidad),
      stock_actual: data.stock_actual
    });
  } catch (error) {
    console.error('Error en verificarStockDisponible:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de inventario
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;
    const restauranteIds = await getRestauranteIds(client, req.user_info);

    // Base queries
    let invQuery = client.from('inventario').select('stock_actual, stock_minimo, costo_unitario').eq('activo', true);
    let alertasQuery = client.from('alertas_stock').select('id', { count: 'exact', head: true }).eq('leida', false);
    let movimientosQuery = client.from('movimientos_inventario').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]);

    if (restauranteIds !== null) {
      if (restauranteIds.length === 0) {
        return res.json({
          ok: true,
          data: { total_productos: 0, productos_stock_bajo: 0, productos_agotados: 0, valor_total_inventario: 0, movimientos_hoy: 0, alertas_pendientes: 0 }
        });
      }

      const { data: invIds } = await client.from('inventario').select('id').in('restaurante_id', restauranteIds);
      const inventarioIds = invIds?.map((i: any) => i.id) || [];

      invQuery = invQuery.in('restaurante_id', restauranteIds);
      if (inventarioIds.length > 0) {
        alertasQuery = alertasQuery.in('inventario_id', inventarioIds);
        movimientosQuery = movimientosQuery.in('inventario_id', inventarioIds);
      }
    }

    const [{ data: invData }, { count: alertasPendientes }, { count: movimientosHoy }] = await Promise.all([
      invQuery,
      alertasQuery,
      movimientosQuery
    ]);

    const items = invData || [];
    const totalProductos = items.length;
    const productosAgotados = items.filter((i: any) => i.stock_actual === 0).length;
    const productosStockBajo = items.filter((i: any) => i.stock_actual > 0 && i.stock_actual <= i.stock_minimo).length;
    const valorTotalInventario = items.reduce((sum: number, i: any) => sum + (i.stock_actual * (i.costo_unitario || 0)), 0);

    res.json({
      ok: true,
      data: {
        total_productos: totalProductos,
        productos_stock_bajo: productosStockBajo,
        productos_agotados: productosAgotados,
        valor_total_inventario: valorTotalInventario,
        movimientos_hoy: movimientosHoy || 0,
        alertas_pendientes: alertasPendientes || 0
      }
    });
  } catch (error) {
    console.error('Error en obtenerEstadisticas:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// ---- Endpoints de Desglose ----

// Obtener reglas de desglose de un producto
export const obtenerDesglose = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('inventario_desglose')
      .select('id, producto_id, componente_id, cantidad, componente:componente_id (id, nombre, unidad_medida)')
      .eq('producto_id', req.params.id);

    if (error) {
      console.error('Error al obtener desglose:', error);
      return res.status(500).json({ ok: false, message: 'Error al obtener desglose', error: error.message });
    }

    res.json({ ok: true, data: data || [] });
  } catch (error) {
    console.error('Error en obtenerDesglose:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Crear o actualizar una regla de desglose
export const crearReglaDesglose = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const { componente_id, cantidad } = req.body;
    if (!componente_id || !cantidad || cantidad <= 0) {
      return res.status(400).json({ ok: false, message: 'Faltan datos: componente_id y cantidad > 0' });
    }

    const client = supabaseAdmin || supabase;

    // Upsert: si ya existe la regla para ese componente, actualizar cantidad
    const { data: existing } = await client
      .from('inventario_desglose')
      .select('id')
      .eq('producto_id', req.params.id)
      .eq('componente_id', componente_id)
      .single();

    let data, error;
    if (existing) {
      ({ data, error } = await client
        .from('inventario_desglose')
        .update({ cantidad })
        .eq('id', existing.id)
        .select('id, producto_id, componente_id, cantidad, componente:componente_id (id, nombre, unidad_medida)')
        .single());
    } else {
      ({ data, error } = await client
        .from('inventario_desglose')
        .insert({ producto_id: req.params.id, componente_id, cantidad })
        .select('id, producto_id, componente_id, cantidad, componente:componente_id (id, nombre, unidad_medida)')
        .single());
    }

    if (error) {
      console.error('Error al crear regla de desglose:', error);
      return res.status(500).json({ ok: false, message: 'Error al crear regla de desglose', error: error.message });
    }

    res.status(201).json({ ok: true, data, message: 'Regla de desglose guardada' });
  } catch (error) {
    console.error('Error en crearReglaDesglose:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Eliminar una regla de desglose
export const eliminarReglaDesglose = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ ok: false, message: 'No se encontró información del usuario autenticado' });
    }

    const client = supabaseAdmin || supabase;
    const { error } = await client
      .from('inventario_desglose')
      .delete()
      .eq('id', req.params.reglaId)
      .eq('producto_id', req.params.id);

    if (error) {
      console.error('Error al eliminar regla de desglose:', error);
      return res.status(500).json({ ok: false, message: 'Error al eliminar regla', error: error.message });
    }

    res.json({ ok: true, message: 'Regla eliminada' });
  } catch (error) {
    console.error('Error en eliminarReglaDesglose:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};
