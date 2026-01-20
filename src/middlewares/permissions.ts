import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabase/supabase";

export const requirePermissions = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user_info) {
        // Usuario no autenticado
        return res.status(401).json({
          ok: false,
          message: "Usuario no autenticado"
        });
      }

      // Super Admin siempre tiene acceso
      if (req.user_info.rol_id === 1 || req.user_info.es_super_admin) {
        return next();
      }

      // Admin siempre tiene acceso
      if (req.user_info.rol_id === 2) {
        return next();
      }

      // Si el usuario tiene restaurante asignado y solo quiere VER restaurantes, permitir
      if (req.user_info.restaurante_id && requiredPermissions.includes('restaurantes.ver')) {
        return next();
      }

      const rolPersonalizadoId = req.user_info.rol_personalizado_id;
      if (!rolPersonalizadoId) {
        return res.status(403).json({
          ok: false,
          message: "No tienes permisos para realizar esta acción. Contacta al administrador para que te asigne un rol."
        });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          ok: false,
          message: "Error de configuración del servidor"
        });
      }

      const { data: userPermissions, error } = await supabaseAdmin
        .from('rol_permisos')
        .select('permisos!inner(nombre)')
        .eq('rol_id', rolPersonalizadoId);

      if (error) {
        console.error('Error al obtener permisos:', error);
        return res.status(500).json({
          ok: false,
          message: "Error al verificar permisos"
        });
      }

      const permissionNames = userPermissions.map((rp: any) => rp.permisos.nombre);

      if ((requiredPermissions.includes('restaurantes.ver') || requiredPermissions.includes('categorias.ver')) 
          && permissionNames.some(p => p.startsWith('menu.'))) {
        return next();
      }

      const hasPermission = requiredPermissions.some(permission => {
        if (permissionNames.includes('*')) return true;
        if (permissionNames.includes(permission)) return true;
        
        if (permission.includes('*')) {
          const prefix = permission.replace('*', '');
          return permissionNames.some(p => p.startsWith(prefix));
        }
        
        const matchingWildcard = permissionNames.find(p => p.endsWith('.*'));
        if (matchingWildcard) {
          const prefix = matchingWildcard.replace('.*', '');
          if (permission.startsWith(prefix + '.')) return true;
        }
        
        return false;
      });

      if (!hasPermission) {
        return res.status(403).json({
          ok: false,
          message: "No tienes permisos para realizar esta acción"
        });
      }

      next();
    } catch (error) {
      console.error("Error en middleware de permisos:", error);
      res.status(500).json({
        ok: false,
        message: "Error interno del servidor"
      });
    }
  };
};

export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user_info) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado"
      });
    }

    if (req.user_info.rol_id === 1 || req.user_info.rol_id === 2 || req.user_info.es_super_admin) {
      return next();
    }

    if (req.user_info.rol_personalizado_id) {
      if (!supabaseAdmin) {
        return res.status(500).json({
          ok: false,
          message: "Error de configuración del servidor"
        });
      }

      const { data: roleData, error } = await supabaseAdmin
        .from('roles_personalizados')
        .select('es_super_admin')
        .eq('id', req.user_info.rol_personalizado_id)
        .single();

      if (error || !roleData?.es_super_admin) {
        return res.status(403).json({
          ok: false,
          message: "Se requieren permisos de super administrador"
        });
      }

      return next();
    }

    return res.status(403).json({
      ok: false,
      message: "Se requieren permisos de administrador"
    });
  } catch (error) {
    console.error("Error en middleware de super admin:", error);
    res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

export const restaurantScope = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user_info) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado"
      });
    }

    if (req.user_info.rol_id === 1 || req.user_info.es_super_admin) {
      return next();
    }

    if (req.user_info.rol_id === 2) {
      return next();
    }

    if (req.user_info.rol_personalizado_id && supabaseAdmin) {
      const { data: roleData } = await supabaseAdmin
        .from('roles_personalizados')
        .select('es_super_admin')
        .eq('id', req.user_info.rol_personalizado_id)
        .single();

      if (roleData?.es_super_admin) {
        return next();
      }
    }

    const restauranteId = req.user_info.restaurante_id;
    if (!restauranteId) {
      return res.status(403).json({
        ok: false,
        message: "No tienes un restaurante asignado"
      });
    }

    req.restaurante_filter = restauranteId;
    next();
  } catch (error) {
    console.error("Error en middleware de scope de restaurante:", error);
    res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};
