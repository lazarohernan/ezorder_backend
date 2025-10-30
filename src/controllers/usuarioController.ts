import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los usuarios
export const getUsuarios = async (req: Request, res: Response) => {
  try {
    // Extraer parámetros de paginación de la solicitud
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Verificar que tenemos cliente admin
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    // Obtener usuarios con su información desde usuarios_info (excluyendo propietarios)
    const { data: userInfos, error: userInfoError } = await supabaseAdmin
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .neq("rol_id", 2); // Excluir usuarios con rol de propietario (rol_id = 2)

    if (userInfoError) throw userInfoError;

    // Obtener todos los usuarios de auth para mapear emails y datos de acceso
    let emailMap: { [key: string]: string } = {};
    let userDataMap: { [key: string]: any } = {};
    try {
      const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!authError && authUsersData?.users) {
        authUsersData.users.forEach((user: any) => {
          emailMap[user.id] = user.email;
          userDataMap[user.id] = {
            last_sign_in_at: user.last_sign_in_at,
            confirmed_at: user.confirmed_at,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata,
          };
        });
      }
    } catch (error) {
      console.log("No se pudo obtener datos de auth.users:", error);
    }

    // Mapear usuarios con su información
    const usersWithInfo = (userInfos || []).map((userInfo) => {
      const authData = userDataMap[userInfo.id] || {};
      return {
        id: userInfo.id,
        email: emailMap[userInfo.id] || "N/A",
        created_at: userInfo.created_at,
        last_sign_in_at: authData.last_sign_in_at || null,
        user_metadata: authData.user_metadata || {},
        app_metadata: authData.app_metadata || {},
        confirmed_at: authData.confirmed_at || null,
        user_info: userInfo,
        tipo: "activo", // Marcar como usuario activo
      };
    });

    // Obtener invitaciones pendientes
    const { data: invitaciones, error: invitacionesError } = await supabaseAdmin
      .from("invitaciones")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("estado", "pendiente");

    if (invitacionesError) {
      console.error("Error al obtener invitaciones:", invitacionesError);
    }

    // Mapear invitaciones como "usuarios pendientes"
    const invitacionesPendientes = (invitaciones || []).map((inv) => ({
      id: inv.id,
      email: inv.email,
      created_at: inv.created_at,
      last_sign_in_at: null,
      user_metadata: {
        nombre: inv.nombre,
        apellido: inv.apellido,
        telefono: inv.telefono,
      },
      app_metadata: {},
      confirmed_at: null,
      user_info: {
        id: inv.id,
        nombre_usuario: `${inv.nombre} ${inv.apellido}`.trim(),
        rol_id: 3,
        restaurante_id: inv.restaurante_id,
        restaurantes: inv.restaurantes,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
      },
      tipo: "invitado", // Marcar como invitación pendiente
      estado_invitacion: inv.estado,
      fecha_expiracion: inv.fecha_expiracion,
    }));

    // Combinar usuarios activos e invitaciones pendientes
    const todosLosUsuarios = [...usersWithInfo, ...invitacionesPendientes];

    // Calcular el total de elementos y páginas
    const total = todosLosUsuarios.length;
    const totalPages = Math.ceil(total / limit);

    // Calcular el índice de inicio y fin para la paginación
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, total);

    // Obtener solo los elementos de la página actual
    const paginatedUsers = todosLosUsuarios.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        items: paginatedUsers,
        total,
        page,
        limit,
        totalPages,
        stats: {
          activos: usersWithInfo.length,
          invitados: invitacionesPendientes.length,
        },
      },
    });
    return;
  } catch (error: any) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener usuarios",
    });
    return;
  }
};

// Obtener un usuario por ID
export const getUsuarioById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    console.log(`Usuario ${req.user?.id} solicitó el usuario ${id}`);

    // Verificar que tenemos cliente admin
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    // Obtener el usuario de auth.users
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !authUser) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    // Obtener la información adicional del usuario
    const { data: userInfo, error: userInfoError } = await supabase
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", id)
      .maybeSingle(); // Puede que no exista la información

    // Construir objeto completo (incluso si no tiene user_info)
    const userWithInfo = {
      id: authUser.user.id,
      email: authUser.user.email,
      created_at: authUser.user.created_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
      user_metadata: authUser.user.user_metadata,
      app_metadata: authUser.user.app_metadata,
      confirmed_at: authUser.user.confirmed_at,
      user_info: userInfoError ? null : userInfo,
    };

    res.status(200).json({
      success: true,
      data: userWithInfo,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener usuario",
    });
    return;
  }
};

// Invitar un nuevo usuario (guarda en tabla invitaciones)
export const inviteUsuario = async (req: Request, res: Response) => {
  const {
    email,
    nombre,
    apellido,
    telefono,
    restaurante_id,
  } = req.body;

  // Verificar que se proporcione el email
  if (!email || !nombre || !apellido) {
    res.status(400).json({
      success: false,
      message: "El email, nombre y apellido son obligatorios",
    });
    return;
  }

  try {
    // Verificar que tenemos cliente admin
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    // Verificar si ya existe una invitación pendiente
    const { data: existingInvite } = await supabaseAdmin
      .from("invitaciones")
      .select("*")
      .eq("email", email)
      .eq("estado", "pendiente")
      .single();

    if (existingInvite) {
      res.status(400).json({
        success: false,
        message: "Ya existe una invitación pendiente para este correo electrónico",
      });
      return;
    }

    // Verificar si el usuario ya existe en auth
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users.some(u => u.email === email);

    if (userExists) {
      res.status(400).json({
        success: false,
        message: "Ya existe un usuario con este correo electrónico",
      });
      return;
    }

    // Obtener el ID del usuario que está invitando
    const invitadoPor = req.user?.id;

    console.log('Invitando usuario:', { email, nombre, apellido, restaurante_id });

    // Usar inviteUserByEmail de Supabase que envía email automáticamente
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        nombre,
        apellido,
        telefono,
        restaurante_id,
        invitado_por: invitadoPor,
      },
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`,
    });

    if (authError) {
      console.error('Error al invitar usuario:', authError);
      res.status(400).json({
        success: false,
        message: "Error al enviar invitación",
        error: authError.message,
      });
      return;
    }

    console.log('Usuario invitado en auth:', authData.user.id);

    // Guardar en tabla de invitaciones para tracking
    const { data: invitacion, error: inviteError } = await supabaseAdmin
      .from("invitaciones")
      .insert([
        {
          email,
          nombre,
          apellido,
          telefono,
          restaurante_id,
          invitado_por: invitadoPor,
          estado: "pendiente",
        },
      ])
      .select()
      .single();

    if (inviteError) {
      console.error('Error al crear registro de invitación:', inviteError);
      // No fallar si no se puede guardar el tracking
    }

    res.status(201).json({
      success: true,
      message: "Invitación enviada exitosamente. El usuario recibirá un correo electrónico con las instrucciones para establecer su contraseña.",
      data: {
        user_id: authData.user.id,
        email: authData.user.email,
        invitacion,
      },
    });
  } catch (error: unknown) {
    console.error("Error al invitar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al invitar usuario",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

// Crear información de un nuevo usuario
export const createUsuario = async (req: Request, res: Response) => {
  const {
    email,
    password,
    nombre_usuario,
    rol_id,
    restaurante_id,
    user_image,
  } = req.body;

  // Verificar que se proporcione el email y password
  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: "El email y password son obligatorios",
    });
    return;
  }

  try {
    // Verificar que tenemos cliente admin
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    // Crear el usuario en auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData) {
      res.status(400).json({
        success: false,
        message: "Error al crear el usuario en el sistema de autenticación",
        error: authError,
      });
      return;
    }

    const userId = authData.user.id;

    // Verificar si ya existe información para este usuario
    const { data: existingInfo, error: checkError } = await supabase
      .from("usuarios_info")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingInfo) {
      res.status(400).json({
        success: false,
        message: "Ya existe información para este usuario",
      });
      return;
    }

    // Crear el registro de información del usuario
    const { data, error } = await supabase
      .from("usuarios_info")
      .insert([
        {
          id: userId,
          nombre_usuario,
          rol_id,
          restaurante_id,
          updated_at: new Date(),
          user_image,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Devolver el usuario completo con su nueva información
    const userWithInfo = {
      id: authData.user.id,
      email: authData.user.email,
      created_at: authData.user.created_at,
      last_sign_in_at: authData.user.last_sign_in_at,
      user_metadata: authData.user.user_metadata,
      app_metadata: authData.user.app_metadata,
      confirmed_at: authData.user.confirmed_at,
      user_info: data,
    };

    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      data: userWithInfo,
    });
    return;
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear usuario",
    });
    return;
  }
};

// Actualizar información de un usuario
export const updateUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre_usuario, rol_id, rol_personalizado_id, restaurante_id, user_image, password } =
    req.body;

  console.log('Actualizando usuario:', { id, nombre_usuario, rol_id, rol_personalizado_id, restaurante_id, user_image, password: password ? '***' : undefined });

  // Verificar que se proporcione al menos un campo para actualizar
  if (!nombre_usuario && rol_id === undefined && rol_personalizado_id === undefined && restaurante_id === undefined) {
    res.status(400).json({
      success: false,
      message: "Se debe proporcionar al menos un campo para actualizar",
    });
    return;
  }

  try {
    // Verificar que tenemos cliente admin
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    // Verificar si el usuario existe en auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !authUser) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    if (password !== undefined) {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        password,
      });
    }

    // Crear objeto con solo los campos proporcionados
    const updateFields: any = {
      updated_at: new Date(),
    };

    if (nombre_usuario !== undefined)
      updateFields.nombre_usuario = nombre_usuario;
    if (rol_id !== undefined) updateFields.rol_id = rol_id;
    if (rol_personalizado_id !== undefined) updateFields.rol_personalizado_id = rol_personalizado_id;
    if (restaurante_id !== undefined)
      updateFields.restaurante_id = restaurante_id;
    if (user_image !== undefined) updateFields.user_image = user_image;

    // Actualizar la información o crearla si no existe (upsert)
    const { data, error } = await supabaseAdmin
      .from("usuarios_info")
      .upsert({
        id,
        ...updateFields,
      })
      .select()
      .single();

    if (error) throw error;

    // Devolver el usuario completo con su información actualizada
    const userWithInfo = {
      id: authUser.user.id,
      email: authUser.user.email,
      created_at: authUser.user.created_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
      user_metadata: authUser.user.user_metadata,
      app_metadata: authUser.user.app_metadata,
      confirmed_at: authUser.user.confirmed_at,
      user_info: data,
    };

    res.status(200).json({
      success: true,
      message: "Información de usuario actualizada exitosamente",
      data: userWithInfo,
    });
  } catch (error: unknown) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar usuario",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

// Obtener invitaciones pendientes
export const getInvitacionesPendientes = async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    // Obtener todas las invitaciones pendientes con información del restaurante
    const { data: invitaciones, error } = await supabaseAdmin
      .from("invitaciones")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: invitaciones || [],
    });
  } catch (error: unknown) {
    console.error("Error al obtener invitaciones pendientes:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener invitaciones pendientes",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

// Eliminar información de un usuario
export const deleteUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    console.log(
      `Usuario ${req.user?.id} está eliminando la información del usuario ${id}`
    );

    // Verificar que tenemos cliente admin
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    // Llamar a la función RPC que maneja la eliminación segura
    const { data: rpcResult, error: rpcError } = await supabaseAdmin
      .rpc('eliminar_usuario', { p_usuario_id: id });

    if (rpcError) {
      console.error('Error al ejecutar RPC eliminar_usuario:', rpcError);
      res.status(500).json({
        success: false,
        message: "Error al eliminar usuario",
        error: rpcError.message,
      });
      return;
    }

    // Verificar el resultado de la RPC (ahora devuelve JSON con success y message)
    if (!rpcResult?.success) {
      res.status(400).json({
        success: false,
        message: rpcResult?.message || "Error al eliminar usuario",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: rpcResult.message || "Usuario eliminado correctamente",
    });
    return;
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar usuario",
    });
    return;
  }
};

// Obtener el perfil del usuario actual
export const getCurrentUserInfo = async (req: Request, res: Response) => {
  try {
    // Obtener el ID del usuario del token de autenticación
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "No se encontró información de usuario autenticado",
      });
      return;
    }

    // Verificar que tenemos cliente admin
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    // Obtener el usuario de auth.users
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !authUser) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    // Buscar la información adicional del usuario
    const { data: userInfo, error: userInfoError } = await supabase
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", userId)
      .maybeSingle();

    // Construir objeto completo del usuario
    const userWithInfo = {
      id: authUser.user.id,
      email: authUser.user.email,
      created_at: authUser.user.created_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
      user_metadata: authUser.user.user_metadata,
      app_metadata: authUser.user.app_metadata,
      confirmed_at: authUser.user.confirmed_at,
      user_info: userInfoError ? null : userInfo,
    };

    res.status(200).json({
      success: true,
      data: userWithInfo,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener perfil de usuario",
    });
    return;
  }
};

// Obtener todas las invitaciones (incluyendo pendientes)
export const getInvitaciones = async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    // Obtener todas las invitaciones con información del restaurante
    const { data: invitaciones, error } = await supabaseAdmin
      .from("invitaciones")
      .select("*, restaurantes(id, nombre_restaurante)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: invitaciones || [],
    });
  } catch (error: unknown) {
    console.error("Error al obtener invitaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener invitaciones",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

// NOTA: La función activarInvitacion ya no es necesaria
// El trigger de base de datos "on_auth_user_confirmed" se encarga automáticamente de:
// 1. Crear el registro en usuarios_info cuando el usuario confirma su email
// 2. Actualizar el estado de la invitación a "aceptada"
// El flujo es: Admin invita → Usuario recibe email → Usuario establece contraseña → Trigger automático crea todo
