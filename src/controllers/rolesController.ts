import type { FastifyRequest, FastifyReply } from "fastify";
import { supabaseAdmin } from "../supabase/supabase";

// Helper function para verificar supabaseAdmin
const ensureSupabaseAdmin = (reply: FastifyReply) => {
  if (!supabaseAdmin) {
    reply.code(500).send({
      ok: false,
      message: "Error de configuración del servidor"
    });
    return false;
  }
  return true;
};

// Helper para obtener supabaseAdmin garantizado
const getSupabaseAdmin = (reply: FastifyReply) => {
  if (!ensureSupabaseAdmin(reply)) {
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
export const getPermisos = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!ensureSupabaseAdmin(reply)) return;

    const { data: permisos, error } = await supabaseAdmin!
      .from('permisos')
      .select('*')
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener permisos:', error);
      return reply.code(500).send({
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

    return reply.send({
      ok: true,
      data: permisosPorTipo
    });
  } catch (error) {
    console.error('Error en getPermisos:', error);
    return reply.code(500).send({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Obtener todos los roles personalizados
export const getRoles = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!supabaseAdmin) {
      return reply.code(500).send({
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
      return reply.code(500).send({
        ok: false,
        message: "Error al obtener roles personalizados"
      });
    }

    // Transformar los datos para que sea más fácil trabajar con ellos
    const rolesWithPermisos = rolesPersonalizados?.map(rol => ({
      ...rol,
      permisos: rol.rol_permisos?.map((rp: any) => rp.permisos) || []
    })) || [];

    return reply.send({
      ok: true,
      data: rolesWithPermisos
    });
  } catch (error) {
    console.error('Error en getRoles:', error);
    return reply.code(500).send({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Obtener un rol específico
export const getRolById = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = (request.params as any);

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
        return reply.code(404).send({
          ok: false,
          message: "Rol no encontrado"
        });
      }
      console.error('Error al obtener rol:', error);
      return reply.code(500).send({
        ok: false,
        message: "Error al obtener rol"
      });
    }

    // Procesar permisos
    const roleProcesado = {
      ...role,
      permisos: role.rol_permisos.map((rp: any) => rp.permisos)
    };

    return reply.send({
      ok: true,
      data: roleProcesado
    });
  } catch (error) {
    console.error('Error en getRolById:', error);
    return reply.code(500).send({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Crear un nuevo rol personalizado
export const createRol = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        ok: false,
        message: "No se encontró información del usuario autenticado"
      });
    }

    // Solo Super Admin y Admin pueden crear roles personalizados
    const id_rol = request.user_info?.rol_id ?? 3;
    const hasCustomRole = request.user_info?.rol_personalizado_id;

    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return reply.code(403).send({
        ok: false,
        message: "No tienes permisos para crear roles personalizados"
      });
    }

    const { nombre, descripcion, color, icono, permisos }: CreateRoleDTO = (request.body as any);

    // Validaciones
    if (!nombre || !permisos || !Array.isArray(permisos)) {
      return reply.code(400).send({
        ok: false,
        message: "Nombre y permisos son requeridos"
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
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
      return reply.code(400).send({
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
        created_by: request.user_info.id
      }])
      .select()
      .single();

    if (roleError) {
      console.error('Error al crear rol:', roleError);
      return reply.code(500).send({
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

        return reply.code(500).send({
          ok: false,
          message: "Error al asignar permisos al rol"
        });
      }
    }

    return reply.code(201).send({
      ok: true,
      data: newRole,
      message: "Rol creado exitosamente"
    });
  } catch (error) {
    console.error('Error en createRol:', error);
    return reply.code(500).send({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Actualizar un rol
export const updateRol = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        ok: false,
        message: "No se encontró información del usuario autenticado"
      });
    }

    // Solo Super Admin y Admin pueden actualizar roles personalizados
    const id_rol = request.user_info?.rol_id ?? 3;
    const hasCustomRole = request.user_info?.rol_personalizado_id;

    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return reply.code(403).send({
        ok: false,
        message: "No tienes permisos para actualizar roles personalizados"
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }

    const { id } = (request.params as any);
    const { nombre, descripcion, color, icono, permisos, activo, requiere_cierre_manual }: UpdateRoleDTO = (request.body as any);

    // Verificar que el rol existe
    const { data: existingRole, error: findError } = await supabaseAdmin!
      .from('roles_personalizados')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingRole) {
      return reply.code(404).send({
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
        return reply.code(400).send({
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
      return reply.code(500).send({
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
          return reply.code(500).send({
            ok: false,
            message: "Error al actualizar permisos del rol"
          });
        }
      }
    }

    return reply.send({
      ok: true,
      data: updatedRole,
      message: "Rol actualizado exitosamente"
    });
  } catch (error) {
    console.error('Error en updateRol:', error);
    return reply.code(500).send({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Eliminar un rol completamente
export const deleteRol = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        ok: false,
        message: "No se encontró información del usuario autenticado"
      });
    }

    // Solo Super Admin y Admin pueden eliminar roles personalizados
    const id_rol = request.user_info?.rol_id ?? 3;
    const hasCustomRole = request.user_info?.rol_personalizado_id;

    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return reply.code(403).send({
        ok: false,
        message: "No tienes permisos para eliminar roles personalizados"
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }

    const { id } = (request.params as any);

    // Verificar que no haya usuarios usando este rol
    const { data: usersWithRole, error: checkError } = await supabaseAdmin!
      .from('usuarios_info')
      .select('id')
      .eq('rol_personalizado_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error al verificar usuarios con rol:', checkError);
      return reply.code(500).send({
        ok: false,
        message: "Error al verificar dependencias"
      });
    }

    if (usersWithRole && usersWithRole.length > 0) {
      return reply.code(400).send({
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
      return reply.code(500).send({
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
      return reply.code(500).send({
        ok: false,
        message: "Error al eliminar rol"
      });
    }

    return reply.send({
      ok: true,
      message: "Rol eliminado exitosamente"
    });
  } catch (error) {
    console.error('Error en deleteRol:', error);
    return reply.code(500).send({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

// Obtener permisos del usuario actual
export const getUserPermissions = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(401).send({
        ok: false,
        message: "Usuario no autenticado"
      });
    }

    // Super Admin y Admin tienen acceso a todo, no necesitan permisos específicos
    if (request.user_info.rol_id === 1 || request.user_info.rol_id === 2) {
      return reply.send({
        ok: true,
        data: []
      });
    }

    // Si no tiene rol personalizado, no tiene permisos
    if (!request.user_info.rol_personalizado_id) {
      return reply.send({
        ok: true,
        data: []
      });
    }

    const supabase = getSupabaseAdmin(reply);
    if (!supabase) {
      return reply.code(500).send({
        ok: false,
        message: "Error de configuración del servidor"
      });
    }

    // Obtener permisos del rol personalizado
    const { data: rolPermisos, error } = await supabase
      .from('rol_permisos')
      .select('permisos!inner(nombre)')
      .eq('rol_id', request.user_info.rol_personalizado_id);

    if (error) {
      console.error('Error al obtener permisos del usuario:', error);
      return reply.code(500).send({
        ok: false,
        message: "Error al obtener permisos"
      });
    }

    const permissions = rolPermisos?.map((rp: any) => rp.permisos.nombre) || [];

    return reply.send({
      ok: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error en getUserPermissions:', error);
    return reply.code(500).send({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};
