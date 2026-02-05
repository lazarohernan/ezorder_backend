import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/supabase";

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
  requiere_cierre_manual?: boolean;
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

    // Función para ordenar permisos por tipo de acción
    const getActionOrder = (nombre: string): number => {
      if (nombre.endsWith('.ver')) return 1;
      if (nombre.endsWith('.crear')) return 2;
      if (nombre.endsWith('.editar')) return 3;
      if (nombre.endsWith('.eliminar')) return 4;
      return 5; // Otras acciones (abrir, cerrar, cambiar_estado, etc.)
    };

    // Agrupar por tipo (sistema/restaurante) y luego por categoría
    const permisosPorTipo = permisos.reduce((acc: any, permiso: any) => {
      const tipo = permiso.tipo || 'restaurante';
      if (!acc[tipo]) {
        acc[tipo] = {};
      }
      if (!acc[tipo][permiso.categoria]) {
        acc[tipo][permiso.categoria] = [];
      }
      acc[tipo][permiso.categoria].push(permiso);
      return acc;
    }, {});

    // Ordenar cada categoría por tipo de acción
    Object.keys(permisosPorTipo).forEach(tipo => {
      Object.keys(permisosPorTipo[tipo]).forEach(categoria => {
        permisosPorTipo[tipo][categoria].sort((a: any, b: any) => {
          const orderA = getActionOrder(a.nombre);
          const orderB = getActionOrder(b.nombre);
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          // Si tienen el mismo orden, ordenar alfabéticamente
          return a.nombre.localeCompare(b.nombre);
        });
      });
    });

    res.json({
      ok: true,
      data: permisosPorTipo
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
    if (!supabaseAdmin) {
      return res.status(500).json({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }

    const { data: rolesPersonalizados, error } = await supabaseAdmin!
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener roles:', error);
      return res.status(500).json({
        ok: false,
        message: "Error al obtener roles personalizados"
      });
    }

    // Transformar los datos para que sea más fácil trabajar con ellos
    const rolesWithPermisos = rolesPersonalizados?.map(rol => ({
      ...rol,
      permisos: rol.rol_permisos?.map((rp: any) => rp.permisos) || []
    })) || [];

    res.json({
      ok: true,
      data: rolesWithPermisos
    });
  } catch (error) {
    console.error('Error en getRoles:', error);
    res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Obtener un rol específico
export const getRolById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: role, error } = await supabaseAdmin!
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
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          ok: false,
          message: "Rol no encontrado"
        });
      }
      console.error('Error al obtener rol:', error);
      return res.status(500).json({
        ok: false,
        message: "Error al obtener rol"
      });
    }

    // Procesar permisos
    const roleProcesado = {
      ...role,
      permisos: role.rol_permisos.map((rp: any) => rp.permisos)
    };

    res.json({
      ok: true,
      data: roleProcesado
    });
  } catch (error) {
    console.error('Error en getRolById:', error);
    res.status(500).json({
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
    const hasCustomRole = req.user_info?.rol_personalizado_id;
    
    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
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

    if (!supabaseAdmin) {
      return res.status(500).json({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }

    // Verificar que no exista un rol con el mismo nombre
    const { data: existingRole } = await supabaseAdmin!
      .from('roles_personalizados')
      .select('id')
      .eq('nombre', nombre)
      .single();

    if (existingRole) {
      return res.status(400).json({
        ok: false,
        message: "Ya existe un rol con este nombre"
      });
    }

    // Crear el rol
    const { data: newRole, error: roleError } = await supabaseAdmin!
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

      const { error: permisosError } = await supabaseAdmin!
        .from('rol_permisos')
        .insert(permisosData);

      if (permisosError) {
        console.error('Error al asignar permisos:', permisosError);
        // Eliminar el rol creado si falla la asignación de permisos
        await supabaseAdmin!
          .from('roles_personalizados')
          .delete()
          .eq('id', newRole.id);

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
    const hasCustomRole = req.user_info?.rol_personalizado_id;
    
    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para actualizar roles personalizados"
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }

    const { id } = req.params;
    const { nombre, descripcion, color, icono, permisos, activo, requiere_cierre_manual }: UpdateRoleDTO = req.body;

    // Verificar que el rol existe
    const { data: existingRole, error: findError } = await supabaseAdmin!
      .from('roles_personalizados')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingRole) {
      return res.status(404).json({
        ok: false,
        message: "Rol no encontrado"
      });
    }

    // Verificar nombre único si se está cambiando
    if (nombre && nombre !== existingRole.nombre) {
      const { data: duplicateName } = await supabaseAdmin!
        .from('roles_personalizados')
        .select('id')
        .eq('nombre', nombre)
        .neq('id', id)
        .single();

      if (duplicateName) {
        return res.status(400).json({
          ok: false,
          message: "Ya existe un rol con este nombre"
        });
      }
    }

    // Actualizar el rol
    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (color !== undefined) updateData.color = color;
    if (icono !== undefined) updateData.icono = icono;
    if (activo !== undefined) updateData.activo = activo;
    if (requiere_cierre_manual !== undefined) updateData.requiere_cierre_manual = requiere_cierre_manual;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedRole, error: updateError } = await supabaseAdmin!
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

    // Actualizar permisos si se proporcionaron
    if (permisos !== undefined) {
      // Eliminar permisos existentes
      await supabaseAdmin!
        .from('rol_permisos')
        .delete()
        .eq('rol_id', id);

      // Agregar nuevos permisos
      if (permisos.length > 0) {
        const permisosData = permisos.map(permisoId => ({
          rol_id: parseInt(id),
          permiso_id: permisoId
        }));

        const { error: permisosError } = await supabaseAdmin!
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

// Eliminar un rol completamente
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
    const hasCustomRole = req.user_info?.rol_personalizado_id;
    
    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para eliminar roles personalizados"
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }

    const { id } = req.params;

    // Verificar que no haya usuarios usando este rol
    const { data: usersWithRole, error: checkError } = await supabaseAdmin!
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
        message: "No se puede eliminar el rol porque hay usuarios asignados a él. Primero debe reasignar estos usuarios a otro rol."
      });
    }

    // Eliminar permisos asociados al rol primero
    const { error: permisosError } = await supabaseAdmin!
      .from('rol_permisos')
      .delete()
      .eq('rol_id', id);

    if (permisosError) {
      console.error('Error al eliminar permisos asociados:', permisosError);
      return res.status(500).json({
        ok: false,
        message: "Error al eliminar permisos asociados al rol"
      });
    }

    // Eliminar el rol completamente
    const { error: deleteError } = await supabaseAdmin!
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

    res.json({
      ok: true,
      message: "Rol eliminado exitosamente"
    });
  } catch (error) {
    console.error('Error en deleteRol:', error);
    res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Obtener permisos del usuario actual
export const getUserPermissions = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado"
      });
    }

    // Super Admin y Admin tienen acceso a todo, no necesitan permisos específicos
    if (req.user_info.rol_id === 1 || req.user_info.rol_id === 2) {
      return res.json({
        ok: true,
        data: []
      });
    }

    // Si no tiene rol personalizado, no tiene permisos
    if (!req.user_info.rol_personalizado_id) {
      return res.json({
        ok: true,
        data: []
      });
    }

    const supabase = getSupabaseAdmin(res);
    if (!supabase) {
      return res.status(500).json({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }

    // Obtener permisos del rol personalizado
    const { data: rolPermisos, error } = await supabase
      .from('rol_permisos')
      .select('permisos!inner(nombre)')
      .eq('rol_id', req.user_info.rol_personalizado_id);

    if (error) {
      console.error('Error al obtener permisos del usuario:', error);
      return res.status(500).json({
        ok: false,
        message: "Error al obtener permisos"
      });
    }

    const permissions = rolPermisos?.map((rp: any) => rp.permisos.nombre) || [];

    res.json({
      ok: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error en getUserPermissions:', error);
    res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};
