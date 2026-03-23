import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase, supabaseAdmin } from '../supabase/supabase';

type GastoRecord = {
  usuario_id?: string | null;
  usuario_nombre?: string | null;
  metodo_pago_id?: number | null;
  metodo_pago?: string | null;
  inventario_id?: string | null;
};

const enrichGastosWithRelatedData = async <T extends GastoRecord>(
  gastos: T[]
): Promise<(T & { usuario_nombre: string | null; metodo_pago: string | null; inventario_nombre: string | null })[]> => {
  if (!gastos.length) {
    return gastos.map((gasto) => ({
      ...gasto,
      usuario_nombre: gasto.usuario_nombre ?? null,
      metodo_pago: gasto.metodo_pago ?? null,
      inventario_nombre: null
    }));
  }

  const client = supabaseAdmin || supabase;

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

  // Obtener nombres de inventario
  const inventarioIds = Array.from(
    new Set(
      gastos
        .map((gasto) => gasto.inventario_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let inventarioMap = new Map<string, string | null>();

  if (inventarioIds.length) {
    const { data: inventarioData, error: inventarioError } = await client
      .from('inventario')
      .select('id, nombre')
      .in('id', inventarioIds);

    if (inventarioError) {
      console.error('Error fetching inventario info for gastos:', inventarioError);
    } else {
      inventarioMap = new Map<string, string | null>(
        (inventarioData || []).map((inv: { id: string; nombre: string }) => [
          inv.id,
          inv.nombre
        ])
      );
    }
  }

  // Métodos de pago como constantes (no requiere consulta a BD)
  const METODOS_PAGO: Record<number, string> = {
    1: 'Efectivo',
    2: 'Tarjeta/POS',
    3: 'Transferencia',
  };
  const metodosMap = new Map<number, string | null>(
    Object.entries(METODOS_PAGO).map(([id, metodo]) => [Number(id), metodo])
  );

  return gastos.map((gasto) => ({
    ...gasto,
    usuario_nombre: gasto.usuario_id ? usuariosMap.get(gasto.usuario_id) ?? null : null,
    metodo_pago: gasto.metodo_pago_id ? metodosMap.get(gasto.metodo_pago_id) ?? null : null,
    inventario_nombre: gasto.inventario_id ? inventarioMap.get(gasto.inventario_id) ?? null : null
  }));
};

export const gastosController = {
  // Obtener todos los gastos de un restaurante
  async getGastos(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };
      const { page = 1, limit = 10, categoria, fecha_inicio, fecha_fin } = request.query as { page?: number; limit?: number; categoria?: string; fecha_inicio?: string; fecha_fin?: string };

      const client = supabaseAdmin || supabase;
      let query = client
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
        return reply.code(400).send({ error: error.message });
      }

      // Obtener conteo total
      let countQuery = client
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

      reply.send({
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
      throw error;
    }
  },

  // Obtener un gasto específico
  async getGastoById(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = request.params as { id: string };
      const client = supabaseAdmin || supabase;

      const { data, error } = await client
        .from('gastos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      // Verificar permisos según rol
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede ver cualquier gasto
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante del gasto
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(data.restaurante_id)) {
          return reply.code(403).send({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      } else {
        // Usuarios normales solo pueden ver gastos de su restaurante
        if (request.user_info.restaurante_id !== data.restaurante_id) {
          return reply.code(403).send({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      }

      const [dataWithRelations] = await enrichGastosWithRelatedData(data ? [data] : []);

      reply.send({ data: dataWithRelations || null });
    } catch (error) {
      console.error('Error getting gasto by id:', error);
      throw error;
    }
  },

  // Crear un nuevo gasto
  async createGasto(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({ 
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
        proveedor,
        tipo_gasto,
        cantidad,
        unidad_medida,
        inventario_id
      } = request.body as { restaurante_id: string; usuario_id: string; fecha_gasto?: string; categoria: string; descripcion: string; monto: number; metodo_pago_id?: number; proveedor?: string; tipo_gasto?: string; cantidad?: number; unidad_medida?: string; inventario_id?: string };

      // Validaciones básicas
      if (!restaurante_id || !usuario_id || !categoria || !descripcion || !monto) {
        return reply.code(400).send({
          error: 'Faltan campos obligatorios: restaurante_id, usuario_id, categoria, descripcion, monto'
        });
      }

      if (Number(monto) <= 0) {
        return reply.code(400).send({ error: 'El monto debe ser mayor a 0' });
      }

      // Si se vincula a inventario, la cantidad es obligatoria y > 0
      if (inventario_id && (!cantidad || Number(cantidad) <= 0)) {
        return reply.code(400).send({
          error: 'Cuando se vincula a un producto de inventario, la cantidad debe ser mayor a 0'
        });
      }

      const client = supabaseAdmin || supabase;

      // Verificar permisos según rol
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede crear gastos en cualquier restaurante
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante
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
        // Usuarios normales solo pueden crear gastos en su restaurante
        if (request.user_info.restaurante_id !== restaurante_id) {
          return reply.code(403).send({
            error: 'No puedes crear gastos para este restaurante'
          });
        }
      }

      const { data, error } = await client
        .from('gastos')
        .insert({
          restaurante_id,
          usuario_id,
          fecha_gasto: fecha_gasto || new Date().toISOString(),
          categoria,
          descripcion,
          monto: Number(monto),
          metodo_pago_id: metodo_pago_id || null,
          proveedor: proveedor || null,
          tipo_gasto: tipo_gasto || 'variable',
          cantidad: cantidad != null ? Number(cantidad) : null,
          unidad_medida: unidad_medida || null,
          inventario_id: inventario_id || null
        })
        .select('*')
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      // Crear movimiento automático de inventario si se vinculó a un producto
      if (data && inventario_id && cantidad && Number(cantidad) > 0) {
        try {
          const { data: invItem, error: invError } = await client
            .from('inventario')
            .select('id, nombre, restaurante_id')
            .eq('id', inventario_id)
            .single();

          if (invItem && !invError && invItem.restaurante_id === restaurante_id) {
            const cantidadNum = Number(cantidad);

            // Crear movimiento de entrada
            await client
              .from('movimientos_inventario')
              .insert({
                inventario_id,
                tipo_movimiento: 'entrada',
                cantidad: cantidadNum,
                motivo: `Compra de proveedor - Gasto${proveedor ? ` (${proveedor})` : ''}`,
                referencia: data.id,
                usuario_id: request.user_info!.id,
              });

            // Desglose automático si el producto tiene reglas
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
                    cantidad: cantidadNum * regla.cantidad,
                    motivo: `Desglose automático de ${invItem.nombre} (×${cantidadNum}) - Gasto`,
                    referencia: data.id,
                    usuario_id: request.user_info!.id,
                  });
              }
            }
          }
        } catch (invMovError) {
          console.error('Error creating automatic inventory movement from gasto:', invMovError);
        }
      }

      const [dataWithRelations] = await enrichGastosWithRelatedData(data ? [data] : []);

      return reply.code(201).send({ data: dataWithRelations || null });
    } catch (error) {
      console.error('Error creating gasto:', error);
      throw error;
    }
  },

  // Actualizar un gasto
  async updateGasto(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = request.params as { id: string };
      const {
        fecha_gasto,
        categoria,
        descripcion,
        monto,
        metodo_pago_id,
        proveedor,
        tipo_gasto,
        cantidad,
        unidad_medida,
        inventario_id
      } = request.body as { fecha_gasto?: string; categoria?: string; descripcion?: string; monto?: number; metodo_pago_id?: number; proveedor?: string; tipo_gasto?: string; cantidad?: number; unidad_medida?: string; inventario_id?: string };

      if (monto !== undefined && Number(monto) <= 0) {
        return reply.code(400).send({ error: 'El monto debe ser mayor a 0' });
      }

      const client = supabaseAdmin || supabase;

      // Primero obtener el gasto para verificar permisos
      const { data: gastoExistente, error: errorBuscar } = await client
        .from('gastos')
        .select('id, restaurante_id, inventario_id')
        .eq('id', id)
        .single();

      if (errorBuscar || !gastoExistente) {
        return reply.code(404).send({ 
          error: 'Gasto no encontrado' 
        });
      }

      // Verificar permisos según rol
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede actualizar cualquier gasto
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante del gasto
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(gastoExistente.restaurante_id)) {
          return reply.code(403).send({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      } else {
        // Usuarios normales solo pueden actualizar gastos de su restaurante
        if (request.user_info.restaurante_id !== gastoExistente.restaurante_id) {
          return reply.code(403).send({ 
            error: 'No tienes acceso a este gasto' 
          });
        }
      }

      // No permitir cambiar inventario_id si ya tiene uno vinculado (evita movimientos huérfanos)
      if (inventario_id !== undefined && gastoExistente.inventario_id && inventario_id !== gastoExistente.inventario_id) {
        return reply.code(400).send({
          error: 'No se puede cambiar el producto de inventario vinculado. Elimine el gasto y cree uno nuevo.'
        });
      }

      const updateData: any = {};
      if (fecha_gasto !== undefined) updateData.fecha_gasto = fecha_gasto;
      if (categoria !== undefined) updateData.categoria = categoria;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (monto !== undefined) updateData.monto = Number(monto);
      if (metodo_pago_id !== undefined) updateData.metodo_pago_id = metodo_pago_id;
      if (proveedor !== undefined) updateData.proveedor = proveedor;
      if (tipo_gasto !== undefined) updateData.tipo_gasto = tipo_gasto;
      if (cantidad !== undefined) updateData.cantidad = cantidad != null ? Number(cantidad) : null;
      if (unidad_medida !== undefined) updateData.unidad_medida = unidad_medida || null;
      if (inventario_id !== undefined) updateData.inventario_id = inventario_id || null;

      const { data, error } = await client
        .from('gastos')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      const [dataWithRelations] = await enrichGastosWithRelatedData(data ? [data] : []);

      reply.send({ data: dataWithRelations || null });
    } catch (error) {
      console.error('Error updating gasto:', error);
      throw error;
    }
  },

  // Eliminar un gasto
  async deleteGasto(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user_info) {
        return reply.code(403).send({ 
          error: 'No se encontró información del usuario autenticado' 
        });
      }

      const { id } = request.params as { id: string };

      const client = supabaseAdmin || supabase;

      // Primero obtener el gasto para verificar permisos y datos de inventario
      const { data: gastoExistente, error: errorBuscar } = await client
        .from('gastos')
        .select('id, restaurante_id, inventario_id, cantidad')
        .eq('id', id)
        .single();

      if (errorBuscar || !gastoExistente) {
        return reply.code(404).send({
          error: 'Gasto no encontrado'
        });
      }

      // Verificar permisos según rol
      const id_rol = request.user_info?.rol_id ?? 3;
      if (id_rol === 1) {
        // Super Admin puede eliminar cualquier gasto
      } else if (id_rol === 2) {
        // Admin debe tener acceso al restaurante del gasto
        const { data: userRestaurants } = await client
          .from('usuarios_restaurantes')
          .select('restaurante_id')
          .eq('usuario_id', request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

        if (!restaurantIds.includes(gastoExistente.restaurante_id)) {
          return reply.code(403).send({
            error: 'No tienes acceso a este gasto'
          });
        }
      } else {
        // Usuarios normales solo pueden eliminar gastos de su restaurante
        if (request.user_info.restaurante_id !== gastoExistente.restaurante_id) {
          return reply.code(403).send({
            error: 'No tienes acceso a este gasto'
          });
        }
      }

      // Revertir movimiento de inventario si el gasto estaba vinculado
      if (gastoExistente.inventario_id && gastoExistente.cantidad && Number(gastoExistente.cantidad) > 0) {
        try {
          const cantidadNum = Number(gastoExistente.cantidad);

          // Crear movimiento de salida para revertir la entrada original
          await client
            .from('movimientos_inventario')
            .insert({
              inventario_id: gastoExistente.inventario_id,
              tipo_movimiento: 'salida',
              cantidad: cantidadNum,
              motivo: `Reversión por eliminación de gasto`,
              referencia: gastoExistente.id,
              usuario_id: request.user_info!.id,
            });

          // Revertir desglose automático si existía
          const { data: reglas } = await client
            .from('inventario_desglose')
            .select('componente_id, cantidad')
            .eq('producto_id', gastoExistente.inventario_id);

          if (reglas && reglas.length > 0) {
            for (const regla of reglas) {
              await client
                .from('movimientos_inventario')
                .insert({
                  inventario_id: regla.componente_id,
                  tipo_movimiento: 'salida',
                  cantidad: cantidadNum * regla.cantidad,
                  motivo: `Reversión desglose por eliminación de gasto`,
                  referencia: gastoExistente.id,
                  usuario_id: request.user_info!.id,
                });
            }
          }
        } catch (invError) {
          console.error('Error reverting inventory movement on gasto delete:', invError);
        }
      }

      const { error } = await client
        .from('gastos')
        .delete()
        .eq('id', id);

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      reply.send({ message: 'Gasto eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting gasto:', error);
      throw error;
    }
  },

  // Obtener resumen de gastos por categoría
  async getResumenPorCategoria(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };
      const { fecha_inicio, fecha_fin } = request.query as { fecha_inicio?: string; fecha_fin?: string };

      const client = supabaseAdmin || supabase;
      let query = client
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
        return reply.code(400).send({ error: error.message });
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

      reply.send({ data: resumenArray });
    } catch (error) {
      console.error('Error getting resumen por categoria:', error);
      throw error;
    }
  },

  // Obtener total de gastos
  async getTotalGastos(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { restaurante_id } = request.params as { restaurante_id: string };
      const { fecha_inicio, fecha_fin } = request.query as { fecha_inicio?: string; fecha_fin?: string };

      const client = supabaseAdmin || supabase;
      let query = client
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
        return reply.code(400).send({ error: error.message });
      }

      const total = (data || []).reduce((sum, gasto) => sum + Number(gasto.monto), 0);

      reply.send({ 
        data: {
          total_gastos: total,
          cantidad_gastos: data?.length || 0
        }
      });
    } catch (error) {
      console.error('Error getting total gastos:', error);
      throw error;
    }
  }
};


