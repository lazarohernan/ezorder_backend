import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

export const getUsuarios = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    const { data: userInfos, error: userInfoError } = await supabaseAdmin
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .neq("rol_id", 2);

    if (userInfoError) throw userInfoError;

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
      // Silenciar error si no se pueden obtener datos de auth.users
    }

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
        tipo: "activo",
      };
    });
    const { data: invitaciones, error: invitacionesError } = await supabaseAdmin
      .from("invitaciones")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("estado", "pendiente");

    if (invitacionesError) {
      console.error("Error al obtener invitaciones:", invitacionesError);
    }

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
      tipo: "invitado",
      estado_invitacion: inv.estado,
      fecha_expiracion: inv.fecha_expiracion,
    }));

    const todosLosUsuarios = [...usersWithInfo, ...invitacionesPendientes];
    const total = todosLosUsuarios.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, total);
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

export const getUsuarioById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !authUser) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    const { data: userInfo, error: userInfoError } = await supabase
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", id)
      .maybeSingle();

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

export const inviteUsuario = async (req: Request, res: Response) => {
  const {
    email,
    nombre,
    apellido,
    telefono,
    restaurante_id,
  } = req.body;

  if (!email || !nombre || !apellido) {
    res.status(400).json({
      success: false,
      message: "El email, nombre y apellido son obligatorios",
    });
    return;
  }

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      res.status(403).json({
        success: false,
        message: "No tienes permisos para invitar usuarios",
      });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    if (id_rol === 2 && restaurante_id) {
      if (!supabaseAdmin) {
        res.status(500).json({
          success: false,
          message: "Configuración de servidor incompleta",
        });
        return;
      }
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
        return;
      }
    }

    const { data: existingInvite, error: inviteError } = await supabaseAdmin
      .from("invitaciones")
      .select("*")
      .eq("email", email)
      .eq("estado", "pendiente")
      .maybeSingle();

    if (inviteError) {
      res.status(500).json({
        success: false,
        message: "Error al verificar invitaciones existentes",
        error: inviteError.message,
      });
      return;
    }

    if (existingInvite) {
      res.status(400).json({
        success: false,
        message: "Ya existe una invitación pendiente para este correo electrónico",
      });
      return;
    }

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users.some((u: any) => u.email === email);

    if (userExists) {
      res.status(400).json({
        success: false,
        message: "Ya existe un usuario con este correo electrónico",
      });
      return;
    }

    const invitadoPor = req.user_info.id;
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

    const { data: invitacion, error: insertError } = await supabaseAdmin
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

    if (insertError) {
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

export const createUsuario = async (req: Request, res: Response) => {
  const {
    email,
    password,
    nombre_usuario,
    rol_id,
    restaurante_id,
    user_image,
  } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: "El email y password son obligatorios",
    });
    return;
  }

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      res.status(403).json({
        success: false,
        message: "No tienes permisos para crear usuarios",
      });
      return;
    }

    if (id_rol === 2 && restaurante_id) {
      if (!supabaseAdmin) {
        res.status(500).json({
          success: false,
          message: "Configuración de servidor incompleta",
        });
        return;
      }
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
        return;
      }
    }

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

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

export const updateUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre_usuario, rol_id, rol_personalizado_id, restaurante_id, user_image, password } =
    req.body;
  if (!nombre_usuario && rol_id === undefined && rol_personalizado_id === undefined && restaurante_id === undefined) {
    res.status(400).json({
      success: false,
      message: "Se debe proporcionar al menos un campo para actualizar",
    });
    return;
  }

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      res.status(403).json({
        success: false,
        message: "No tienes permisos para actualizar usuarios",
      });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !authUser) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    if (id_rol === 2 && restaurante_id !== undefined) {
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurante_id && !restaurantIds.includes(restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
        return;
      }
    }

    if (id_rol === 2 && rol_id !== undefined) {
      if (rol_id === 1 || rol_id === 2) {
        res.status(403).json({
          success: false,
          message: "No puedes asignar roles de Super Admin o Admin",
        });
        return;
      }
    }

    if (password !== undefined) {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        password,
      });
    }

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

    const { data, error } = await supabaseAdmin
      .from("usuarios_info")
      .upsert({
        id,
        ...updateFields,
      })
      .select()
      .single();

    if (error) throw error;

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

export const getInvitacionesPendientes = async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

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

export const deleteUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      res.status(403).json({
        success: false,
        message: "Solo el Super Admin y Admin pueden eliminar usuarios",
      });
      return;
    }
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    const { data: authUser, error: authCheckError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authCheckError || !authUser) {
      const { data: invitacionPorId, error: invitacionPorIdError } = await supabaseAdmin
        .from("invitaciones")
        .select("*")
        .eq("id", id)
        .eq("estado", "pendiente")
        .maybeSingle();

      if (!invitacionPorIdError && invitacionPorId) {
        const { error: deleteInvError } = await supabaseAdmin
          .from("invitaciones")
          .delete()
          .eq("id", id);

        if (deleteInvError) {
          console.error('Error al eliminar invitación:', deleteInvError);
          res.status(500).json({
            success: false,
            message: "Error al eliminar invitación",
            error: deleteInvError.message,
          });
          return;
        }

        res.status(200).json({
          success: true,
          message: "Invitación eliminada correctamente",
        });
        return;
      }

      res.status(404).json({
        success: false,
        message: "Usuario o invitación no encontrado",
      });
      return;
    }

    const { data: invitaciones, error: invitacionError } = await supabaseAdmin
      .from("invitaciones")
      .select("*")
      .eq("email", authUser.user.email);

    if (!invitacionError && invitaciones && invitaciones.length > 0) {
      await supabaseAdmin
        .from("invitaciones")
        .delete()
        .eq("email", authUser.user.email);
    }

    const { data: userInfo, error: userInfoError } = await supabaseAdmin
      .from("usuarios_info")
      .select("rol_id, restaurante_id")
      .eq("id", id)
      .maybeSingle();

    if (!userInfoError && userInfo) {
      if (userInfo.rol_id === 2) {
        res.status(400).json({
          success: false,
          message: "No se puede eliminar un usuario propietario del sistema",
        });
        return;
      }

      if (id_rol === 2 && userInfo.restaurante_id) {
        const { data: userRestaurants } = await supabaseAdmin
          .from("usuarios_restaurantes")
          .select("restaurante_id")
          .eq("usuario_id", req.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (!restaurantIds.includes(userInfo.restaurante_id)) {
          res.status(403).json({
            success: false,
            message: "No puedes eliminar usuarios de restaurantes que no te pertenecen",
          });
          return;
        }
      }
    }

    try {
      await supabaseAdmin.from("usuarios_restaurantes").delete().eq("usuario_id", id);
      await supabaseAdmin.from("alertas_stock").delete().eq("usuario_notificado", id);
      await supabaseAdmin.from("movimientos_inventario").delete().eq("usuario_id", id);
      await supabaseAdmin.from("caja").delete().eq("usuario_id", id);
      await supabaseAdmin.from("gastos").delete().eq("usuario_id", id);
      await supabaseAdmin.from("notificaciones").delete().eq("usuario_id", id);
      
      const { error: deleteInfoError } = await supabaseAdmin.from("usuarios_info").delete().eq("id", id);
      
      if (deleteInfoError) {
        console.error('Error al eliminar usuarios_info:', deleteInfoError);
        throw deleteInfoError;
      }
    } catch (dataError) {
      console.error('Error al eliminar datos relacionados:', dataError);
      res.status(500).json({
        success: false,
        message: "Error al eliminar datos relacionados del usuario",
        error: dataError instanceof Error ? dataError.message : "Error desconocido",
      });
      return;
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      console.error('Error al eliminar usuario del auth:', deleteAuthError);
      res.status(500).json({
        success: false,
        message: "Error al eliminar usuario del sistema de autenticación",
        error: deleteAuthError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Usuario eliminado correctamente del sistema",
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

export const getCurrentUserInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "No se encontró información de usuario autenticado",
      });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !authUser) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    const { data: userInfo, error: userInfoError } = await supabase
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", userId)
      .maybeSingle();

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

export const getInvitaciones = async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
      return;
    }

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

