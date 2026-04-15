import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

export const getUsuarios = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const page = parseInt((request.query as any).page as string) || 1;
    const limit = parseInt((request.query as any).limit as string) || 10;
    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Configuración de administrador no disponible",
      });
    }

    const { data: userInfos, error: userInfoError } = await supabaseAdmin
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .neq("rol_id", 2)
      .neq("rol_id", 1);

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

    return reply.code(200).send({
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
  } catch (error: any) {
    console.error("Error al obtener usuarios:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener usuarios",
    });
  }
};

export const getUsuarioById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Configuración de administrador no disponible",
      });
    }

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !authUser) {
      return reply.code(404).send({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const infoClient = supabaseAdmin || supabase;
    const { data: userInfo, error: userInfoError } = await infoClient
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", id)
      .maybeSingle();

    const { data: restaurantesAsignados, error: restaurantesAsignadosError } = await supabaseAdmin
      .from("usuarios_restaurantes")
      .select("restaurante_id, restaurantes(id, nombre_restaurante)")
      .eq("usuario_id", id);

    if (restaurantesAsignadosError) {
      console.error("Error al obtener restaurantes asignados:", restaurantesAsignadosError);
    }

    const restaurantesAsignadosFormateados = (restaurantesAsignados || []).map((row: any) => ({
      id: row.restaurante_id,
      nombre_restaurante: row.restaurantes?.nombre_restaurante || "",
    }));

    const userWithInfo = {
      id: authUser.user.id,
      email: authUser.user.email,
      created_at: authUser.user.created_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
      user_metadata: authUser.user.user_metadata,
      app_metadata: authUser.user.app_metadata,
      confirmed_at: authUser.user.confirmed_at,
      user_info: userInfoError ? null : userInfo,
      restaurantes_asignados: restaurantesAsignadosFormateados,
    };

    return reply.code(200).send({
      success: true,
      data: userWithInfo,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener usuario",
    });
  }
};


export const createUsuario = async (request: FastifyRequest, reply: FastifyReply) => {
  const {
    email,
    password,
    nombre_usuario,
    rol_id,
    restaurante_id,
    user_image,
  } = (request.body as any);

  if (!email || !password) {
    return reply.code(400).send({
      success: false,
      message: "El email y password son obligatorios",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const id_rol = request.user_info?.rol_id ?? 3;
    const hasCustomRole = request.user_info?.rol_personalizado_id;

    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return reply.code(403).send({
        success: false,
        message: "No tienes permisos para crear usuarios",
      });
    }

    // Verificar disponibilidad de supabaseAdmin antes de cualquier operación
    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Configuración de administrador no disponible",
      });
    }

    // Validar acceso al restaurante si es rol 2
    if (id_rol === 2 && restaurante_id) {
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
      }
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData) {
      return reply.code(400).send({
        success: false,
        message: "Error al crear el usuario en el sistema de autenticación",
        error: authError,
      });
    }

    const userId = authData.user.id;

    const { data: existingInfo, error: checkError } = await supabaseAdmin
      .from("usuarios_info")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingInfo) {
      return reply.code(400).send({
        success: false,
        message: "Ya existe información para este usuario",
      });
    }

    const { data, error } = await supabaseAdmin
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

    // Crear asociación en usuarios_restaurantes si hay restaurante_id
    if (restaurante_id) {
      const { error: urError } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .insert({
          usuario_id: userId,
          restaurante_id,
          es_propietario: false,
          created_at: new Date(),
        })
        .select()
        .single();

      if (urError) {
        console.error("Error al crear asociación usuario-restaurante:", urError);
        // No fallar la creación del usuario por esto, pero loguearlo
      }
    }

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

    return reply.code(201).send({
      success: true,
      message: "Usuario creado exitosamente",
      data: userWithInfo,
    });
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al crear usuario",
    });
  }
};

export const updateUsuario = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);
  const {
    nombre_usuario,
    rol_id,
    rol_personalizado_id,
    restaurante_id,
    restaurantes_ids,
    user_image,
    password,
    bienvenida_aceptada,
  } =
    (request.body as any);
  if (
    !nombre_usuario &&
    rol_id === undefined &&
    rol_personalizado_id === undefined &&
    restaurante_id === undefined &&
    restaurantes_ids === undefined &&
    user_image === undefined &&
    bienvenida_aceptada === undefined
  ) {
    return reply.code(400).send({
      success: false,
      message: "Se debe proporcionar al menos un campo para actualizar",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const id_rol = request.user_info?.rol_id ?? 3;
    const hasCustomRole = request.user_info?.rol_personalizado_id;

    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return reply.code(403).send({
        success: false,
        message: "No tienes permisos para actualizar usuarios",
      });
    }

    // Usar supabaseAdmin para evitar problemas con RLS
    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Configuración de administrador no disponible",
      });
    }

    const { data: authUser, error: authError } = await supabaseAdmin
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", id)
      .maybeSingle();

    if (authError || !authUser) {
      return reply.code(404).send({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const restaurantesIdsNormalizados: string[] | undefined = Array.isArray(restaurantes_ids)
      ? [...new Set(restaurantes_ids.filter((rid: unknown) => typeof rid === "string" && rid.trim() !== ""))]
      : undefined;

    // Validar acceso al restaurante si es rol 2 y se está asignando un restaurante específico
    if (id_rol === 2 && restaurante_id !== undefined && restaurante_id !== null) {
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
      }
    }

    // Validar acceso si se envía lista de restaurantes
    if (id_rol === 2 && restaurantesIdsNormalizados !== undefined) {
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      const restaurantesNoPermitidos = restaurantesIdsNormalizados.filter(
        (rid) => !restaurantIds.includes(rid),
      );

      if (restaurantesNoPermitidos.length > 0) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a uno o más restaurantes seleccionados",
        });
      }
    }

    // Validar asignación de roles
    if (id_rol === 2 && rol_id !== undefined) {
      if (rol_id === 1 || rol_id === 2) {
        return reply.code(403).send({
          success: false,
          message: "No puedes asignar roles de Super Admin o Admin",
        });
      }
    }

    // Solo usar supabaseAdmin para actualizar contraseña en auth
    if (password !== undefined) {
      if (!supabaseAdmin) {
        return reply.code(500).send({
          success: false,
          message: "Configuración de administrador no disponible",
        });
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
    if (restaurantesIdsNormalizados !== undefined && restaurante_id === undefined) {
      updateFields.restaurante_id =
        restaurantesIdsNormalizados.length > 0 ? restaurantesIdsNormalizados[0] : null;
    }
    if (user_image !== undefined) updateFields.user_image = user_image;
    if (bienvenida_aceptada !== undefined) updateFields.bienvenida_aceptada = bienvenida_aceptada;

    console.log('📝 Actualizando usuario:', { id, updateFields });

    const { data, error } = await supabaseAdmin
      .from("usuarios_info")
      .upsert({
        id,
        ...updateFields,
      })
      .select()
      .single();

    console.log('📝 Resultado actualización:', { data, error });

    if (error) throw error;

    // Sincronizar usuarios_restaurantes con selección múltiple cuando se envía lista explícita
    if (restaurantesIdsNormalizados !== undefined) {
      // Eliminar asociaciones que ya no están seleccionadas
      if (restaurantesIdsNormalizados.length > 0) {
        const restaurantesIdsSql = restaurantesIdsNormalizados.map((rid) => `"${rid}"`).join(",");
        const { error: urDeleteNotInError } = await supabaseAdmin
          .from("usuarios_restaurantes")
          .delete()
          .eq("usuario_id", id)
          .not("restaurante_id", "in", `(${restaurantesIdsSql})`);

        if (urDeleteNotInError) {
          console.error("Error al depurar asociaciones usuario-restaurante:", urDeleteNotInError);
        }

        // Insertar asociaciones faltantes
        const payload = restaurantesIdsNormalizados.map((rid) => ({
          usuario_id: id,
          restaurante_id: rid,
          es_propietario: false,
          created_at: new Date(),
        }));

        const { error: urBulkUpsertError } = await supabaseAdmin
          .from("usuarios_restaurantes")
          .upsert(payload, { onConflict: "usuario_id,restaurante_id" });

        if (urBulkUpsertError) {
          console.error("Error al sincronizar asociaciones usuario-restaurante:", urBulkUpsertError);
        }
      } else {
        const { error: urDeleteAllError } = await supabaseAdmin
          .from("usuarios_restaurantes")
          .delete()
          .eq("usuario_id", id);

        if (urDeleteAllError) {
          console.error("Error al limpiar asociaciones usuario-restaurante:", urDeleteAllError);
        }
      }
    }
    // Compatibilidad: sincronización por restaurante_id único (flujo legado)
    else if (restaurante_id !== undefined) {
      if (restaurante_id) {
        // Insertar o actualizar la asociación usuario-restaurante
        const { error: urError } = await supabaseAdmin
          .from("usuarios_restaurantes")
          .upsert({
            usuario_id: id,
            restaurante_id,
            es_propietario: false,
            created_at: new Date(),
          }, { onConflict: "usuario_id,restaurante_id" });

        if (urError) {
          console.error("Error al sincronizar usuario-restaurante:", urError);
        }
      } else {
        // Si se quita el restaurante, eliminar la asociación
        const { error: urDeleteError } = await supabaseAdmin
          .from("usuarios_restaurantes")
          .delete()
          .eq("usuario_id", id);

        if (urDeleteError) {
          console.error("Error al eliminar asociación usuario-restaurante:", urDeleteError);
        }
      }
    }

    // Obtener información actualizada del usuario
    const { data: updatedUser, error: fetchError } = await supabaseAdmin
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

    return reply.code(200).send({
      success: true,
      message: "Información de usuario actualizada exitosamente",
      data: userWithInfo,
    });
  } catch (error: unknown) {
    console.error("Error al actualizar usuario:", error);
    return reply.code(500).send({
      success: false,
      message: "Error al actualizar usuario",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};


export const deleteUsuario = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const id_rol = request.user_info?.rol_id ?? 3;
    const hasCustomRole = request.user_info?.rol_personalizado_id;

    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return reply.code(403).send({
        success: false,
        message: "Solo el Super Admin y Admin pueden eliminar usuarios",
      });
    }
    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Configuración de administrador no disponible",
      });
    }

    const { data: authUser, error: authCheckError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authCheckError || !authUser) {
      return reply.code(404).send({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const { data: userInfo, error: userInfoError } = await supabaseAdmin
      .from("usuarios_info")
      .select("rol_id, restaurante_id")
      .eq("id", id)
      .maybeSingle();

    if (!userInfoError && userInfo) {
      if (userInfo.rol_id === 2) {
        return reply.code(400).send({
          success: false,
          message: "No se puede eliminar un usuario propietario del sistema",
        });
      }

      if (id_rol === 2 && userInfo.restaurante_id) {
        const { data: userRestaurants } = await supabaseAdmin
          .from("usuarios_restaurantes")
          .select("restaurante_id")
          .eq("usuario_id", request.user_info.id);

        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

        if (!restaurantIds.includes(userInfo.restaurante_id)) {
          return reply.code(403).send({
            success: false,
            message: "No puedes eliminar usuarios de restaurantes que no te pertenecen",
          });
        }
      }
    }

    // Usar función RPC para eliminar información personal y acceso
    // IMPORTANTE: Preserva el historial (pedidos, movimientos_inventario, gastos, caja)
    // para mantener la actividad registrada en el sistema
    try {
      if (!supabaseAdmin) {
        return reply.code(500).send({
          success: false,
          message: "Configuración de administrador no disponible",
        });
      }

      // Llamar a la función RPC que elimina información personal pero preserva historial
      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc('eliminar_usuario_completo', { p_usuario_id: id });

      if (rpcError) {
        console.error('Error al ejecutar función RPC eliminar_usuario_completo:', rpcError);
        return reply.code(500).send({
          success: false,
          message: "Error al eliminar información del usuario",
          error: rpcError.message,
        });
      }

      // Verificar el resultado de la función RPC
      if (!rpcResult || !rpcResult.success) {
        const errorMessage = rpcResult?.message || rpcResult?.error || 'Error desconocido';
        console.error('La función RPC retornó error:', errorMessage);
        return reply.code(500).send({
          success: false,
          message: errorMessage,
          error: rpcResult?.error,
        });
      }

      console.log('Función RPC ejecutada exitosamente. Historial preservado:', rpcResult.registros_historicos_preservados);
    } catch (dataError) {
      console.error('Error al eliminar información del usuario:', dataError);
      return reply.code(500).send({
        success: false,
        message: "Error al eliminar información del usuario",
        error: dataError instanceof Error ? dataError.message : "Error desconocido",
      });
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      console.error('Error al eliminar usuario del auth:', deleteAuthError);
      return reply.code(500).send({
        success: false,
        message: "Error al eliminar usuario del sistema de autenticación",
        error: deleteAuthError.message,
      });
    }

    return reply.code(200).send({
      success: true,
      message: "Usuario eliminado correctamente del sistema",
    });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al eliminar usuario",
    });
  }
};

export const getCurrentUserInfo = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({
        success: false,
        message: "No se encontró información de usuario autenticado",
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Configuración de administrador no disponible",
      });
    }

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !authUser) {
      return reply.code(404).send({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const infoClient = supabaseAdmin || supabase;
    const { data: userInfo, error: userInfoError } = await infoClient
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

    return reply.code(200).send({
      success: true,
      data: userWithInfo,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener perfil de usuario",
    });
  }
};

/**
 * Actualizar perfil propio (sin requerir permiso usuarios.editar)
 * Solo permite: nombre_usuario, user_image, bienvenida_aceptada
 */
export const updateMyProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = request.user_info?.id;
    if (!userId) {
      return reply.code(401).send({ success: false, message: "No autenticado" });
    }

    const { nombre_usuario, user_image, bienvenida_aceptada } = (request.body as any);

    if (nombre_usuario === undefined && user_image === undefined && bienvenida_aceptada === undefined) {
      return reply.code(400).send({ success: false, message: "Se debe proporcionar al menos un campo para actualizar" });
    }

    const client = supabaseAdmin || supabase;
    const updateFields: Record<string, unknown> = { updated_at: new Date() };

    if (nombre_usuario !== undefined) updateFields.nombre_usuario = nombre_usuario;
    if (user_image !== undefined) updateFields.user_image = user_image;
    if (bienvenida_aceptada !== undefined) updateFields.bienvenida_aceptada = bienvenida_aceptada;

    const { error } = await client
      .from("usuarios_info")
      .update(updateFields)
      .eq("id", userId);

    if (error) throw error;

    const { data: updated, error: fetchError } = await client
      .from("usuarios_info")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    return reply.code(200).send({ success: true, message: "Perfil actualizado", data: updated });
  } catch (error: any) {
    console.error("Error al actualizar perfil propio:", error);
    return reply.code(500).send({ success: false, message: error.message || "Error al actualizar perfil" });
  }
};


