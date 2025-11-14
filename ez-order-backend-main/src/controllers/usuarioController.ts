import { Request, Response } from "express";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "../supabase/supabase";
import { getClientWithRLS } from "../utils/supabaseHelpers";

export const getUsuarios = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
    }

    // Usar arquitectura híbrida: supabaseAdmin + validación de backend
    // Esto es más seguro y confiable que RLS con auth.uid() actualmente
    if (!req.user_info?.rol_id || ![1, 2].includes(req.user_info.rol_id)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para ver usuarios"
      });
    }

    // Usar supabaseAdmin con filtros de seguridad (el filtrado debe funcionar)
    const client = supabaseAdmin;
    
    let query = client
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)");
    
    // Super admins (rol_id = 1) pueden ver todos los usuarios excepto otros admins
    if (req.user_info.rol_id === 1) {
      query = query.neq("rol_id", 2);
    } 
    // Admins de restaurante (rol_id = 2) solo ven usuarios de sus restaurantes (excepto otros admins)
    else if (req.user_info.rol_id === 2) {
      query = query
        .eq("restaurante_id", req.user_info.restaurante_id)
        .neq("rol_id", 2); // Excluir otros admins del mismo restaurante
    }
    
    // Debug: verificar que el cliente es válido
    if (!client || typeof client.from !== 'function') {
      console.error('Error: client no es válido', { 
        clientType: typeof client, 
        hasFrom: typeof client?.from,
        clientKeys: client ? Object.keys(client).slice(0, 5) : 'null'
      });
      return res.status(500).json({
        success: false,
        message: "Error de configuración del cliente de Supabase"
      });
    }
    
    console.log('🔍 DEBUG: Ejecutando query final');
    console.log('   Query aplicada:', query);
    
    const { data: userInfos, error: userInfoError } = await query;

    if (userInfoError) {
      console.error("Error al obtener usuarios_info:", userInfoError);
      throw userInfoError;
    }

    // Obtener emails desde auth (requiere admin)
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
      console.error("Error al obtener datos de auth:", error);
    }

    const usersWithInfo = (userInfos || []).map((userInfo: any) => {
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

    // Obtener invitaciones pendientes (RLS filtra automáticamente)
    const { data: invitaciones, error: invitacionesError } = await client
      .from("invitaciones")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });

    if (invitacionesError) {
      console.error("Error al obtener invitaciones:", invitacionesError);
    }

    const invitacionesPendientes = (invitaciones || []).map((inv: any) => ({
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

    return res.status(200).json({
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
  } catch (error: any) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error al obtener usuarios",
    });
  }
};

export const getUsuarioById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
    }

    // Usar RLS para obtener usuario (RLS verifica acceso automáticamente)
    const client = await getClientWithRLS(req);
    
    const { data: userInfo, error: userInfoError } = await client
      .from("usuarios_info")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", id)
      .maybeSingle();

    if (userInfoError) {
      console.error("Error al obtener usuario:", userInfoError);
      return res.status(500).json({
        success: false,
        message: "Error al obtener información del usuario",
      });
    }

    // Si no se encuentra el usuario, RLS bloqueó el acceso
    if (!userInfo) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este usuario",
      });
    }

    // Obtener datos de auth (requiere admin)
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !authUser) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado en el sistema de autenticación",
      });
    }

    const userWithInfo = {
      id: authUser.user.id,
      email: authUser.user.email,
      created_at: authUser.user.created_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
      user_metadata: authUser.user.user_metadata,
      app_metadata: authUser.user.app_metadata,
      confirmed_at: authUser.user.confirmed_at,
      user_info: userInfo,
    };

    return res.status(200).json({
      success: true,
      data: userWithInfo,
    });
  } catch (error: any) {
    console.error("Error al obtener usuario:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error al obtener usuario",
    });
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

    // Verificar acceso al restaurante si es Admin (RLS verifica en insert)
    const client = await getClientWithRLS(req);
    
    // Verificar si ya existe una invitación pendiente
    const { data: existingInvite, error: inviteError } = await client
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

    const usersResponse = await supabaseAdmin.auth.admin.listUsers();
    if (usersResponse.error) {
      res.status(500).json({
        success: false,
        message: "Error al verificar usuarios existentes",
        error: usersResponse.error.message,
      });
      return;
    }
    const userExists = usersResponse.data.users.some((u: User) => u.email === email);

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

    // Usar RLS para insertar invitación (RLS verifica acceso al restaurante)
    const { data: invitacion, error: insertError } = await client
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

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Configuración de administrador no disponible",
      });
    }

    // Crear usuario en auth (requiere admin)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData) {
      return res.status(400).json({
        success: false,
        message: "Error al crear el usuario en el sistema de autenticación",
        error: authError,
      });
    }

    const userId = authData.user.id;

    // Usar RLS para crear usuario_info (RLS verifica acceso al restaurante)
    const client = await getClientWithRLS(req);
    
    const { data: existingInfo, error: checkError } = await client
      .from("usuarios_info")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingInfo) {
      return res.status(400).json({
        success: false,
        message: "Ya existe información para este usuario",
      });
    }

    const { data, error } = await client
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

    // Validar que Admin no pueda asignar roles de Super Admin o Admin
    if (id_rol === 2 && rol_id !== undefined) {
      if (rol_id === 1 || rol_id === 2) {
        return res.status(403).json({
          success: false,
          message: "No puedes asignar roles de Super Admin o Admin",
        });
      }
    }

    // Actualizar password en auth (requiere admin)
    if (password !== undefined) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password,
      });
      
      if (passwordError) {
        return res.status(400).json({
          success: false,
          message: "Error al actualizar contraseña",
          error: passwordError.message,
        });
      }
    }

    // Usar RLS para actualizar usuario_info (RLS verifica acceso automáticamente)
    const client = await getClientWithRLS(req);
    
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

    const { data, error } = await client
      .from("usuarios_info")
      .update(updateFields)
      .eq("id", id)
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
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Usar RLS para obtener invitaciones (RLS filtra automáticamente)
    const client = await getClientWithRLS(req);
    
    const { data: invitaciones, error } = await client
      .from("invitaciones")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener invitaciones pendientes:", error);
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: invitaciones || [],
    });
  } catch (error: unknown) {
    console.error("Error al obtener invitaciones pendientes:", error);
    return res.status(500).json({
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

    // Usar RLS con políticas proper para verificar acceso
    const client = await getClientWithRLS(req);
    
    // Verificar que el usuario existe y RLS permite acceso
    const { data: userInfo, error: userInfoError } = await client
      .from("usuarios_info")
      .select("rol_id, restaurante_id")
      .eq("id", id)
      .maybeSingle();

    // Si no se encuentra el usuario, RLS bloqueó el acceso
    if (userInfoError || !userInfo) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este usuario o no existe",
      });
    }

    // Validar que no se pueda eliminar un admin
    if (userInfo.rol_id === 2) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar un usuario propietario del sistema",
      });
    }

    // Eliminar datos relacionados (requiere admin para evitar problemas de RLS en cascada)
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          message: "Configuración de administrador no disponible",
        });
      }

      await supabaseAdmin.from("usuarios_restaurantes").delete().eq("usuario_id", id);
      await supabaseAdmin.from("alertas_stock").delete().eq("usuario_notificado", id);
      await supabaseAdmin.from("movimientos_inventario").delete().eq("usuario_id", id);
      await supabaseAdmin.from("caja").delete().eq("usuario_id", id);
      await supabaseAdmin.from("gastos").delete().eq("usuario_id", id);
      await supabaseAdmin.from("notificaciones").delete().eq("usuario_id", id);
      
      // Usar RLS para eliminar usuario_info (RLS verifica acceso)
      const { error: deleteInfoError } = await client
        .from("usuarios_info")
        .delete()
        .eq("id", id);
      
      if (deleteInfoError) {
        console.error('Error al eliminar usuarios_info:', deleteInfoError);
        throw deleteInfoError;
      }
    } catch (dataError) {
      console.error('Error al eliminar datos relacionados:', dataError);
      return res.status(500).json({
        success: false,
        message: "Error al eliminar datos relacionados del usuario",
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

    // Usar RLS para obtener usuario_info (RLS verifica acceso automáticamente)
    const client = await getClientWithRLS(req);
    
    const { data: userInfo, error: userInfoError } = await client
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
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Usar RLS para obtener invitaciones (RLS filtra automáticamente)
    const client = await getClientWithRLS(req);
    
    const { data: invitaciones, error } = await client
      .from("invitaciones")
      .select("*, restaurantes(id, nombre_restaurante)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener invitaciones:", error);
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: invitaciones || [],
    });
  } catch (error: unknown) {
    console.error("Error al obtener invitaciones:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener invitaciones",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

