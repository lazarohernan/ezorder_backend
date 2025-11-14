import { Request, Response } from 'express';
import { getClientWithRLS } from '../utils/supabaseHelpers';
import NotificacionesService from '../services/notificacionesService';

// Interfaces
interface InventarioItem {
  id: string;
  menu_id: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo?: number;
  unidad_medida: string;
  costo_unitario: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  menu?: {
    id: string;
    nombre: string;
    imagen?: string;
    requiere_inventario: boolean;
    restaurante_id?: string;
  };
}

interface AlertaStock {
  id: string;
  inventario_id: string;
  tipo_alerta: 'stock_bajo' | 'stock_agotado' | 'stock_critico';
  mensaje: string;
  leida: boolean;
  usuario_notificado?: string;
  created_at: string;
  leida_at?: string;
}

// Helpers
const getUserRestaurants = async (client: any, userId: string): Promise<string[]> => {
  const { data } = await client
    .from('usuarios_restaurantes')
    .select('restaurante_id')
    .eq('usuario_id', userId);
  return data?.map((ur: any) => ur.restaurante_id) || [];
};

const checkRestaurantAccess = async (
  client: any,
  req: Request,
  restauranteId: string
): Promise<boolean> => {
  const id_rol = req.user_info?.rol_id ?? 3;
  
  if (id_rol === 1) return true; // Super Admin
  
  if (id_rol === 2) {
    const restaurantIds = await getUserRestaurants(client, req.user_info.id);
    return restaurantIds.includes(restauranteId);
  }
  
  return req.user_info.restaurante_id === restauranteId;
};

const getMenuSelect = () => `
  id,
  nombre,
  imagen,
  requiere_inventario,
  restaurante_id
`;

const getInventorySelect = () => `
  *,
  menu:menu_id (${getMenuSelect()})
`;

// Obtener todos los items de inventario con filtros
export const obtenerInventario = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const {
      busqueda,
      estado_stock,
      requiere_inventario,
      activo,
      pagina = 1,
      limite = 10
    } = req.query;

    const client = await getClientWithRLS(req);
    const id_rol = req.user_info?.rol_id ?? 3;

    // Obtener restaurantes permitidos
    let restaurantesPermitidos: string[] = [];
    if (id_rol === 2) {
      restaurantesPermitidos = await getUserRestaurants(client, req.user_info.id);
      if (restaurantesPermitidos.length === 0) {
        return res.json({
          ok: true,
          data: [],
          total: 0,
          pagina: Number(pagina),
          total_paginas: 0
        });
      }
    } else if (id_rol === 3) {
      if (!req.user_info.restaurante_id) {
        return res.json({
          ok: true,
          data: [],
          total: 0,
          pagina: Number(pagina),
          total_paginas: 0
        });
      }
      restaurantesPermitidos = [req.user_info.restaurante_id];
    }

    let query = client
      .from('inventario')
      .select(getInventorySelect(), { count: id_rol === 1 ? 'exact' : undefined });

    // Aplicar filtros
    if (busqueda && id_rol === 1) {
      query = query.ilike('menu.nombre', `%${busqueda}%`);
    }

    if (activo !== undefined) {
      query = query.eq('activo', activo === 'true');
    }

    if (estado_stock === 'agotado') {
      query = query.eq('stock_actual', 0);
    }

    if (id_rol === 1) {
      // Super Admin: aplicar paginación y ordenamiento
      const offset = (Number(pagina) - 1) * Number(limite);
      query = query.range(offset, offset + Number(limite) - 1)
        .order('updated_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return res.status(500).json({
          ok: false,
          message: 'Error al obtener inventario',
          error: error.message
        });
      }

      return res.json({
        ok: true,
        data: data || [],
        total: count || 0,
        pagina: Number(pagina),
        total_paginas: Math.ceil((count || 0) / Number(limite))
      });
    }

    // Admin y usuarios normales: filtrar manualmente
    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al obtener inventario',
        error: error.message
      });
    }

    // Filtrar por restaurantes permitidos
    let filteredData = (data || []).filter((item: any) =>
      item.menu && restaurantesPermitidos.includes(item.menu.restaurante_id)
    );

    // Aplicar filtros adicionales
    if (busqueda) {
      filteredData = filteredData.filter((item: any) =>
        item.menu?.nombre?.toLowerCase().includes(busqueda.toString().toLowerCase())
      );
    }

    if (requiere_inventario !== undefined) {
      filteredData = filteredData.filter((item: any) =>
        item.menu?.requiere_inventario === (requiere_inventario === 'true')
      );
    }

    // Paginación manual
    const offset = (Number(pagina) - 1) * Number(limite);
    const paginatedData = filteredData.slice(offset, offset + Number(limite));

    return res.json({
      ok: true,
      data: paginatedData,
      total: filteredData.length,
      pagina: Number(pagina),
      total_paginas: Math.ceil(filteredData.length / Number(limite))
    });

  } catch (error) {
    console.error('Error en obtenerInventario:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener un item de inventario por ID
export const obtenerInventarioPorId = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const { id } = req.params;
    const client = await getClientWithRLS(req);

    const { data, error } = await client
      .from('inventario')
      .select(getInventorySelect())
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        ok: false,
        message: 'Item de inventario no encontrado'
      });
    }

    const restauranteIdInventario = (data as any)?.menu?.restaurante_id;

    if (!(await checkRestaurantAccess(client, req, restauranteIdInventario))) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes acceso a este inventario'
      });
    }

    res.json({ ok: true, data });

  } catch (error) {
    console.error('Error en obtenerInventarioPorId:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nuevo item de inventario
export const crearInventario = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const {
      menu_id,
      stock_actual,
      stock_minimo,
      stock_maximo,
      unidad_medida,
      costo_unitario
    } = req.body;

    // Validar datos requeridos
    if (!menu_id ||
      stock_actual === undefined || stock_actual === null ||
      stock_minimo === undefined || stock_minimo === null ||
      !unidad_medida ||
      costo_unitario === undefined || costo_unitario === null) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan datos requeridos: menu_id, stock_actual, stock_minimo, unidad_medida, costo_unitario'
      });
    }

    // Validar valores numéricos
    if (isNaN(Number(stock_actual)) || isNaN(Number(stock_minimo)) || isNaN(Number(costo_unitario))) {
      return res.status(400).json({
        ok: false,
        message: 'Los valores numéricos deben ser válidos'
      });
    }

    const client = await getClientWithRLS(req);

    // Verificar que el menú existe
    const { data: menu, error: menuError } = await client
      .from('menu')
      .select('id, nombre, restaurante_id')
      .eq('id', menu_id)
      .single();

    if (menuError || !menu) {
      return res.status(404).json({
        ok: false,
        message: 'Producto del menú no encontrado'
      });
    }

    // Verificar permisos
    if (!(await checkRestaurantAccess(client, req, (menu as any).restaurante_id))) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes acceso a este restaurante'
      });
    }

    // Verificar que no existe inventario para este menú
    const { data: existingInventory } = await client
      .from('inventario')
      .select('id')
      .eq('menu_id', menu_id)
      .single();

    if (existingInventory) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe inventario para este producto'
      });
    }

    // Crear inventario
    const { data, error } = await client
      .from('inventario')
      .insert({
        menu_id,
        stock_actual: Number(stock_actual),
        stock_minimo: Number(stock_minimo),
        stock_maximo: stock_maximo !== undefined && stock_maximo !== null ? Number(stock_maximo) : null,
        unidad_medida,
        costo_unitario: Number(costo_unitario)
      })
      .select(getInventorySelect())
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al crear inventario',
        error: error.message
      });
    }

    res.status(201).json({
      ok: true,
      data,
      message: 'Inventario creado exitosamente'
    });

  } catch (error) {
    console.error('Error en crearInventario:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar item de inventario
export const actualizarInventario = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const { id } = req.params;
    const {
      stock_minimo,
      stock_maximo,
      unidad_medida,
      costo_unitario,
      activo
    } = req.body;

    const client = await getClientWithRLS(req);

    // Verificar que el inventario existe
    const { data: existingInventory, error: checkError } = await client
      .from('inventario')
      .select(`id, menu:menu_id (id, restaurante_id)`)
      .eq('id', id)
      .single();

    if (checkError || !existingInventory) {
      return res.status(404).json({
        ok: false,
        message: 'Item de inventario no encontrado'
      });
    }

    const restauranteIdInventario = (existingInventory.menu as any)?.restaurante_id;

    // Verificar permisos
    if (!(await checkRestaurantAccess(client, req, restauranteIdInventario))) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes acceso a este inventario'
      });
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    if (stock_minimo !== undefined) updateData.stock_minimo = stock_minimo;
    if (stock_maximo !== undefined) updateData.stock_maximo = stock_maximo;
    if (unidad_medida !== undefined) updateData.unidad_medida = unidad_medida;
    if (costo_unitario !== undefined) updateData.costo_unitario = costo_unitario;
    if (activo !== undefined) updateData.activo = activo;

    // Actualizar inventario
    const { data, error } = await client
      .from('inventario')
      .update(updateData)
      .eq('id', id)
      .select(getInventorySelect())
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al actualizar inventario',
        error: error.message
      });
    }

    res.json({
      ok: true,
      data,
      message: 'Inventario actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error en actualizarInventario:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar item de inventario
export const eliminarInventario = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const { id } = req.params;
    const client = await getClientWithRLS(req);

    // Verificar que el inventario existe
    const { data: existingInventory, error: checkError } = await client
      .from('inventario')
      .select(`id, menu:menu_id (id, restaurante_id)`)
      .eq('id', id)
      .single();

    if (checkError || !existingInventory) {
      return res.status(404).json({
        ok: false,
        message: 'Item de inventario no encontrado'
      });
    }

    const restauranteIdInventario = (existingInventory.menu as any)?.restaurante_id;

    // Verificar permisos
    if (!(await checkRestaurantAccess(client, req, restauranteIdInventario))) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes acceso a este inventario'
      });
    }

    // Eliminar inventario
    const { error } = await client
      .from('inventario')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al eliminar inventario',
        error: error.message
      });
    }

    res.json({
      ok: true,
      message: 'Inventario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error en eliminarInventario:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener movimientos de inventario
export const obtenerMovimientos = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const {
      inventario_id,
      tipo_movimiento,
      fecha_desde,
      fecha_hasta,
      pagina = 1,
      limite = 10
    } = req.query;

    const client = await getClientWithRLS(req);
    const id_rol = req.user_info?.rol_id ?? 3;

    let query = client
      .from('movimientos_inventario')
      .select(`
        *,
        inventario:inventario_id (
          id,
          menu:menu_id (${getMenuSelect()})
        )
      `, { count: 'exact' });

    // Filtrar por restaurante según rol
    if (id_rol === 2) {
      const restaurantIds = await getUserRestaurants(client, req.user_info.id);
      if (restaurantIds.length === 0) {
        return res.json({
          ok: true,
          data: [],
          total: 0,
          pagina: Number(pagina),
          total_paginas: 0
        });
      }

      const { data: inventarios } = await client
        .from('inventario')
        .select('id, menu:menu_id (restaurante_id)');

      const inventarioIds = inventarios
        ?.filter((inv: any) => restaurantIds.includes(inv.menu?.restaurante_id))
        ?.map((inv: any) => inv.id) || [];

      if (inventarioIds.length === 0) {
        return res.json({
          ok: true,
          data: [],
          total: 0,
          pagina: Number(pagina),
          total_paginas: 0
        });
      }

      query = query.in('inventario_id', inventarioIds);
    } else if (id_rol === 3) {
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          ok: false,
          message: 'El usuario no tiene un restaurante asignado'
        });
      }

      const { data: inventarios } = await client
        .from('inventario')
        .select('id, menu:menu_id (restaurante_id)');

      const inventarioIds = inventarios
        ?.filter((inv: any) => inv.menu?.restaurante_id === restaurante_id)
        ?.map((inv: any) => inv.id) || [];

      if (inventarioIds.length === 0) {
        return res.json({
          ok: true,
          data: [],
          total: 0,
          pagina: Number(pagina),
          total_paginas: 0
        });
      }

      query = query.in('inventario_id', inventarioIds);
    }

    // Aplicar filtros adicionales
    if (inventario_id) query = query.eq('inventario_id', inventario_id);
    if (tipo_movimiento) query = query.eq('tipo_movimiento', tipo_movimiento);
    if (fecha_desde) query = query.gte('created_at', fecha_desde);
    if (fecha_hasta) query = query.lte('created_at', fecha_hasta);

    // Paginación
    const offset = (Number(pagina) - 1) * Number(limite);
    query = query.range(offset, offset + Number(limite) - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al obtener movimientos',
        error: error.message
      });
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
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear movimiento de inventario
export const crearMovimiento = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const {
      inventario_id,
      tipo_movimiento,
      cantidad,
      motivo,
      referencia
    } = req.body;

    // Validar datos requeridos
    if (!inventario_id || !tipo_movimiento || !cantidad || !motivo) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan datos requeridos'
      });
    }

    // Validar tipo de movimiento
    if (!['entrada', 'salida', 'ajuste'].includes(tipo_movimiento)) {
      return res.status(400).json({
        ok: false,
        message: 'Tipo de movimiento inválido'
      });
    }

    const client = await getClientWithRLS(req);

    // Verificar que el inventario existe
    const { data: inventario, error: inventarioError } = await client
      .from('inventario')
      .select(`id, stock_actual, menu:menu_id (id, nombre, restaurante_id)`)
      .eq('id', inventario_id)
      .single();

    if (inventarioError || !inventario) {
      return res.status(404).json({
        ok: false,
        message: 'Item de inventario no encontrado'
      });
    }

    const restauranteIdInventario = (inventario.menu as any)?.restaurante_id;

    // Verificar permisos
    if (!(await checkRestaurantAccess(client, req, restauranteIdInventario))) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes acceso a este inventario'
      });
    }

    // Para salidas, verificar que hay stock suficiente
    if (tipo_movimiento === 'salida' && inventario.stock_actual < cantidad) {
      return res.status(400).json({
        ok: false,
        message: 'Stock insuficiente para esta operación'
      });
    }

    // Crear movimiento
    const { data, error } = await client
      .from('movimientos_inventario')
      .insert({
        inventario_id,
        tipo_movimiento,
        cantidad,
        motivo,
        referencia,
        usuario_id: req.user_info.id
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al crear movimiento',
        error: error.message
      });
    }

    // Verificar si se creó una alerta y enviar notificación
    try {
      const { data: inventarioActualizado } = await client
        .from('inventario')
        .select(`id, stock_actual, stock_minimo, menu:menu_id (id, nombre, restaurante_id)`)
        .eq('id', inventario_id)
        .single();

      if (inventarioActualizado) {
        const stockActual = inventarioActualizado.stock_actual;
        const stockMinimo = inventarioActualizado.stock_minimo;
        const menuNombre = (inventarioActualizado.menu as any)?.nombre;
        const menuId = (inventarioActualizado.menu as any)?.id;
        const restauranteId = (inventarioActualizado.menu as any)?.restaurante_id;

        // Verificar alertas recientes (últimos 2 segundos)
        const { data: alertasRecientes } = await client
          .from('alertas_stock')
          .select('id, tipo_alerta, created_at')
          .eq('inventario_id', inventario_id)
          .eq('leida', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (alertasRecientes && alertasRecientes.length > 0) {
          const alerta = alertasRecientes[0];
          const fechaCreacion = new Date(alerta.created_at);
          const diferenciaSegundos = (Date.now() - fechaCreacion.getTime()) / 1000;

          if (diferenciaSegundos <= 2 && restauranteId && menuNombre) {
            if (alerta.tipo_alerta === 'stock_agotado') {
              await NotificacionesService.notificarProductoAgotado(menuId, menuNombre, restauranteId);
            } else if (['stock_critico', 'stock_bajo'].includes(alerta.tipo_alerta)) {
              await NotificacionesService.notificarStockBajo(menuId, menuNombre, restauranteId, stockActual, stockMinimo);
            }
          }
        }

        // Si el stock mejoró, enviar notificación positiva
        if (tipo_movimiento === 'entrada' && stockActual > stockMinimo && inventario.stock_actual <= stockMinimo) {
          await NotificacionesService.notificarStockRecargado(menuId, menuNombre, restauranteId, stockActual);
        }
      }
    } catch (notifError) {
      // No fallar la operación si falla la notificación
      console.error('Error al procesar notificaciones:', notifError);
    }

    res.status(201).json({
      ok: true,
      data,
      message: 'Movimiento creado exitosamente'
    });

  } catch (error) {
    console.error('Error en crearMovimiento:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener alertas de stock
export const obtenerAlertas = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const {
      leida,
      tipo_alerta,
      pagina = 1,
      limite = 10
    } = req.query;

    const client = await getClientWithRLS(req);
    const id_rol = req.user_info?.rol_id ?? 3;

    let query = client
      .from('alertas_stock')
      .select(`
        *,
        inventario:inventario_id (
          id,
          menu:menu_id (${getMenuSelect()})
        )
      `, { count: 'exact' });

    // Filtrar por restaurante según rol
    if (id_rol === 2) {
      const restaurantIds = await getUserRestaurants(client, req.user_info.id);
      if (restaurantIds.length === 0) {
        return res.json({
          ok: true,
          data: [],
          total: 0
        });
      }
      query = query.in('inventario.menu.restaurante_id', restaurantIds);
    } else if (id_rol === 3) {
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          ok: false,
          message: 'El usuario no tiene un restaurante asignado'
        });
      }
      query = query.eq('inventario.menu.restaurante_id', restaurante_id);
    }

    // Aplicar filtros adicionales
    if (leida !== undefined) query = query.eq('leida', leida === 'true');
    if (tipo_alerta) query = query.eq('tipo_alerta', tipo_alerta);

    // Paginación
    const offset = (Number(pagina) - 1) * Number(limite);
    query = query.range(offset, offset + Number(limite) - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al obtener alertas',
        error: error.message
      });
    }

    res.json({
      ok: true,
      data: data || [],
      total: count || 0
    });

  } catch (error) {
    console.error('Error en obtenerAlertas:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Marcar alerta como leída
export const marcarAlertaLeida = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const { id } = req.params;
    const client = await getClientWithRLS(req);

    // Verificar que la alerta existe y obtener restaurante
    const { data: alerta, error: alertaError } = await client
      .from('alertas_stock')
      .select(`*, inventario:inventario_id (menu:menu_id (restaurante_id))`)
      .eq('id', id)
      .single();

    if (alertaError || !alerta) {
      return res.status(404).json({
        ok: false,
        message: 'Alerta no encontrada'
      });
    }

    const restauranteAlerta = (alerta.inventario as any)?.menu?.restaurante_id;

    // Verificar permisos
    if (!(await checkRestaurantAccess(client, req, restauranteAlerta))) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes acceso a esta alerta'
      });
    }

    // Marcar como leída
    const { data, error } = await client
      .from('alertas_stock')
      .update({
        leida: true,
        leida_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al marcar alerta como leída',
        error: error.message
      });
    }

    res.json({
      ok: true,
      data,
      message: 'Alerta marcada como leída'
    });

  } catch (error) {
    console.error('Error en marcarAlertaLeida:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Marcar todas las alertas como leídas
export const marcarTodasAlertasLeidas = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const client = await getClientWithRLS(req);
    const id_rol = req.user_info?.rol_id ?? 3;

    // Obtener IDs de alertas según rol
    let alertaIds: string[] = [];

    if (id_rol === 1) {
      // Super Admin: todas las alertas no leídas
      const { data } = await client
        .from('alertas_stock')
        .select('id')
        .eq('leida', false);
      alertaIds = data?.map((a: any) => a.id) || [];
    } else if (id_rol === 2) {
      // Admin: alertas de sus restaurantes
      const restaurantIds = await getUserRestaurants(client, req.user_info.id);
      if (restaurantIds.length === 0) {
        return res.json({
          ok: true,
          message: 'No hay alertas pendientes por marcar como leídas'
        });
      }

      const { data: alertas } = await client
        .from('alertas_stock')
        .select(`id, inventario:inventario_id (menu:menu_id (restaurante_id))`)
        .eq('leida', false);

      alertaIds = alertas
        ?.filter((a: any) => restaurantIds.includes(a.inventario?.menu?.restaurante_id))
        ?.map((a: any) => a.id) || [];
    } else {
      // Usuarios normales: alertas de su restaurante
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          ok: false,
          message: 'El usuario no tiene un restaurante asignado'
        });
      }

      const { data: alertas } = await client
        .from('alertas_stock')
        .select(`id, inventario:inventario_id (menu:menu_id (restaurante_id))`)
        .eq('leida', false);

      alertaIds = alertas
        ?.filter((a: any) => a.inventario?.menu?.restaurante_id === restaurante_id)
        ?.map((a: any) => a.id) || [];
    }

    if (alertaIds.length === 0) {
      return res.json({
        ok: true,
        message: 'No hay alertas pendientes por marcar como leídas'
      });
    }

    // Marcar todas como leídas
    const { error } = await client
      .from('alertas_stock')
      .update({
        leida: true,
        leida_at: new Date().toISOString()
      })
      .in('id', alertaIds);

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al marcar todas las alertas como leídas',
        error: error.message
      });
    }

    res.json({
      ok: true,
      message: 'Todas las alertas han sido marcadas como leídas'
    });

  } catch (error) {
    console.error('Error en marcarTodasAlertasLeidas:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener productos con stock bajo
export const obtenerProductosStockBajo = async (req: Request, res: Response) => {
  try {
    const client = await getClientWithRLS(req);

    const { data, error } = await client
      .rpc('stock_productos_bajo', {
        p_restaurante_id: null,
        p_limite_stock: 10
      });

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Error al obtener productos con stock bajo',
        error: error.message
      });
    }

    res.json({
      ok: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error en obtenerProductosStockBajo:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Verificar stock disponible
export const verificarStockDisponible = async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;
    const { cantidad } = req.query;

    if (!cantidad) {
      return res.status(400).json({
        ok: false,
        message: 'Cantidad requerida'
      });
    }

    const client = await getClientWithRLS(req);
    const { data, error } = await client
      .from('inventario')
      .select('stock_actual')
      .eq('menu_id', menuId)
      .eq('activo', true)
      .single();

    if (error || !data) {
      return res.json({
        ok: true,
        disponible: true,
        stock_actual: 0
      });
    }

    res.json({
      ok: true,
      disponible: data.stock_actual >= Number(cantidad),
      stock_actual: data.stock_actual
    });

  } catch (error) {
    console.error('Error en verificarStockDisponible:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de inventario
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const client = await getClientWithRLS(req);
    const id_rol = req.user_info?.rol_id ?? 3;

    // Obtener IDs de restaurantes según rol
    let restaurantIds: string[] = [];

    if (id_rol === 2) {
      restaurantIds = await getUserRestaurants(client, req.user_info.id);
    } else if (id_rol === 3) {
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          ok: false,
          message: 'El usuario no tiene un restaurante asignado'
        });
      }
      restaurantIds = [restaurante_id];
    }

    // Construir queries base
    let inventarioQuery = client.from('inventario').select('*', { count: 'exact', head: true }).eq('activo', true);
    let alertasQuery = client.from('alertas_stock').select('*', { count: 'exact', head: true }).eq('leida', false);
    let inventarioDataQuery = client.from('inventario').select('stock_actual, stock_minimo, costo_unitario, menu:menu_id(restaurante_id)').eq('activo', true);

    // Filtrar por restaurantes si es necesario
    if (restaurantIds.length > 0) {
      const { data: menuIds } = await client
        .from('menu')
        .select('id')
        .in('restaurante_id', restaurantIds);

      const menuIdList = menuIds?.map((m: any) => m.id) || [];

      if (menuIdList.length === 0) {
        return res.json({
          ok: true,
          data: {
            total_productos: 0,
            productos_stock_bajo: 0,
            productos_agotados: 0,
            valor_total_inventario: 0,
            movimientos_hoy: 0,
            alertas_pendientes: 0
          }
        });
      }

      const { data: inventarioIds } = await client
        .from('inventario')
        .select('id')
        .in('menu_id', menuIdList);

      const inventarioIdList = inventarioIds?.map((inv: any) => inv.id) || [];

      inventarioQuery = inventarioQuery.in('menu_id', menuIdList);
      alertasQuery = alertasQuery.in('inventario_id', inventarioIdList);
      inventarioDataQuery = inventarioDataQuery.in('menu_id', menuIdList);
    }

    // Obtener estadísticas
    const fechaHoy = new Date().toISOString().split('T')[0];
    const [
      { count: totalProductos },
      { count: productosAgotados },
      { count: movimientosHoy },
      { count: alertasPendientes },
      { data: inventarioData }
    ] = await Promise.all([
      inventarioQuery,
      inventarioQuery.eq('stock_actual', 0),
      client.from('movimientos_inventario').select('*', { count: 'exact', head: true }).gte('created_at', fechaHoy),
      alertasQuery,
      inventarioDataQuery
    ]);

    // Calcular estadísticas
    const valorTotalInventario = inventarioData?.reduce((total, item) => {
      return total + (item.stock_actual * item.costo_unitario);
    }, 0) || 0;

    const productosStockBajo = inventarioData?.filter((item: any) =>
      item.stock_actual > 0 && item.stock_actual <= item.stock_minimo
    ).length || 0;

    res.json({
      ok: true,
      data: {
        total_productos: totalProductos || 0,
        productos_stock_bajo: productosStockBajo,
        productos_agotados: productosAgotados || 0,
        valor_total_inventario: valorTotalInventario,
        movimientos_hoy: movimientosHoy || 0,
        alertas_pendientes: alertasPendientes || 0
      }
    });

  } catch (error) {
    console.error('Error en obtenerEstadisticas:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
};
