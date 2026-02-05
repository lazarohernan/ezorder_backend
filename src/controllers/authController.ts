import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";
import "../types/express"; // Importar tipos personalizados

// Interfaz para los datos de login
interface LoginData {
  email: string;
  password: string;
}

// Interfaz para los datos de registro
interface RegisterData extends LoginData {
  name?: string;
  role?: string;
}

/**
 * Registro de un nuevo usuario
 */
export const register = async (req: Request, res: Response) => {
  try {
    // Validar datos de entrada
    const { email, password, name, role = "user" }: RegisterData = req.body;

    if (!email || !password) {
      res.status(400).json({
        ok: false,
        message: "El email y la contraseña son obligatorios",
      });
      return;
    }

    // Intentar registrar al usuario con Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });

    // Manejar errores de registro
    if (error) {
      res.status(400).json({
        ok: false,
        message: "Error al registrar el usuario",
        error: error.message,
      });
      return;
    }

    // Registro exitoso
    res.status(201).json({
      ok: true,
      message: "Usuario registrado correctamente",
      user: data.user,
    });
    return;
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({
      ok: false,
      message: "Error en el servidor al procesar el registro",
    });
    return;
  }
};

/**
 * Login de usuario con email y contraseña
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Validar datos de entrada
    const { email, password }: LoginData = req.body;

    if (!email || !password) {
      res.status(400).json({
        ok: false,
        message: "El email y la contraseña son obligatorios",
      });
      return;
    }

    // Intentar autenticar al usuario con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Manejar errores de autenticación
    if (error) {
      res.status(401).json({
        ok: false,
        message: "Credenciales inválidas",
        error: error.message,
      });
      return;
    }

    // Obtener información adicional del usuario desde usuarios_info
    const { data: userInfo, error: userInfoError } = await supabase
      .from("usuarios_info")
      .select("*")
      .eq("id", data.user.id)
      .single();

    // Si hay error al obtener la información adicional, solo loguearlo pero continuar
    if (userInfoError) {
      console.warn(
        "No se pudo obtener información adicional del usuario:",
        userInfoError.message
      );
    }

    // Extraer permisos del JWT (inyectados por el auth hook)
    let permisos: string[] = [];
    let isSuperAdmin = false;
    let rolNombre = '';

    if (data.session?.access_token) {
      try {
        const base64Url = data.session.access_token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64')
            .toString('utf-8')
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        
        const decoded = JSON.parse(jsonPayload);
        permisos = decoded.user_permissions || [];
        isSuperAdmin = decoded.is_super_admin || false;
        rolNombre = decoded.rol_nombre || '';
      } catch (decodeError) {
        console.warn('Error al decodificar JWT en login:', decodeError);
      }
    }

    // Verificar si el usuario es propietario de su restaurante asignado
    let esPropietario = false;
    if (userInfo && userInfo.restaurante_id) {
      const { data: restauranteData } = await supabase
        .from('restaurantes')
        .select('propietario_id')
        .eq('id', userInfo.restaurante_id)
        .single();
      
      if (restauranteData && restauranteData.propietario_id === userInfo.id) {
        esPropietario = true;
      }
    }

    // Obtener requiere_cierre_manual del rol
    let requiereCierreManual = false;
    if (userInfo && userInfo.rol_personalizado_id) {
      const { data: rolData } = await supabase
        .from('roles_personalizados')
        .select('requiere_cierre_manual')
        .eq('id', userInfo.rol_personalizado_id)
        .single();
      
      if (rolData) {
        requiereCierreManual = rolData.requiere_cierre_manual || false;
      }
    }

    // Combinar información del usuario con permisos del JWT
    const usuariosInfoConPermisos = userInfo ? {
      ...userInfo,
      permisos,
      es_super_admin: isSuperAdmin,
      rol_nombre: rolNombre,
      es_propietario: esPropietario,
      requiere_cierre_manual: requiereCierreManual,
    } : undefined;

    // Construir objeto de sesión con refresh_token explícito
    const sessionObject = {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_at: data.session?.expires_at,
      user: data.user,
    };

    // Autenticación exitosa
    res.status(200).json({
      ok: true,
      message: "Login exitoso",
      user: data.user,
      session: sessionObject,
      usuarios_info: usuariosInfoConPermisos,
    });
    return;
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      ok: false,
      message: "Error en el servidor al procesar el login",
    });
    return;
  }
};

/**
 * Verificar el estado de la sesión actual
 */
export const checkSession = async (req: Request, res: Response) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        ok: false,
        message: "No se proporcionó un token de autenticación",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verificar la sesión con Supabase usando el token
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        ok: false,
        message: "Token inválido o expirado",
        error: error?.message,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: "Sesión activa",
      session: {
        access_token: token,
        user: data.user,
      },
    });
    return;
  } catch (error) {
    console.error("Error al verificar sesión:", error);
    res.status(500).json({
      ok: false,
      message: "Error en el servidor al verificar sesión",
    });
    return;
  }
};

/**
 * Cerrar sesión del usuario
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      res.status(500).json({
        ok: false,
        message: "Error al cerrar sesión",
        error: error.message,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: "Sesión cerrada correctamente",
    });
    return;
  } catch (error) {
    console.error("Error en logout:", error);
    res.status(500).json({
      ok: false,
      message: "Error en el servidor al cerrar sesión",
    });
    return;
  }
};

/**
 * Renovar token de autenticación
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Verificar si hay un token de actualización en la solicitud
    const { refresh_token } = req.body;

    if (!refresh_token) {
      console.log("Error: Refresh token no proporcionado");
      res.status(400).json({
        ok: false,
        message: "El token de actualización es obligatorio",
        code: "REFRESH_TOKEN_MISSING",
      });
      return;
    }

    // Intentar renovar el token con Supabase
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    // Manejar errores de renovación
    if (error) {
      console.error("Error al renovar token:", error);

      // Manejar diferentes tipos de errores
      if (error.message.includes("expired")) {
        res.status(401).json({
          ok: false,
          message: "Refresh token expirado",
          code: "REFRESH_TOKEN_EXPIRED",
        });
        return;
      }

      if (error.message.includes("invalid")) {
        res.status(401).json({
          ok: false,
          message: "Refresh token inválido",
          code: "REFRESH_TOKEN_INVALID",
        });
        return;
      }

      res.status(401).json({
        ok: false,
        message: "No se pudo renovar el token",
        error: error.message,
        code: "REFRESH_TOKEN_ERROR",
      });
      return;
    }

    // Verificar que tenemos todos los datos necesarios
    if (
      !data.session ||
      !data.session.access_token ||
      !data.session.refresh_token
    ) {
      res.status(500).json({
        ok: false,
        message: "Datos de sesión incompletos",
        code: "INCOMPLETE_SESSION_DATA",
      });
      return;
    }

    // Renovación exitosa
    res.status(200).json({
      ok: true,
      message: "Token renovado correctamente",
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata?.name,
        role: data.user?.user_metadata?.role,
        created_at: data.user?.created_at,
        updated_at: data.user?.updated_at,
      },
    });
    return;
  } catch (error) {
    console.error("Error en renovación de token:", error);
    res.status(500).json({
      ok: false,
      message: "Error en el servidor al renovar el token",
      code: "INTERNAL_SERVER_ERROR",
    });
    return;
  }
};

/**
 * Verificar un refresh token
 */
export const checkRefreshToken = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        ok: false,
        message: "El refresh token es obligatorio",
      });
      return;
    }

    // Intentar verificar el refresh token con Supabase
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    console.log("Verificación de refresh token:", {
      isValid: !error,
      error: error?.message,
      data: data
        ? {
            session: data.session
              ? {
                  access_token: data.session.access_token
                    ? "Presente"
                    : "Ausente",
                  refresh_token: data.session.refresh_token
                    ? "Presente"
                    : "Ausente",
                  expires_at: data.session.expires_at,
                }
              : null,
            user: data.user ? data.user.id : null,
          }
        : null,
    });

    if (error || !data.session) {
      res.status(401).json({
        ok: false,
        message: "Refresh token inválido o expirado",
        error: error?.message,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: "Refresh token válido",
      validUntil: data.session.expires_at,
    });
    return;
  } catch (error) {
    console.error("Error al verificar refresh token:", error);
    res.status(500).json({
      ok: false,
      message: "Error en el servidor al verificar refresh token",
    });
    return;
  }
};

/**
 * Obtener información extendida del usuario autenticado
 * Incluye permisos del JWT y datos de usuarios_info
 */
export const getUserInfo = async (req: Request, res: Response) => {
  try {
    // El middleware de autenticación ya verificó el token y agregó el usuario
    const user = req.user;
    const userInfo = req.user_info;

    if (!user || !userInfo) {
      res.status(404).json({
        ok: false,
        message: "No se encontró información del usuario",
      });
      return;
    }

    // Obtener el token del header para extraer los custom claims
    const authHeader = req.headers.authorization;
    let permisos: string[] = [];
    let isSuperAdmin = false;
    let rolNombre = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Decodificar el JWT para obtener los custom claims
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64')
            .toString('utf-8')
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        
        const decoded = JSON.parse(jsonPayload);
        
        // Extraer los custom claims del JWT
        permisos = decoded.user_permissions || [];
        isSuperAdmin = decoded.is_super_admin || false;
        rolNombre = decoded.rol_nombre || '';
      } catch (decodeError) {
        console.warn('Error al decodificar JWT:', decodeError);
        // Continuar sin permisos si hay error
      }
    }

    // Si no hay permisos en el JWT (Auth Hook no habilitado), obtenerlos de la base de datos
    if (permisos.length === 0) {
      try {
        // Usuario con rol personalizado
        if (userInfo.rol_personalizado_id) {
          // Consulta simple usando SQL directo
          const { data: permisosData, error: permisosError } = await supabase
            .rpc('get_permisos_by_rol', { rol_id_param: userInfo.rol_personalizado_id });

          if (!permisosError && permisosData) {
            permisos = permisosData.map((item: any) => item.nombre);
          }

          // Obtener información del rol personalizado
          const { data: rolData, error: rolError } = await supabase
            .from('roles_personalizados')
            .select('nombre, es_super_admin, requiere_cierre_manual')
            .eq('id', userInfo.rol_personalizado_id)
            .single();

          if (!rolError && rolData) {
            rolNombre = rolData.nombre;
            isSuperAdmin = rolData.es_super_admin;
          }
        }
        // Roles básicos del sistema
        else if (userInfo.rol_id) {
          if (userInfo.rol_id === 1) {
            // Super Admin - Acceso completo a todo
            permisos = ['*'];
            rolNombre = 'Super Administrador';
            isSuperAdmin = true;
          } else if (userInfo.rol_id === 2) {
            // Admin - Acceso completo a gestión de restaurantes
            permisos = [
              'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
              'restaurantes.ver', 'restaurantes.crear', 'restaurantes.editar', 'restaurantes.eliminar',
              'roles.ver', 'roles.crear', 'roles.editar', 'roles.eliminar',
              'menu.ver', 'menu.crear', 'menu.editar', 'menu.eliminar',
              'pedidos.ver', 'pedidos.crear', 'pedidos.editar', 'pedidos.cambiar_estado', 'pedidos.eliminar',
              'inventario.ver', 'inventario.crear', 'inventario.editar', 'inventario.eliminar',
              'caja.ver', 'caja.abrir', 'caja.cerrar', 'caja.registrar_ingresos', 'caja.registrar_egresos',
              'reportes.ver', 'reportes.generar',
              'notificaciones.ver', 'notificaciones.enviar'
            ];
            rolNombre = 'Administrador';
            isSuperAdmin = false;
          } else if (userInfo.rol_id === 3) {
            // Cajero - Permisos limitados
            permisos = [
              'pedidos.ver', 'pedidos.crear', 'pedidos.editar',
              'caja.ver', 'caja.abrir', 'caja.cerrar', 'caja.registrar_ingresos',
              'menu.ver'
            ];
            rolNombre = 'Cajero';
            isSuperAdmin = false;
          }
        }
      } catch (dbError) {
        console.warn('Error al obtener permisos de la base de datos:', dbError);
        // Continuar sin permisos si hay error
      }
    }

    // Verificar si el usuario es propietario de su restaurante asignado
    let esPropietario = false;
    if (userInfo.restaurante_id) {
      const { data: restauranteData } = await supabase
        .from('restaurantes')
        .select('propietario_id')
        .eq('id', userInfo.restaurante_id)
        .single();
      
      if (restauranteData && restauranteData.propietario_id === userInfo.id) {
        esPropietario = true;
      }
    }

    // Obtener requiere_cierre_manual del rol
    let requiereCierreManual = false;
    if (userInfo.rol_personalizado_id) {
      const { data: rolData } = await supabase
        .from('roles_personalizados')
        .select('requiere_cierre_manual')
        .eq('id', userInfo.rol_personalizado_id)
        .single();
      
      if (rolData) {
        requiereCierreManual = rolData.requiere_cierre_manual || false;
      }
    }

    // Combinar información del usuario con permisos del JWT o base de datos
    const usuariosInfoConPermisos = {
      ...userInfo,
      permisos,
      es_super_admin: isSuperAdmin,
      rol_nombre: rolNombre,
      es_propietario: esPropietario,
      requiere_cierre_manual: requiereCierreManual,
    };

    res.status(200).json({
      ok: true,
      message: "Información del usuario obtenida correctamente",
      usuarios_info: usuariosInfoConPermisos,
    });
    return;
  } catch (error) {
    console.error("Error al obtener información del usuario:", error);
    res.status(500).json({
      ok: false,
      message: "Error en el servidor al obtener información del usuario",
    });
    return;
  }
};

/**
 * Actualizar contraseña del usuario con access_token
 * Se usa para establecer contraseña después de invitación o recuperación
 */
export const updatePassword = async (req: Request, res: Response) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        ok: false,
        message: "Token de autorización no proporcionado",
      });
      return;
    }

    const accessToken = authHeader.substring(7); // Remover 'Bearer '
    const { password, refresh_token } = req.body;
    
    // Validar que se proporcione la contraseña
    if (!password) {
      res.status(400).json({
        ok: false,
        message: "La contraseña es obligatoria",
      });
      return;
    }

    // Validar longitud mínima
    if (password.length < 6) {
      res.status(400).json({
        ok: false,
        message: "La contraseña debe tener al menos 6 caracteres",
      });
      return;
    }

    // Crear un cliente de Supabase con el access_token del usuario para verificar
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      res.status(500).json({
        ok: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    // Crear cliente para verificar el token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Establecer la sesión con el access_token y refresh_token
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refresh_token || '', // Usar el refresh_token si está disponible
    });

    if (sessionError || !sessionData.session || !sessionData.user) {
      res.status(401).json({
        ok: false,
        message: "Token inválido o expirado",
        error: sessionError?.message,
      });
      return;
    }

    // Ahora actualizar la contraseña con la sesión activa
    const { data, error } = await supabaseClient.auth.updateUser({
      password: password,
    });

    if (error) {
      res.status(400).json({
        ok: false,
        message: "No se pudo actualizar la contraseña",
        error: error.message,
      });
      return;
    }

    // Después de actualizar la contraseña, procesar la invitación para crear usuarios_info
    const userEmail = data.user?.email;
    const userId = data.user?.id;
    
    if (userEmail && userId && supabaseAdmin) {
      const { data: invResult, error: invError } = await supabaseAdmin.rpc('aceptar_invitacion', {
        p_email: userEmail,
        p_user_id: userId
      });
      
      // Procesar resultado de invitación silenciosamente
      if (invError) {
        // Error no crítico, continuar
      }
    }

    // Respuesta exitosa
    res.status(200).json({
      ok: true,
      message: "Contraseña actualizada exitosamente",
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata?.name,
        role: data.user?.user_metadata?.role,
      },
    });
    return;
  } catch (error) {
    console.error("Error en actualización de contraseña:", error);
    res.status(500).json({
      ok: false,
      message: "Error en el servidor al actualizar la contraseña",
    });
    return;
  }
};
