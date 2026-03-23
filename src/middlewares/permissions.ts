import type { FastifyRequest, FastifyReply } from "fastify";
import { supabaseAdmin } from "../supabase/supabase";

export const requirePermissions = (requiredPermissions: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user_info) {
        return reply.code(401).send({
          ok: false,
          message: "Usuario no autenticado"
        });
      }

      // Super Admin siempre tiene acceso
      if (request.user_info.rol_id === 1 || request.user_info.es_super_admin) {
        return;
      }

      // Admin siempre tiene acceso
      if (request.user_info.rol_id === 2) {
        return;
      }

      const rolPersonalizadoId = request.user_info.rol_personalizado_id;
      if (!rolPersonalizadoId) {
        return reply.code(403).send({
          ok: false,
          message: "No tienes permisos para realizar esta acción. Contacta al administrador para que te asigne un rol."
        });
      }

      if (!supabaseAdmin) {
        return reply.code(500).send({
          ok: false,
          message: "Error de configuración del servidor"
        });
      }

      const { data: userPermissions, error } = await supabaseAdmin
        .from("rol_permisos")
        .select("permisos!inner(nombre)")
        .eq("rol_id", rolPersonalizadoId);

      if (error) {
        console.error("Error al obtener permisos:", error);
        return reply.code(500).send({
          ok: false,
          message: "Error al verificar permisos"
        });
      }

      const permissionNames = userPermissions.map((rp: any) => rp.permisos.nombre);

      const hasPermission = requiredPermissions.some((permission) => {
        if (permissionNames.includes("*")) return true;
        if (permissionNames.includes(permission)) return true;

        if (permission.includes("*")) {
          const prefix = permission.replace("*", "");
          return permissionNames.some((p: string) => p.startsWith(prefix));
        }

        const matchingWildcard = permissionNames.find((p: string) => p.endsWith(".*"));
        if (matchingWildcard) {
          const prefix = matchingWildcard.replace(".*", "");
          if (permission.startsWith(prefix + ".")) return true;
        }

        return false;
      });

      if (!hasPermission) {
        return reply.code(403).send({
          ok: false,
          message: "No tienes permisos para realizar esta acción"
        });
      }
    } catch (error) {
      console.error("Error en middleware de permisos:", error);
      throw error;
    }
  };
};

export const requireSuperAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(401).send({
        ok: false,
        message: "Usuario no autenticado"
      });
    }

    if (request.user_info.rol_id === 1 || request.user_info.rol_id === 2 || request.user_info.es_super_admin) {
      return;
    }

    if (request.user_info.rol_personalizado_id) {
      if (!supabaseAdmin) {
        return reply.code(500).send({
          ok: false,
          message: "Error de configuración del servidor"
        });
      }

      const { data: roleData, error } = await supabaseAdmin
        .from("roles_personalizados")
        .select("es_super_admin")
        .eq("id", request.user_info.rol_personalizado_id)
        .single();

      if (error || !roleData?.es_super_admin) {
        return reply.code(403).send({
          ok: false,
          message: "Se requieren permisos de super administrador"
        });
      }

      return;
    }

    return reply.code(403).send({
      ok: false,
      message: "Se requieren permisos de administrador"
    });
  } catch (error) {
    console.error("Error en middleware de super admin:", error);
    throw error;
  }
};

export const restaurantScope = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(401).send({
        ok: false,
        message: "Usuario no autenticado"
      });
    }

    if (request.user_info.rol_id === 1 || request.user_info.es_super_admin) {
      return;
    }

    if (request.user_info.rol_id === 2) {
      return;
    }

    if (request.user_info.rol_personalizado_id && supabaseAdmin) {
      const { data: roleData } = await supabaseAdmin
        .from("roles_personalizados")
        .select("es_super_admin")
        .eq("id", request.user_info.rol_personalizado_id)
        .single();

      if (roleData?.es_super_admin) {
        return;
      }
    }

    const restauranteId = request.user_info.restaurante_id;
    if (!restauranteId) {
      return reply.code(403).send({
        ok: false,
        message: "No tienes un restaurante asignado"
      });
    }

    request.restaurante_filter = restauranteId;
  } catch (error) {
    console.error("Error en middleware de scope de restaurante:", error);
    throw error;
  }
};
