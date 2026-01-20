import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../supabase/supabase';

type GastoRecord = {
  usuario_id?: string | null;
  usuario_nombre?: string | null;
  metodo_pago_id?: number | null;
  metodo_pago?: string | null;
};

const enrichGastosWithRelatedData = async <T extends GastoRecord>(
  gastos: T[]
): Promise<(T & { usuario_nombre: string | null; metodo_pago: string | null })[]> => {
  if (!gastos.length) {
    return gastos.map((gasto) => ({ 
      ...gasto, 
      usuario_nombre: gasto.usuario_nombre ?? null,
      metodo_pago: gasto.metodo_pago ?? null 
    }));
  }

  // Obtener nombres de usuarios
  const usuarioIds = Array.from(
    new Set(
      gastos
        .map((gasto) => gasto.usuario_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let usuariosMap = new Map<string, string | null>();

  if (usuarioIds.length) {
    const client = supabaseAdmin || supabase;
    const { data: usuariosData, error: usuariosError } = await client
      .from('usuarios_info')
      .select('id, nombre_usuario')
      .in('id', usuarioIds);

    if (usuariosError) {
      console.error('Error fetching usuario info for gastos:', usuariosError);
    } else {
      usuariosMap = new Map<string, string | null>(
        (usuariosData || []).map((usuario: { id: string; nombre_usuario: string | null }) => [
          usuario.id,
          usuario.nombre_usuario ?? null
        ])
      );
    }
  }

  // Obtener métodos de pago
  const metodoPagoIds = Array.from(
    new Set(
      gastos
        .map((gasto) => gasto.metodo_pago_id)
        .filter((id): id is number => Boolean(id))
    )
  );

  let metodosMap = new Map<number, string | null>();

  if (metodoPagoIds.length) {
    const { data: metodos, error } = await supabase
      .from('metodos_de_pago')
      .select('id, metodo')
      .in('id', metodoPagoIds);

    if (error) {
      console.error('Error fetching metodo pago info for gastos:', error);
    } else {
      metodosMap = new Map<number, string | null>(
        (metodos || []).map((metodo: { id: number; metodo: string | null }) => [
          metodo.id,
          metodo.metodo ?? null
        ])
      );
    }
  }

  return gastos.map((gasto) => ({
    ...gasto,
    usuario_nombre: gasto.usuario_id ? usuariosMap.get(gasto.usuario_id) ?? null : null,
    metodo_pago: gasto.metodo_pago_id ? metodosMap.get(gasto.metodo_pago_id) ?? null : null
  }));
};

export const gastosController = {
  // Obtener todos los gastos de un restaurante
  async getGastos(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const { page = 1, limit = 10, categoria, fecha_inicio, fecha_fin } = req.query;

      let query = supabase
        .from('gastos')
        .select('*')
        .eq('restaurante_id', restaurante_id)
        .order('fecha_gasto', { ascending: false });

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      if (fecha_inicio) {
        query = query.gte('fecha_gasto', fecha_inicio);
      }

      if (fecha_fin) {
        query = query.lte('fecha_gasto', fecha_fin);
      }

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error } = await query.range(from, to);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Obtener conteo total
      let countQuery = supabase
        .from('gastos')
        .select('*', { count: 'exact', head: true })
        .eq('restaurante_id', restaurante_id);

      if (categoria) {
        countQuery = countQuery.eq('categoria', categoria);
      }

      if (fecha_inicio) {
        countQuery = countQuery.gte('fecha_gasto', fecha_inicio);
      }

      if (fecha_fin) {
        countQuery = countQuery.lte('fecha_gasto', fecha_fin);
      }

      const { count } = await countQuery;

      const dataWithRelations = await enrichGastosWithRelatedData(data || []);

      res.json({
        data: dataWithRelations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting gastos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener un gasto específico
  async getGastoById(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = req.params;
      const client = supabaseAdmin || supabase;

      const { data, error } = await client
        .from('gastos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Verificar permisos según rol
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede ver cualquier gasto
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante del gasto
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(data.restaurante_id)) {
          return res.status(403).json({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      } else {
        // Usuarios normales solo pueden ver gastos de su restaurante
        if (req.user_info.restaurante_id !== data.restaurante_id) {
          return res.status(403).json({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      }

      const [dataWithRelations] = await enrichGastosWithRelatedData(data ? [data] : []);

      res.json({ data: dataWithRelations || null });
    } catch (error) {
      console.error('Error getting gasto by id:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Crear un nuevo gasto
  async createGasto(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const {
        restaurante_id,
        usuario_id,
        fecha_gasto,
        categoria,
        descripcion,
        monto,
        metodo_pago_id,
        proveedor
      } = req.body;

      // Validaciones básicas
      if (!restaurante_id || !usuario_id || !categoria || !descripcion || !monto) {
        return res.status(400).json({ 
          error: 'Faltan campos obligatorios: restaurante_id, usuario_id, categoria, descripcion, monto' 
        });
      }

      if (Number(monto) <= 0) {
        return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
      }

      // Verificar permisos según rol
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede crear gastos en cualquier restaurante
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante
        const { data: userRestaurants } = await supabaseAdmin!
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
        // Usuarios normales solo pueden crear gastos en su restaurante
        if (req.user_info.restaurante_id !== restaurante_id) {
          return res.status(403).json({ 
            error: 'No puedes crear gastos para este restaurante' 
          });
        }
      }

      const { data, error } = await supabase
        .from('gastos')
        .insert({
          restaurante_id,
          usuario_id,
          fecha_gasto: fecha_gasto || new Date().toISOString(),
          categoria,
          descripcion,
          monto: Number(monto),
          metodo_pago_id: metodo_pago_id || null,
          proveedor: proveedor || null
        })
        .select('*')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const [dataWithRelations] = await enrichGastosWithRelatedData(data ? [data] : []);

      res.status(201).json({ data: dataWithRelations || null });
    } catch (error) {
      console.error('Error creating gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Actualizar un gasto
  async updateGasto(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = req.params;
      const {
        fecha_gasto,
        categoria,
        descripcion,
        monto,
        metodo_pago_id,
        proveedor
      } = req.body;

      if (monto !== undefined && Number(monto) <= 0) {
        return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
      }

      // Primero obtener el gasto para verificar permisos
      const { data: gastoExistente, error: errorBuscar } = await supabase
        .from('gastos')
        .select('id, restaurante_id')
        .eq('id', id)
        .single();

      if (errorBuscar || !gastoExistente) {
        return res.status(404).json({ 
          error: 'Gasto no encontrado' 
        });
      }

      // Verificar permisos según rol
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede actualizar cualquier gasto
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante del gasto
        const { data: userRestaurants } = await supabaseAdmin!
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(gastoExistente.restaurante_id)) {
          return res.status(403).json({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      } else {
        // Usuarios normales solo pueden actualizar gastos de su restaurante
        if (req.user_info.restaurante_id !== gastoExistente.restaurante_id) {
          return res.status(403).json({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      }

      const updateData: any = {};
      if (fecha_gasto !== undefined) updateData.fecha_gasto = fecha_gasto;
      if (categoria !== undefined) updateData.categoria = categoria;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (monto !== undefined) updateData.monto = Number(monto);
      if (metodo_pago_id !== undefined) updateData.metodo_pago_id = metodo_pago_id;
      if (proveedor !== undefined) updateData.proveedor = proveedor;

      const { data, error } = await supabase
        .from('gastos')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const [dataWithRelations] = await enrichGastosWithRelatedData(data ? [data] : []);

      res.json({ data: dataWithRelations || null });
    } catch (error) {
      console.error('Error updating gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Eliminar un gasto
  async deleteGasto(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = req.params;

      // Primero obtener el gasto para verificar permisos
      const { data: gastoExistente, error: errorBuscar } = await supabase
        .from('gastos')
        .select('id, restaurante_id')
        .eq('id', id)
        .single();

      if (errorBuscar || !gastoExistente) {
        return res.status(404).json({ 
          error: 'Gasto no encontrado' 
        });
      }

      // Verificar permisos según rol
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede eliminar cualquier gasto
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante del gasto
        const { data: userRestaurants } = await supabaseAdmin!
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(gastoExistente.restaurante_id)) {
          return res.status(403).json({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      } else {
        // Usuarios normales solo pueden eliminar gastos de su restaurante
        if (req.user_info.restaurante_id !== gastoExistente.restaurante_id) {
          return res.status(403).json({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      }

      const { error } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Gasto eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener resumen de gastos por categoría
  async getResumenPorCategoria(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const { fecha_inicio, fecha_fin } = req.query;

      let query = supabase
        .from('gastos')
        .select('categoria, monto')
        .eq('restaurante_id', restaurante_id);

      if (fecha_inicio) {
        query = query.gte('fecha_gasto', fecha_inicio);
      }

      if (fecha_fin) {
        query = query.lte('fecha_gasto', fecha_fin);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Agrupar por categoría y sumar montos
      const resumen = (data || []).reduce((acc: any, gasto: any) => {
        const categoria = gasto.categoria;
        if (!acc[categoria]) {
          acc[categoria] = 0;
        }
        acc[categoria] += Number(gasto.monto);
        return acc;
      }, {});

      // Convertir a array para facilitar el uso
      const resumenArray = Object.entries(resumen).map(([categoria, total]) => ({
        categoria,
        total
      }));

      res.json({ data: resumenArray });
    } catch (error) {
      console.error('Error getting resumen por categoria:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener total de gastos
  async getTotalGastos(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const { fecha_inicio, fecha_fin } = req.query;

      let query = supabase
        .from('gastos')
        .select('monto')
        .eq('restaurante_id', restaurante_id);

      if (fecha_inicio) {
        query = query.gte('fecha_gasto', fecha_inicio);
      }

      if (fecha_fin) {
        query = query.lte('fecha_gasto', fecha_fin);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const total = (data || []).reduce((sum, gasto) => sum + Number(gasto.monto), 0);

      res.json({ 
        data: {
          total_gastos: total,
          cantidad_gastos: data?.length || 0
        }
      });
    } catch (error) {
      console.error('Error getting total gastos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};


