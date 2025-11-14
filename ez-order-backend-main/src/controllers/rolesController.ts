import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/supabase";
import { getClientWithRLS } from "../utils/supabaseHelpers";

// Helper function para verificar supabaseAdmin
const ensureSupabaseAdmin = (res: Response) => {
  if (!supabaseAdmin) {
    res.status(500).json({
      ok: false,
      message: "Error de configuración del servidor"
    });
    return false;
  }
  return true;
};

// Helper para obtener supabaseAdmin garantizado
const getSupabaseAdmin = (res: Response) => {
  if (!ensureSupabaseAdmin(res)) {
    return null;
  }
  return supabaseAdmin;
};

// Interfaces
interface CreateRoleDTO {
  nombre: string;
  descripcion?: string;
  color?: string;
  icono?: string;
  permisos: number[]; // Array de IDs de permisos
}

interface UpdateRoleDTO extends Partial<CreateRoleDTO> {
  activo?: boolean;
}

// Obtener todos los permisos disponibles
export const getPermisos = async (req: Request, res: Response) => {
  try {
    if (!ensureSupabaseAdmin(res)) return;

    const { data: permisos, error } = await supabaseAdmin!
      .from('permisos')
      .select('*')
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener permisos:', error);
      return res.status(500).json({
        ok: false,
        message: "Error al obtener permisos"
      });
    }

    // Agrupar por categoría
    const permisosPorCategoria = permisos.reduce((acc: any, permiso: any) => {
      if (!acc[permiso.categoria]) {
        acc[permiso.categoria] = [];
      }
      acc[permiso.categoria].push(permiso);
      return acc;
    }, {});

    res.json({
      ok: true,
      data: permisosPorCategoria
    });
  } catch (error) {
    console.error('Error en getPermisos:', error);
    res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Obtener todos los roles personalizados
export const getRoles = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: "No se encontró información del usuario autenticado"
      });
    }

    // Usar arquitectura híbrida: supabaseAdmin + validación de backend
    if (!req.user_info?.rol_id || ![1, 2].includes(req.user_info.rol_id)) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para ver roles personalizados"
      });
    }

    // Usar supabaseAdmin con filtrado por admin (arquitectura híbrida)
    const client = supabaseAdmin;
    
    if (!client) {
      return res.status(500).json({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }
    
    // Super admins (rol_id = 1) pueden ver todos los roles
    let query = client
      .from('roles_personalizados')
      .select(`
        *,
        rol_permisos (
          permisos (
            id,
            nombre,
            descripcion,
            categoria
          )
        )
      `);
    
    // Admins de restaurante (rol_id = 2) solo ven:
    // - Roles creados por ellos (sus roles personalizados)
    if (req.user_info?.rol_id === 2 && req.user?.id) {
      query = query.eq("created_by", req.user.id);
    }
    
    const { data: rolesPersonalizados, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener roles:', error);
      return res.status(500).json({
        ok: false,
        message: "Error al obtener roles personalizados"
      });
    }

    // Transformar los datos para que sea más fácil trabajar con ellos
    const rolesWithPermisos = rolesPersonalizados?.map((rol: any) => ({
      ...rol,
      permisos: rol.rol_permisos?.map((rp: any) => rp.permisos) || []
    })) || [];

    return res.json({
      ok: true,
      data: rolesWithPermisos
    });
  } catch (error) {
    console.error('Error en getRoles:', error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Obtener un rol específico
export const getRolById = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: "No se encontró información del usuario autenticado"
      });
    }

    const { id } = req.params;

    // Usar RLS para obtener rol (RLS verifica acceso automáticamente)
    const client = await getClientWithRLS(req);
    
    const { data: role, error } = await client
      .from('roles_personalizados')
      .select(`
        *,
        rol_permisos (
          permisos (
            id,
            nombre,
            descripcion,
            categoria
          )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener rol:', error);
      return res.status(500).json({
        ok: false,
        message: "Error al obtener rol"
      });
    }

    // Si no se encuentra el rol, RLS bloqueó el acceso
    if (!role) {
      return res.status(403).json({
        ok: false,
        message: "No tienes acceso a este rol"
      });
    }

    // Procesar permisos
    const roleProcesado = {
      ...role,
      permisos: role.rol_permisos?.map((rp: any) => rp.permisos) || []
    };

    return res.json({
      ok: true,
      data: roleProcesado
    });
  } catch (error) {
    console.error('Error en getRolById:', error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Crear un nuevo rol personalizado
export const createRol = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: "No se encontró información del usuario autenticado"
      });
    }

    // Solo Super Admin y Admin pueden crear roles personalizados
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para crear roles personalizados"
      });
    }

    const { nombre, descripcion, color, icono, permisos }: CreateRoleDTO = req.body;

    // Validaciones
    if (!nombre || !permisos || !Array.isArray(permisos)) {
      return res.status(400).json({
        ok: false,
        message: "Nombre y permisos son requeridos"
      });
    }

    // Usar RLS para crear rol (RLS verifica permisos automáticamente)
    const client = await getClientWithRLS(req);
    
    // Verificar que no exista un rol con el mismo nombre
    const { data: existingRole } = await client
      .from('roles_personalizados')
      .select('id')
      .eq('nombre', nombre)
      .maybeSingle();

    if (existingRole) {
      return res.status(400).json({
        ok: false,
        message: "Ya existe un rol con este nombre"
      });
    }

    // Crear el rol (RLS verifica que el usuario tenga permisos)
    const { data: newRole, error: roleError } = await client
      .from('roles_personalizados')
      .insert([{
        nombre,
        descripcion,
        color: color || '#3B82F6',
        icono: icono || 'user',
        created_by: req.user_info.id
      }])
      .select()
      .single();

    if (roleError) {
      console.error('Error al crear rol:', roleError);
      return res.status(500).json({
        ok: false,
        message: "Error al crear rol"
      });
    }

    // Asignar permisos al rol
    if (permisos.length > 0) {
      const permisosData = permisos.map(permisoId => ({
        rol_id: newRole.id,
        permiso_id: permisoId
      }));

      if (!supabaseAdmin) {
        return res.status(500).json({
          ok: false,
          message: "Error de configuración del servidor"
        });
      }

      const { error: permisosError } = await supabaseAdmin
        .from('rol_permisos')
        .insert(permisosData);

      if (permisosError) {
        console.error('Error al asignar permisos:', permisosError);
        // Eliminar el rol creado si falla la asignación de permisos (requiere admin para evitar problemas de RLS)
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('roles_personalizados')
            .delete()
            .eq('id', newRole.id);
        }

        return res.status(500).json({
          ok: false,
          message: "Error al asignar permisos al rol"
        });
      }
    }

    res.status(201).json({
      ok: true,
      data: newRole,
      message: "Rol creado exitosamente"
    });
  } catch (error) {
    console.error('Error en createRol:', error);
    res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Actualizar un rol
export const updateRol = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: "No se encontró información del usuario autenticado"
      });
    }

    // Solo Super Admin y Admin pueden actualizar roles personalizados
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para actualizar roles personalizados"
      });
    }

    const { id } = req.params;
    const { nombre, descripcion, color, icono, permisos, activo }: UpdateRoleDTO = req.body;

    // Usar RLS para obtener y actualizar rol (RLS verifica acceso automáticamente)
    const client = await getClientWithRLS(req);
    
    // Verificar que el rol existe y que tenemos acceso
    const { data: existingRole, error: findError } = await client
      .from('roles_personalizados')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError || !existingRole) {
      return res.status(403).json({
        ok: false,
        message: "No tienes acceso a este rol o no existe"
      });
    }

    // Verificar nombre único si se está cambiando
    if (nombre && nombre !== existingRole.nombre) {
      const { data: duplicateName } = await client
        .from('roles_personalizados')
        .select('id')
        .eq('nombre', nombre)
        .neq('id', id)
        .maybeSingle();

      if (duplicateName) {
        return res.status(400).json({
          ok: false,
          message: "Ya existe un rol con este nombre"
        });
      }
    }

    // Actualizar el rol (RLS verifica acceso automáticamente)
    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (color !== undefined) updateData.color = color;
    if (icono !== undefined) updateData.icono = icono;
    if (activo !== undefined) updateData.activo = activo;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedRole, error: updateError } = await client
      .from('roles_personalizados')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar rol:', updateError);
      return res.status(500).json({
        ok: false,
        message: "Error al actualizar rol"
      });
    }

    // Actualizar permisos si se proporcionaron (requiere admin para rol_permisos)
    if (permisos !== undefined) {
      if (!supabaseAdmin) {
        return res.status(500).json({
          ok: false,
          message: "Error de configuración del servidor"
        });
      }

      // Eliminar permisos existentes
      const { error: deletePermisosError } = await supabaseAdmin
        .from('rol_permisos')
        .delete()
        .eq('rol_id', id);

      if (deletePermisosError) {
        console.error('Error al eliminar permisos:', deletePermisosError);
        return res.status(500).json({
          ok: false,
          message: "Error al actualizar permisos del rol"
        });
      }

      // Agregar nuevos permisos
      if (permisos.length > 0) {
        const permisosData = permisos.map(permisoId => ({
          rol_id: parseInt(id),
          permiso_id: permisoId
        }));

        const { error: permisosError } = await supabaseAdmin
          .from('rol_permisos')
          .insert(permisosData);

        if (permisosError) {
          console.error('Error al actualizar permisos:', permisosError);
          return res.status(500).json({
            ok: false,
            message: "Error al actualizar permisos del rol"
          });
        }
      }
    }

    res.json({
      ok: true,
      data: updatedRole,
      message: "Rol actualizado exitosamente"
    });
  } catch (error) {
    console.error('Error en updateRol:', error);
    res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Eliminar un rol
export const deleteRol = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        ok: false,
        message: "No se encontró información del usuario autenticado"
      });
    }

    // Solo Super Admin y Admin pueden eliminar roles personalizados
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para eliminar roles personalizados"
      });
    }

    const { id } = req.params;

    // Usar supabaseAdmin con filtrado por admin (más confiable que RLS actual)
    const client = supabaseAdmin;
    
    if (!client) {
      return res.status(500).json({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }
    
    // Verificar que el rol existe y tenemos acceso
    let query = client
      .from('roles_personalizados')
      .select('id, created_by')
      .eq('id', id);
    
    // Admins de restaurante solo pueden eliminar sus propios roles
    if (req.user_info.rol_id === 2 && req.user?.id) {
      query = query.eq('created_by', req.user.id);
    }
    
    const { data: existingRole, error: findError } = await query.maybeSingle();

    if (findError || !existingRole) {
      return res.status(403).json({
        ok: false,
        message: "No tienes acceso a este rol o no existe"
      });
    }

    // Verificar que no haya usuarios usando este rol (requiere admin para ver todos los usuarios)
    if (!supabaseAdmin) {
      return res.status(500).json({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }

    const { data: usersWithRole, error: checkError } = await supabaseAdmin
      .from('usuarios_info')
      .select('id')
      .eq('rol_personalizado_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error al verificar usuarios con rol:', checkError);
      return res.status(500).json({
        ok: false,
        message: "Error al verificar dependencias"
      });
    }

    if (usersWithRole && usersWithRole.length > 0) {
      return res.status(400).json({
        ok: false,
        message: "No se puede eliminar el rol porque hay usuarios asignados a él"
      });
    }

    // Eliminar el rol físicamente (verificando acceso con el filtrado proper)
    const { error: deleteError } = await client
      .from('roles_personalizados')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error al eliminar rol:', deleteError);
      return res.status(500).json({
        ok: false,
        message: "Error al eliminar rol"
      });
    }

    return res.json({
      ok: true,
      message: "Rol eliminado exitosamente"
    });
  } catch (error) {
    console.error('Error en deleteRol:', error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};
