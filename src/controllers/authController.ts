import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

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
export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Validar datos de entrada
    const { email, password, name, role = "user" }: RegisterData = (request.body as any);

    if (!email || !password) {
      return reply.code(400).send({
        ok: false,
        message: "El email y la contraseña son obligatorios",
      });
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
      return reply.code(400).send({
        ok: false,
        message: "Error al registrar el usuario",
        error: error.message,
      });
    }

    // Crear registro básico en usuarios_info para que el usuario exista en el sistema
    if (data.user) {
      const adminClient = supabaseAdmin || supabase;
      const { error: infoError } = await adminClient
        .from("usuarios_info")
        .insert({
          id: data.user.id,
          nombre_usuario: name || email,
          rol_id: 3, // Rol básico por defecto
          updated_at: new Date(),
        })
        .select()
        .single();

      if (infoError) {
        console.warn("No se pudo crear usuarios_info para el registro:", infoError.message);
      }
    }

    // Registro exitoso
    return reply.code(201).send({
      ok: true,
      message: "Usuario registrado correctamente",
      user: data.user,
    });
  } catch (error) {
    console.error("Error en registro:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al procesar el registro",
    });
  }
};

/**
 * Login de usuario con email y contraseña
 */
export const login = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Validar datos de entrada
    const { email, password }: LoginData = (request.body as any);

    if (!email || !password) {
      return reply.code(400).send({
        ok: false,
        message: "El email y la contraseña son obligatorios",
      });
    }

    // Intentar autenticar al usuario con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Manejar errores de autenticación
    if (error) {
      return reply.code(401).send({
        ok: false,
        message: "Credenciales inválidas",
        error: error.message,
      });
    }

    // Obtener información adicional del usuario desde usuarios_info
    const infoClient = supabaseAdmin || supabase;
    const { data: userInfo, error: userInfoError } = await infoClient
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
        const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');

        const decoded = JSON.parse(jsonPayload);
        permisos = decoded.user_permissions || [];
        isSuperAdmin = decoded.is_super_admin || false;
        rolNombre = decoded.rol_nombre || '';
      } catch (decodeError) {
        console.warn('Error al decodificar JWT en login:', decodeError);
      }
    }

    // Fallback: si el JWT no tiene permisos, obtenerlos de la base de datos
    if (permisos.length === 0 && userInfo) {
      try {
        if (userInfo.rol_personalizado_id) {
          const permClient = supabaseAdmin || supabase;
          const { data: permisosData, error: permisosError } = await permClient
            .rpc('get_permisos_by_rol', { rol_id_param: userInfo.rol_personalizado_id });

          if (!permisosError && permisosData) {
            permisos = permisosData.map((item: any) => item.nombre);
          }

          const rolClient = supabaseAdmin || supabase;
          const { data: rolData, error: rolError } = await rolClient
            .from('roles_personalizados')
            .select('nombre, es_super_admin')
            .eq('id', userInfo.rol_personalizado_id)
            .single();

          if (!rolError && rolData) {
            rolNombre = rolData.nombre;
            isSuperAdmin = rolData.es_super_admin;
          }
        } else if (userInfo.rol_id) {
          if (userInfo.rol_id === 1) {
            permisos = ['*'];
            rolNombre = 'Super Administrador';
            isSuperAdmin = true;
          } else if (userInfo.rol_id === 2) {
            permisos = [
              'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
              'restaurantes.ver', 'restaurantes.crear', 'restaurantes.editar', 'restaurantes.eliminar',
              'roles.ver', 'roles.crear', 'roles.editar', 'roles.eliminar',
              'menu.ver', 'menu.crear', 'menu.editar', 'menu.eliminar',
              'pedidos.ver', 'pedidos.crear', 'pedidos.editar', 'pedidos.cambiar_estado', 'pedidos.eliminar',
              'inventario.ver', 'inventario.crear', 'inventario.editar', 'inventario.eliminar',
              'caja.ver', 'caja.abrir', 'caja.cerrar', 'caja.registrar_ingresos', 'caja.registrar_egresos',
              'reportes.ver', 'reportes.generar',
              'notificaciones.ver', 'notificaciones.enviar',
              'facturacion.ver', 'facturacion.editar', 'facturacion.anular',
              'gastos.ver', 'gastos.crear', 'gastos.editar', 'gastos.eliminar',
              'movimientos.ver', 'movimientos.crear'
            ];
            rolNombre = 'Administrador';
          } else if (userInfo.rol_id === 3) {
            permisos = [
              'pedidos.ver', 'pedidos.crear', 'pedidos.editar',
              'caja.ver', 'caja.abrir', 'caja.cerrar', 'caja.registrar_ingresos',
              'menu.ver',
              'facturacion.ver',
              'gastos.ver', 'gastos.crear'
            ];
            rolNombre = 'Cajero';
          }
        }
      } catch (dbError) {
        console.warn('Error al obtener permisos de la BD en login:', dbError);
      }
    }

    // Verificar si el usuario es propietario de su restaurante asignado
    let esPropietario = false;
    if (userInfo && userInfo.restaurante_id) {
      const client = supabaseAdmin || supabase;
      const { data: restauranteData } = await client
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
      const rolClient = supabaseAdmin || supabase;
      const { data: rolData } = await rolClient
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
    return reply.code(200).send({
      ok: true,
      message: "Login exitoso",
      user: data.user,
      session: sessionObject,
      usuarios_info: usuariosInfoConPermisos,
    });
  } catch (error) {
    console.error("Error en login:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al procesar el login",
    });
  }
};

/**
 * Verificar el estado de la sesión actual
 */
export const checkSession = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({
        ok: false,
        message: "No se proporcionó un token de autenticación",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verificar la sesión con Supabase usando el token
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return reply.code(401).send({
        ok: false,
        message: "Token inválido o expirado",
        error: error?.message,
      });
    }

    return reply.code(200).send({
      ok: true,
      message: "Sesión activa",
      session: {
        access_token: token,
        user: data.user,
      },
    });
  } catch (error) {
    console.error("Error al verificar sesión:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al verificar sesión",
    });
  }
};

/**
 * Cerrar sesión del usuario
 */
export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Usar supabaseAdmin para revocar la sesión del usuario específico
    // supabase.auth.signOut() no tiene efecto en el backend porque el cliente no tiene sesión persistente
    if (supabaseAdmin && request.user?.id) {
      const { error } = await supabaseAdmin.auth.admin.signOut(request.user.id);
      if (error) {
        console.warn("Error al revocar sesión con admin:", error.message);
        // No fallar el logout por esto, continuar
      }
    }

    return reply.code(200).send({
      ok: true,
      message: "Sesión cerrada correctamente",
    });
  } catch (error) {
    console.error("Error en logout:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al cerrar sesión",
    });
  }
};

/**
 * Renovar token de autenticación
 */
export const refreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Verificar si hay un token de actualización en la solicitud
    const { refresh_token } = (request.body as any);

    if (!refresh_token) {
      console.log("Error: Refresh token no proporcionado");
      return reply.code(400).send({
        ok: false,
        message: "El token de actualización es obligatorio",
        code: "REFRESH_TOKEN_MISSING",
      });
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
        return reply.code(401).send({
          ok: false,
          message: "Refresh token expirado",
          code: "REFRESH_TOKEN_EXPIRED",
        });
      }

      if (error.message.includes("invalid")) {
        return reply.code(401).send({
          ok: false,
          message: "Refresh token inválido",
          code: "REFRESH_TOKEN_INVALID",
        });
      }

      return reply.code(401).send({
        ok: false,
        message: "No se pudo renovar el token",
        error: error.message,
        code: "REFRESH_TOKEN_ERROR",
      });
    }

    // Verificar que tenemos todos los datos necesarios
    if (
      !data.session ||
      !data.session.access_token ||
      !data.session.refresh_token
    ) {
      return reply.code(500).send({
        ok: false,
        message: "Datos de sesión incompletos",
        code: "INCOMPLETE_SESSION_DATA",
      });
    }

    // Renovación exitosa
    return reply.code(200).send({
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
  } catch (error) {
    console.error("Error en renovación de token:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al renovar el token",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

/**
 * Verificar un refresh token
 */
export const checkRefreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { refresh_token } = (request.body as any);

    if (!refresh_token) {
      return reply.code(400).send({
        ok: false,
        message: "El refresh token es obligatorio",
      });
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
      return reply.code(401).send({
        ok: false,
        message: "Refresh token inválido o expirado",
        error: error?.message,
      });
    }

    // Devolver los nuevos tokens ya que refreshSession() rota el refresh token
    return reply.code(200).send({
      ok: true,
      message: "Refresh token válido",
      validUntil: data.session.expires_at,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("Error al verificar refresh token:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al verificar refresh token",
    });
  }
};

/**
 * Obtener información extendida del usuario autenticado
 * Incluye permisos del JWT y datos de usuarios_info
 */
export const getUserInfo = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // El middleware de autenticación ya verificó el token y agregó el usuario
    const user = request.user;
    const userInfo = request.user_info;

    if (!user || !userInfo) {
      return reply.code(404).send({
        ok: false,
        message: "No se encontró información del usuario",
      });
    }

    // Obtener el token del header para extraer los custom claims
    const authHeader = request.headers.authorization;
    let permisos: string[] = [];
    let isSuperAdmin = false;
    let rolNombre = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // Decodificar el JWT para obtener los custom claims
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');

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
          // Consulta usando supabaseAdmin para evitar RLS
          const permClient = supabaseAdmin || supabase;
          const { data: permisosData, error: permisosError } = await permClient
            .rpc('get_permisos_by_rol', { rol_id_param: userInfo.rol_personalizado_id });

          if (!permisosError && permisosData) {
            permisos = permisosData.map((item: any) => item.nombre);
          }

          // Obtener información del rol personalizado usando supabaseAdmin
          const rolClient = supabaseAdmin || supabase;
          const { data: rolData, error: rolError } = await rolClient
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
              'notificaciones.ver', 'notificaciones.enviar',
              'facturacion.ver', 'facturacion.editar', 'facturacion.anular',
              'gastos.ver', 'gastos.crear', 'gastos.editar', 'gastos.eliminar',
              'movimientos.ver', 'movimientos.crear'
            ];
            rolNombre = 'Administrador';
            isSuperAdmin = false;
          } else if (userInfo.rol_id === 3) {
            // Cajero - Permisos limitados
            permisos = [
              'pedidos.ver', 'pedidos.crear', 'pedidos.editar',
              'caja.ver', 'caja.abrir', 'caja.cerrar', 'caja.registrar_ingresos',
              'menu.ver',
              'facturacion.ver',
              'gastos.ver', 'gastos.crear'
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
      const restClient = supabaseAdmin || supabase;
      const { data: restauranteData } = await restClient
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
      const client = supabaseAdmin || supabase;
      const { data: rolData } = await client
        .from('roles_personalizados')
        .select('requiere_cierre_manual')
        .eq('id', userInfo.rol_personalizado_id)
        .single();

      if (rolData) {
        requiereCierreManual = rolData.requiere_cierre_manual || false;
      }
    }

    // Combinar información del usuario con permisos del JWT o base de datos
    console.log('📋 getUserInfo - permisos para usuario:', userInfo.id, {
      rol_id: userInfo.rol_id,
      rol_personalizado_id: userInfo.rol_personalizado_id,
      permisos_count: permisos.length,
      permisos_source: permisos.length > 0 ? 'loaded' : 'empty',
      rolNombre,
      isSuperAdmin
    });

    const usuariosInfoConPermisos = {
      ...userInfo,
      permisos,
      es_super_admin: isSuperAdmin,
      rol_nombre: rolNombre,
      es_propietario: esPropietario,
      requiere_cierre_manual: requiereCierreManual,
    };

    return reply.code(200).send({
      ok: true,
      message: "Información del usuario obtenida correctamente",
      usuarios_info: usuariosInfoConPermisos,
    });
  } catch (error) {
    console.error("Error al obtener información del usuario:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al obtener información del usuario",
    });
  }
};

/**
 * Enviar email de recuperación de contraseña
 */
export const sendPasswordReset = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { email } = (request.body as any);

    if (!email) {
      return reply.code(400).send({
        ok: false,
        message: "El email es obligatorio",
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (!supabaseAdmin) {
      return reply.code(500).send({
        ok: false,
        message: "Error de configuración del servidor",
      });
    }

    // Verificar si el email existe en el sistema antes de enviar
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("Error al verificar usuario:", listError.message);
      return reply.code(500).send({
        ok: false,
        message: "Error al procesar la solicitud",
      });
    }

    const userExists = usersData.users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!userExists) {
      return reply.code(404).send({
        ok: false,
        message: "No existe una cuenta registrada con este correo electrónico.",
      });
    }

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/auth/callback`,
    });

    if (error) {
      console.error("Error al enviar email de recuperación:", error.message);
      return reply.code(500).send({
        ok: false,
        message: "Error al enviar el correo de recuperación",
      });
    }

    return reply.code(200).send({
      ok: true,
      message: "Se ha enviado un enlace de recuperación a tu correo electrónico.",
    });
  } catch (error) {
    console.error("Error en recuperación de contraseña:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al procesar la solicitud",
    });
  }
};

/**
 * Actualizar contraseña del usuario con access_token
 * Se usa para establecer contraseña después de invitación o recuperación
 */
export const updatePassword = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        ok: false,
        message: "Token de autorización no proporcionado",
      });
    }

    const accessToken = authHeader.substring(7); // Remover 'Bearer '
    const { password, refresh_token } = (request.body as any);

    // Validar que se proporcione la contraseña
    if (!password) {
      return reply.code(400).send({
        ok: false,
        message: "La contraseña es obligatoria",
      });
    }

    // Validar longitud mínima
    if (password.length < 6) {
      return reply.code(400).send({
        ok: false,
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    // Crear un cliente de Supabase con el access_token del usuario para verificar
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return reply.code(500).send({
        ok: false,
        message: "Error de configuración del servidor",
      });
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
      return reply.code(401).send({
        ok: false,
        message: "Token inválido o expirado",
        error: sessionError?.message,
      });
    }

    // Ahora actualizar la contraseña con la sesión activa
    const { data, error } = await supabaseClient.auth.updateUser({
      password: password,
    });

    if (error) {
      return reply.code(400).send({
        ok: false,
        message: "No se pudo actualizar la contraseña",
        error: error.message,
      });
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
    return reply.code(200).send({
      ok: true,
      message: "Contraseña actualizada exitosamente",
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata?.name,
        role: data.user?.user_metadata?.role,
      },
    });
  } catch (error) {
    console.error("Error en actualización de contraseña:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al actualizar la contraseña",
    });
  }
};
