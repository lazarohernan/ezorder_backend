import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../supabase/supabase';
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
    ingredientes?: string;
  };
}

interface MovimientoInventario {
  id: string;
  inventario_id: string;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string;
  referencia?: string;
  usuario_id?: string;
  created_at: string;
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

    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    let query = client
      .from('inventario')
      .select(`
        *,
        menu:menu_id (
          id,
          nombre,
          imagen,
          requiere_inventario,
          ingredientes,
          restaurante_id
        )
      `, { count: 'exact' });

    // Filtrar por restaurante según rol
    if (id_rol === 1) {
      // Super Admin ve todo el inventario
    } else if (id_rol === 2) {
      // Admin ve inventario de sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        query = query.in('menu.restaurante_id', restaurantIds);
      } else {
        // Si no tiene restaurantes, devolver vacío
        return res.json({
          ok: true,
          data: [],
          total: 0,
          pagina: Number(pagina),
          total_paginas: 0
        });
      }
    } else {
      // Usuarios normales solo ven inventario de su restaurante
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          ok: false,
          message: 'El usuario no tiene un restaurante asignado'
        });
      }
      query = query.eq('menu.restaurante_id', restaurante_id);
    }

    // Aplicar filtros
    if (busqueda) {
      query = query.ilike('menu.nombre', `%${busqueda}%`);
    }

    if (activo !== undefined) {
      query = query.eq('activo', activo === 'true');
    }

    if (requiere_inventario !== undefined) {
      query = query.eq('menu.requiere_inventario', requiere_inventario === 'true');
    }

    // Filtro por estado de stock
    // Nota: Los filtros de "bajo" y "normal" requieren comparar dos columnas (stock_actual vs stock_minimo)
    // que no es posible en PostgREST. Se manejan en el frontend.
    if (estado_stock === 'agotado') {
      query = query.eq('stock_actual', 0);
    }

    // Paginación
    const offset = (Number(pagina) - 1) * Number(limite);
    query = query.range(offset, offset + Number(limite) - 1);

    // Ordenar por fecha de actualización
    query = query.order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error al obtener inventario:', error);
      return res.status(500).json({
        ok: false,
        message: 'Error al obtener inventario',
        error: error.message
      });
    }

    const totalPaginas = Math.ceil((count || 0) / Number(limite));

    res.json({
      ok: true,
      data: data || [],
      total: count || 0,
      pagina: Number(pagina),
      total_paginas: totalPaginas
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

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("inventario")
      .select(`
        *,
        menu:menu_id (
          id,
          nombre,
          imagen,
          requiere_inventario,
          ingredientes,
          restaurante_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error al obtener inventario por ID:', error);
      return res.status(404).json({
        ok: false,
        message: 'Item de inventario no encontrado',
        error: error.message
      });
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    const restauranteIdInventario = (data.menu as any)?.restaurante_id;

    if (id_rol === 1) {
      // Super Admin puede ver cualquier inventario
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del inventario
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restauranteIdInventario)) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este inventario'
        });
      }
    } else {
      // Usuarios normales solo pueden ver inventario de su restaurante
      if (req.user_info.restaurante_id !== restauranteIdInventario) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este inventario'
        });
      }
    }

    res.json({
      ok: true,
      data
    });

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
    if (!menu_id || stock_actual === undefined || !stock_minimo || !unidad_medida || costo_unitario === undefined) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan datos requeridos'
      });
    }

    const client = supabaseAdmin || supabase;

    // Verificar que el menú existe y obtener su restaurante_id
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

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede crear inventario para cualquier menú
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del menú
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes((menu as any).restaurante_id)) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este restaurante'
        });
      }
    } else {
      // Usuarios normales solo pueden crear inventario para menús de su restaurante
      if (req.user_info.restaurante_id !== (menu as any).restaurante_id) {
        return res.status(403).json({
          ok: false,
          message: 'No puedes crear inventario para este producto'
        });
      }
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
      .from("inventario")
      .insert({
        menu_id,
        stock_actual,
        stock_minimo,
        stock_maximo,
        unidad_medida,
        costo_unitario
      })
      .select(`
        *,
        menu:menu_id (
          id,
          nombre,
          imagen,
          requiere_inventario,
          ingredientes
        )
      `)
      .single();

    if (error) {
      console.error('Error al crear inventario:', error);
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

    const client = supabaseAdmin || supabase;

    // Verificar que el inventario existe y obtener información del menú
    const { data: existingInventory, error: checkError } = await client
      .from('inventario')
      .select(`
        id,
        menu:menu_id (
          id,
          restaurante_id
        )
      `)
      .eq('id', id)
      .single();

    if (checkError || !existingInventory) {
      return res.status(404).json({
        ok: false,
        message: 'Item de inventario no encontrado'
      });
    }

    const restauranteIdInventario = (existingInventory.menu as any)?.restaurante_id;

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier inventario
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del inventario
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restauranteIdInventario)) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este inventario'
        });
      }
    } else {
      // Usuarios normales solo pueden actualizar inventario de su restaurante
      if (req.user_info.restaurante_id !== restauranteIdInventario) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este inventario'
        });
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (stock_minimo !== undefined) updateData.stock_minimo = stock_minimo;
    if (stock_maximo !== undefined) updateData.stock_maximo = stock_maximo;
    if (unidad_medida !== undefined) updateData.unidad_medida = unidad_medida;
    if (costo_unitario !== undefined) updateData.costo_unitario = costo_unitario;
    if (activo !== undefined) updateData.activo = activo;

    // Actualizar inventario
    const { data, error } = await client
      .from("inventario")
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        menu:menu_id (
          id,
          nombre,
          imagen,
          requiere_inventario,
          ingredientes
        )
      `)
      .single();

    if (error) {
      console.error('Error al actualizar inventario:', error);
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

    const client = supabaseAdmin || supabase;

    // Verificar que el inventario existe y obtener información del menú
    const { data: existingInventory, error: checkError } = await client
      .from('inventario')
      .select(`
        id,
        menu:menu_id (
          id,
          restaurante_id
        )
      `)
      .eq('id', id)
      .single();

    if (checkError || !existingInventory) {
      return res.status(404).json({
        ok: false,
        message: 'Item de inventario no encontrado'
      });
    }

    const restauranteIdInventario = (existingInventory.menu as any)?.restaurante_id;

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier inventario
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del inventario
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restauranteIdInventario)) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este inventario'
        });
      }
    } else {
      // Usuarios normales solo pueden eliminar inventario de su restaurante
      if (req.user_info.restaurante_id !== restauranteIdInventario) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este inventario'
        });
      }
    }

    // Eliminar inventario (esto también eliminará los movimientos por CASCADE)
    const { error } = await client
      .from('inventario')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar inventario:', error);
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

    // Usar supabaseAdmin para bypassear RLS y poder acceder a usuarios_info
    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    let query = client
      .from('movimientos_inventario')
      .select(`
        *,
        inventario:inventario_id (
          id,
          menu:menu_id (
            id,
            nombre,
            restaurante_id
          )
        ),
        usuario:usuario_id (
          id,
          nombre_usuario
        )
      `, { count: 'exact' });

    // Filtrar por restaurante según rol
    if (id_rol === 1) {
      // Super Admin ve todos los movimientos
    } else if (id_rol === 2) {
      // Admin ve movimientos de inventarios de sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        // Obtener inventarios de los restaurantes del admin
        const { data: inventariosAdmin } = await client
          .from('inventario')
          .select('id')
          .in('menu.restaurante_id', restaurantIds);

        const inventarioIds = inventariosAdmin?.map((inv: any) => inv.id) || [];
        
        if (inventarioIds.length > 0) {
          query = query.in('inventario_id', inventarioIds);
        } else {
          // Si no tiene inventarios, devolver vacío
          return res.json({
            ok: true,
            data: [],
            total: 0,
            pagina: Number(pagina),
            total_paginas: 0
          });
        }
      } else {
        // Si no tiene restaurantes, devolver vacío
        return res.json({
          ok: true,
          data: [],
          total: 0,
          pagina: Number(pagina),
          total_paginas: 0
        });
      }
    } else {
      // Usuarios normales solo ven movimientos de inventarios de su restaurante
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          ok: false,
          message: 'El usuario no tiene un restaurante asignado'
        });
      }

      // Obtener inventarios del restaurante del usuario
      const { data: inventariosUsuario } = await client
        .from('inventario')
        .select('id')
        .eq('menu.restaurante_id', restaurante_id);

      const inventarioIds = inventariosUsuario?.map((inv: any) => inv.id) || [];
      
      if (inventarioIds.length > 0) {
        query = query.in('inventario_id', inventarioIds);
      } else {
        return res.json({
          ok: true,
          data: [],
          total: 0,
          pagina: Number(pagina),
          total_paginas: 0
        });
      }
    }

    // Aplicar filtros adicionales
    if (inventario_id) {
      query = query.eq('inventario_id', inventario_id);
    }

    if (tipo_movimiento) {
      query = query.eq('tipo_movimiento', tipo_movimiento);
    }

    if (fecha_desde) {
      query = query.gte('created_at', fecha_desde);
    }

    if (fecha_hasta) {
      query = query.lte('created_at', fecha_hasta);
    }

    // Paginación
    const offset = (Number(pagina) - 1) * Number(limite);
    query = query.range(offset, offset + Number(limite) - 1);

    // Ordenar por fecha de creación
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error al obtener movimientos:', error);
      return res.status(500).json({
        ok: false,
        message: 'Error al obtener movimientos',
        error: error.message
      });
    }

    const totalPaginas = Math.ceil((count || 0) / Number(limite));

    res.json({
      ok: true,
      data: data || [],
      total: count || 0,
      pagina: Number(pagina),
      total_paginas: totalPaginas
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

    console.log('📥 Datos recibidos para crear movimiento:', {
      inventario_id,
      tipo_movimiento,
      cantidad,
      motivo,
      referencia
    });

    // Validar datos requeridos
    if (!inventario_id || !tipo_movimiento || !cantidad || !motivo) {
      console.log('❌ Faltan datos requeridos:', {
        tiene_inventario_id: !!inventario_id,
        tiene_tipo_movimiento: !!tipo_movimiento,
        tiene_cantidad: !!cantidad,
        tiene_motivo: !!motivo
      });
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

    const client = supabaseAdmin || supabase;

    // Verificar que el inventario existe y obtener información del menú
    const { data: inventario, error: inventarioError } = await client
      .from('inventario')
      .select(`
        id,
        stock_actual,
        menu:menu_id (
          id,
          nombre,
          restaurante_id
        )
      `)
      .eq('id', inventario_id)
      .single();

    if (inventarioError || !inventario) {
      return res.status(404).json({
        ok: false,
        message: 'Item de inventario no encontrado'
      });
    }

    const restauranteIdInventario = (inventario.menu as any)?.restaurante_id;

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede crear movimientos en cualquier inventario
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del inventario
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restauranteIdInventario)) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este inventario'
        });
      }
    } else {
      // Usuarios normales solo pueden crear movimientos en inventarios de su restaurante
      if (req.user_info.restaurante_id !== restauranteIdInventario) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este inventario'
        });
      }
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
      .select(`
        *,
        inventario:inventario_id (
          id,
          stock_actual,
          stock_minimo,
          menu:menu_id (
            id,
            nombre,
            restaurante_id
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error al crear movimiento:', error);
      return res.status(500).json({
        ok: false,
        message: 'Error al crear movimiento',
        error: error.message
      });
    }

    // Después de crear el movimiento, el trigger actualizará el stock
    // Esperar un momento y verificar si se creó una alerta
    // Obtener el inventario actualizado para verificar alertas
    const { data: inventarioActualizado, error: inventarioActualizadoError } = await client
      .from('inventario')
      .select(`
        id,
        stock_actual,
        stock_minimo,
        menu:menu_id (
          id,
          nombre,
          restaurante_id
        )
      `)
      .eq('id', inventario_id)
      .single();

    if (!inventarioActualizadoError && inventarioActualizado) {
      const stockActual = inventarioActualizado.stock_actual;
      const stockMinimo = inventarioActualizado.stock_minimo;
      const menuNombre = (inventarioActualizado.menu as any)?.nombre;
      const menuId = (inventarioActualizado.menu as any)?.id;
      const restauranteId = (inventarioActualizado.menu as any)?.restaurante_id;

      // Verificar si hay alertas recientes creadas para este inventario
      const { data: alertasRecientes } = await client
        .from('alertas_stock')
        .select('id, tipo_alerta, created_at')
        .eq('inventario_id', inventario_id)
        .eq('leida', false)
        .order('created_at', { ascending: false })
        .limit(1);

      // Si hay una alerta reciente (creada en los últimos 2 segundos), enviar notificación
      if (alertasRecientes && alertasRecientes.length > 0) {
        const alerta = alertasRecientes[0];
        const fechaCreacion = new Date(alerta.created_at);
        const ahora = new Date();
        const diferenciaSegundos = (ahora.getTime() - fechaCreacion.getTime()) / 1000;

        if (diferenciaSegundos <= 2 && restauranteId && menuNombre) {
          try {
            if (alerta.tipo_alerta === 'stock_agotado') {
              await NotificacionesService.notificarProductoAgotado(
                menuId,
                menuNombre,
                restauranteId
              );
            } else if (alerta.tipo_alerta === 'stock_critico' || alerta.tipo_alerta === 'stock_bajo') {
              await NotificacionesService.notificarStockBajo(
                menuId,
                menuNombre,
                restauranteId,
                stockActual,
                stockMinimo
              );
            }
          } catch (notifError) {
            console.error('Error al enviar notificación de stock:', notifError);
            // No fallar la operación si falla la notificación
          }
        }
      }

      // Si el stock mejoró (entrada que repone stock), enviar notificación positiva
      if (tipo_movimiento === 'entrada' && stockActual > stockMinimo && inventario.stock_actual <= stockMinimo) {
        try {
          await NotificacionesService.notificarStockRecargado(
            menuId,
            menuNombre,
            restauranteId,
            stockActual
          );
        } catch (notifError) {
          console.error('Error al enviar notificación de stock recargado:', notifError);
        }
      }
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

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    let query = client
      .from('alertas_stock')
      .select(`
        *,
        inventario:inventario_id (
          id,
          menu:menu_id (
            id,
            nombre,
            restaurante_id
          )
        )
      `, { count: 'exact' });

    // Filtrar por restaurante según rol
    if (id_rol === 1) {
      // Super Admin ve todas las alertas
    } else if (id_rol === 2) {
      // Admin ve alertas de sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        query = query.in('inventario.menu.restaurante_id', restaurantIds);
      } else {
        // Si no tiene restaurantes, devolver vacío
        return res.json({
          ok: true,
          data: [],
          total: 0
        });
      }
    } else {
      // Usuarios normales ven alertas de su restaurante
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
    if (leida !== undefined) {
      query = query.eq('leida', leida === 'true');
    }

    if (tipo_alerta) {
      query = query.eq('tipo_alerta', tipo_alerta);
    }

    // Paginación
    const offset = (Number(pagina) - 1) * Number(limite);
    query = query.range(offset, offset + Number(limite) - 1);

    // Ordenar por fecha de creación
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error al obtener alertas:', error);
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
    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    // Primero verificar que la alerta pertenezca a un restaurante del usuario
    const { data: alerta, error: alertaError } = await client
      .from('alertas_stock')
      .select(`
        *,
        inventario:inventario_id (
          menu:menu_id (
            restaurante_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (alertaError || !alerta) {
      return res.status(404).json({
        ok: false,
        message: 'Alerta no encontrada'
      });
    }

    const restauranteAlerta = alerta.inventario?.menu?.restaurante_id;
    
    // Verificar permisos
    if (id_rol === 1) {
      // Super Admin puede marcar cualquier alerta
    } else if (id_rol === 2) {
      // Admin solo puede marcar alertas de sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);
      
      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restauranteAlerta)) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a esta alerta'
        });
      }
    } else {
      // Usuarios normales solo pueden marcar alertas de su restaurante
      if (req.user_info.restaurante_id !== restauranteAlerta) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a esta alerta'
        });
      }
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
      console.error('Error al marcar alerta como leída:', error);
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

    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    let query = client
      .from('alertas_stock')
      .update({
        leida: true,
        leida_at: new Date().toISOString()
      })
      .eq('leida', false);

    // Filtrar por restaurante según rol
    if (id_rol === 1) {
      // Super Admin marca todas las alertas
    } else if (id_rol === 2) {
      // Admin marca alertas de sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        // Obtener IDs de alertas de sus restaurantes
        const { data: alertasIds } = await client
          .from('alertas_stock')
          .select(`
            id,
            inventario:inventario_id (
              menu:menu_id (
                restaurante_id
              )
            )
          `)
          .eq('leida', false);

        const alertasIdsFiltrados = alertasIds
          ?.filter((alerta: any) => 
            restaurantIds.includes(alerta.inventario?.menu?.restaurante_id)
          )
          ?.map((alerta: any) => alerta.id) || [];

        if (alertasIdsFiltrados.length === 0) {
          return res.json({
            ok: true,
            message: 'No hay alertas pendientes por marcar como leídas'
          });
        }

        query = client
          .from('alertas_stock')
          .update({
            leida: true,
            leida_at: new Date().toISOString()
          })
          .in('id', alertasIdsFiltrados);
      } else {
        return res.json({
          ok: true,
          message: 'No hay alertas pendientes por marcar como leídas'
        });
      }
    } else {
      // Usuarios normales marcan alertas de su restaurante
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          ok: false,
          message: 'El usuario no tiene un restaurante asignado'
        });
      }

      // Obtener IDs de alertas de su restaurante
      const { data: alertasIds } = await client
        .from('alertas_stock')
        .select(`
          id,
          inventario:inventario_id (
            menu:menu_id (
              restaurante_id
            )
          )
        `)
        .eq('leida', false);

      const alertasIdsFiltrados = alertasIds
        ?.filter((alerta: any) => 
          alerta.inventario?.menu?.restaurante_id === restaurante_id
        )
        ?.map((alerta: any) => alerta.id) || [];

      if (alertasIdsFiltrados.length === 0) {
        return res.json({
          ok: true,
          message: 'No hay alertas pendientes por marcar como leídas'
        });
      }

      query = client
        .from('alertas_stock')
        .update({
          leida: true,
          leida_at: new Date().toISOString()
        })
        .in('id', alertasIdsFiltrados);
    }

    const { error } = await query;

    if (error) {
      console.error('Error al marcar todas las alertas como leídas:', error);
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
    const client = supabaseAdmin || supabase;
    
    // Usar la función RPC que ya creamos
    const { data, error } = await client
      .rpc('stock_productos_bajo', {
        p_restaurante_id: null, // null para obtener todos los restaurantes
        p_limite_stock: 10      // default
      });

    if (error) {
      console.error('Error al obtener productos con stock bajo:', error);
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

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("inventario")
      .select('stock_actual')
      .eq('menu_id', menuId)
      .eq('activo', true)
      .single();

    if (error || !data) {
      return res.json({
        ok: true,
        disponible: true, // Si no hay inventario, asumir disponible
        stock_actual: 0
      });
    }

    const disponible = data.stock_actual >= Number(cantidad);

    res.json({
      ok: true,
      disponible,
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

    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    // Obtener IDs de restaurantes según rol
    let restaurantIds: string[] = [];
    
    if (id_rol === 1) {
      // Super Admin ve todos los restaurantes (no filtramos)
      restaurantIds = [];
    } else if (id_rol === 2) {
      // Admin ve sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);
      
      restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
    } else {
      // Usuarios normales ven su restaurante
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          ok: false,
          message: 'El usuario no tiene un restaurante asignado'
        });
      }
      restaurantIds = [restaurante_id];
    }

    // Construir queries según si filtramos por restaurante
    let inventarioQuery = client.from('inventario').select('*', { count: 'exact', head: true }).eq('activo', true);
    let alertasQuery = client.from('alertas_stock').select('*', { count: 'exact', head: true }).eq('leida', false);
    let inventarioDataQuery = client.from('inventario').select('stock_actual, stock_minimo, costo_unitario, menu:menu_id(restaurante_id)').eq('activo', true);

    if (restaurantIds.length > 0) {
      // Obtener IDs de menús de los restaurantes del usuario
      const { data: menuIds } = await client
        .from('menu')
        .select('id')
        .in('restaurante_id', restaurantIds);
      
      const menuIdList = menuIds?.map((m: any) => m.id) || [];
      
      if (menuIdList.length > 0) {
        // Obtener IDs de inventario de los menús
        const { data: inventarioIds } = await client
          .from('inventario')
          .select('id')
          .in('menu_id', menuIdList);
        
        const inventarioIdList = inventarioIds?.map((inv: any) => inv.id) || [];
        
        // Filtrar por menús de los restaurantes del usuario
        inventarioQuery = inventarioQuery.in('menu_id', menuIdList);
        alertasQuery = alertasQuery.in('inventario_id', inventarioIdList);
        inventarioDataQuery = inventarioDataQuery.in('menu.restaurante_id', restaurantIds);
      } else {
        // Si no hay menús, devolver ceros
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
    }

    // Obtener estadísticas básicas
    const [
      { count: totalProductos },
      { count: productosAgotados },
      { count: movimientosHoy },
      { count: alertasPendientes }
    ] = await Promise.all([
      inventarioQuery,
      inventarioQuery.eq('stock_actual', 0),
      client.from('movimientos_inventario').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
      alertasQuery
    ]);

    // Calcular valor total del inventario
    const { data: inventarioData } = await inventarioDataQuery;

    const valorTotalInventario = inventarioData?.reduce((total, item) => {
      return total + (item.stock_actual * item.costo_unitario);
    }, 0) || 0;

    // Calcular productos con stock bajo manualmente
    const productosStockBajo = inventarioData?.filter((item: any) => 
      item.stock_actual > 0 && item.stock_actual <= item.stock_minimo
    ).length || 0;

    res.json({
      ok: true,
      data: {
        total_productos: totalProductos || 0,
        productos_stock_bajo: productosStockBajo || 0,
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
