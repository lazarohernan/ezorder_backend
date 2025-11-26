import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";
import "../types/express"; // Importar tipos personalizados

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

    const total = usersWithInfo.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, total);
    const paginatedUsers = usersWithInfo.slice(startIndex, endIndex);

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

    // Validar acceso al restaurante si es rol 2
    if (id_rol === 2 && restaurante_id) {
      const { data: userRestaurants } = await supabase
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

    // Solo usar supabaseAdmin para crear el usuario en auth
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

    // Usar cliente regular para operaciones de base de datos con RLS
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

    // Usar cliente regular para obtener información del usuario con RLS
    const { data: authUser, error: authError } = await supabase
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", id)
      .maybeSingle();

    if (authError || !authUser) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    // Validar acceso al restaurante si es rol 2
    if (id_rol === 2 && restaurante_id !== undefined) {
      const { data: userRestaurants } = await supabase
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

    // Validar asignación de roles
    if (id_rol === 2 && rol_id !== undefined) {
      if (rol_id === 1 || rol_id === 2) {
        res.status(403).json({
          success: false,
          message: "No puedes asignar roles de Super Admin o Admin",
        });
        return;
      }
    }

    // Solo usar supabaseAdmin para actualizar contraseña en auth
    if (password !== undefined) {
      if (!supabaseAdmin) {
        res.status(500).json({
          success: false,
          message: "Configuración de administrador no disponible",
        });
        return;
      }
      
      await supabaseAdmin.auth.admin.updateUserById(id, {
        password,
      });
    }

    // Usar supabaseAdmin para evitar problemas con RLS al actualizar otros usuarios
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

    console.log('📝 Actualizando usuario:', { id, updateFields });

    const { data, error } = await supabaseAdmin!
      .from("usuarios_info")
      .upsert({
        id,
        ...updateFields,
      })
      .select()
      .single();

    console.log('📝 Resultado actualización:', { data, error });

    if (error) throw error;

    // Obtener información actualizada del usuario
    const { data: updatedUser, error: fetchError } = await supabase
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const userWithInfo = {
      id,
      email: authUser.email || "N/A",
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at || null,
      user_metadata: authUser.user_metadata || {},
      app_metadata: authUser.app_metadata || {},
      confirmed_at: authUser.confirmed_at || null,
      user_info: updatedUser,
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
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
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

    // Usar función RPC para eliminar información personal y acceso
    // IMPORTANTE: Preserva el historial (pedidos, movimientos_inventario, gastos, caja)
    // para mantener la actividad registrada en el sistema
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          message: "Configuración de administrador no disponible",
        });
      }

      // Llamar a la función RPC que elimina información personal pero preserva historial
      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc('eliminar_usuario_completo', { p_usuario_id: id });

      if (rpcError) {
        console.error('Error al ejecutar función RPC eliminar_usuario_completo:', rpcError);
        return res.status(500).json({
          success: false,
          message: "Error al eliminar información del usuario",
          error: rpcError.message,
        });
      }

      // Verificar el resultado de la función RPC
      if (!rpcResult || !rpcResult.success) {
        const errorMessage = rpcResult?.message || rpcResult?.error || 'Error desconocido';
        console.error('La función RPC retornó error:', errorMessage);
        return res.status(500).json({
          success: false,
          message: errorMessage,
          error: rpcResult?.error,
        });
      }

      console.log('Función RPC ejecutada exitosamente. Historial preservado:', rpcResult.registros_historicos_preservados);
    } catch (dataError) {
      console.error('Error al eliminar información del usuario:', dataError);
      return res.status(500).json({
        success: false,
        message: "Error al eliminar información del usuario",
        error: dataError instanceof Error ? dataError.message : "Error desconocido",
      });
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


