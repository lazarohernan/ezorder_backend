import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabase/supabase";

/**
 * Middleware para verificar permisos específicos
 * @param requiredPermissions - Array de permisos requeridos (al menos uno debe tener el usuario)
 */
export const requirePermissions = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔐 Middleware de permisos - Permisos requeridos:', requiredPermissions);
      console.log('🔐 Middleware de permisos - req.user_info:', req.user_info);
      
      if (!req.user_info) {
        console.log('❌ No hay user_info en la request');
        return res.status(401).json({
          ok: false,
          message: "Usuario no autenticado"
        });
      }

      // 1. Super Admin (rol_id=1) - Acceso total
      if (req.user_info.rol_id === 1 || req.user_info.es_super_admin) {
        console.log('✅ Super Admin detectado - Acceso total');
        return next();
      }

      // 2. Admin/Propietario (rol_id=2) - Acceso total a SUS restaurantes sin restricciones
      if (req.user_info.rol_id === 2) {
        console.log('✅ Admin/Propietario detectado (rol_id=2) - Acceso total');
        return next();
      }

      // 3. Usuarios con rol tradicional (rol_id=3,4) - Verificar permisos del JWT
      if (req.user_info.rol_id && !req.user_info.rol_personalizado_id) {
        // Permisos predefinidos según rol_id
        const defaultPermissions: Record<number, string[]> = {
          3: ['menu.ver', 'pedidos.*', 'clientes.*', 'caja.registrar_ingresos', 'caja.ver', 'dashboard.ver', 'restaurantes.ver', 'categorias.ver'], // Mesero
          4: ['menu.ver', 'pedidos.ver', 'pedidos.cambiar_estado', 'dashboard.ver'] // Cocinero
        };

        const userPermissions = defaultPermissions[req.user_info.rol_id] || [];

        // Verificar si tiene permisos requeridos
        const hasPermission = requiredPermissions.some(permission => {
          if (userPermissions.includes('*')) return true;
          if (permission.includes('*')) {
            const prefix = permission.replace('*', '');
            return userPermissions.some(p => p.startsWith(prefix) || p === `${prefix}*`);
          }
          return userPermissions.includes(permission);
        });

        if (!hasPermission) {
          return res.status(403).json({
            ok: false,
            message: "No tienes permisos para realizar esta acción"
          });
        }

        return next();
      }

      // 4. Usuarios con rol personalizado - Verificar permisos en la base de datos
      const rolPersonalizadoId = req.user_info.rol_personalizado_id;

      if (!rolPersonalizadoId) {
        return res.status(403).json({
          ok: false,
          message: "No tienes permisos para realizar esta acción"
        });
      }

      // Nuevo sistema: verificar permisos específicos
      if (!supabaseAdmin) {
        return res.status(500).json({
          ok: false,
          message: "Error de configuración del servidor"
        });
      }

      const { data: userPermissions, error } = await supabaseAdmin
        .from('rol_permisos')
        .select(`
          permisos!inner(nombre)
        `)
        .eq('rol_id', rolPersonalizadoId);

      if (error) {
        console.error('Error al obtener permisos:', error);
        return res.status(500).json({
          ok: false,
          message: "Error al verificar permisos"
        });
      }

      const permissionNames = userPermissions.map((rp: any) => rp.permisos.nombre);

      // SPECIAL CASE: Allow viewing restaurants and categories if user has menu permissions
      // This is needed because users need to see restaurants and categories to create/edit menus
      if ((requiredPermissions.includes('restaurantes.ver') || requiredPermissions.includes('categorias.ver')) && permissionNames.some(p => p.startsWith('menu.'))) {
        console.log('✅ Permiso especial: Usuario con permisos de menú puede ver restaurantes y categorías');
        return next();
      }

      // Verificar si el usuario tiene al menos uno de los permisos requeridos
      const hasPermission = requiredPermissions.some(permission => {
        if (permissionNames.includes('*')) return true;
        if (permission.includes('*')) {
          const prefix = permission.replace('*', '');
          return permissionNames.some(p => p.startsWith(prefix));
        }
        return permissionNames.includes(permission);
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

/**
 * Middleware para verificar si el usuario es super admin (puede gestionar roles)
 */
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user_info) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado"
      });
    }

    // Verificar si es superadmin (rol_id=1) o admin (rol_id=2) o rol personalizado con es_super_admin
    if (req.user_info.rol_id === 1 || req.user_info.rol_id === 2 || req.user_info.es_super_admin) {
      return next();
    }

    // Verificar en roles personalizados
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

    // Si no es superadmin o admin, denegar acceso
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

/**
 * Middleware para filtrar datos por restaurante (scope)
 * Los usuarios no superadmin solo ven datos de su restaurante
 */
export const restaurantScope = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user_info) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado"
      });
    }

    // Superadmins ven todo (verificar en roles personalizados)

    // Super Admin (rol_id=1) ve todo
    if (req.user_info.rol_id === 1 || req.user_info.es_super_admin) {
      return next();
    }

    // Admin (rol_id=2) ve sus restaurantes
    if (req.user_info.rol_id === 2) {
      // Los Admins tienen acceso a sus restaurantes, no necesitan filtro adicional
      // El filtro se aplica en las políticas RLS
      return next();
    }

    // Verificar si es superadmin en roles personalizados
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

    // Otros usuarios solo ven su restaurante
    const restauranteId = req.user_info.restaurante_id;
    if (!restauranteId) {
      return res.status(403).json({
        ok: false,
        message: "No tienes un restaurante asignado"
      });
    }

    // Agregar filtro de restaurante a la request
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
