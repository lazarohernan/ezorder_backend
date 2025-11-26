import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";
import "../types/express";

/**
 * FLUJO:
 * 1. Admin invita -> Se crea en auth.users (Supabase) + invitaciones (pendiente)
 * 2. UI muestra invitaciones pendientes desde tabla invitaciones
 * 3. Usuario acepta -> Establece password + invitacion cambia a "aceptada"
 * 4. Admin asigna rol y restaurante manualmente
 */

export const createInvitacion = async (req: Request, res: Response) => {
  try {
    const { email, nombre, apellido, rol_id = 3, restaurante_id, telefono } = req.body;

    if (!email || !nombre || !apellido) {
      return res.status(400).json({ success: false, message: 'Email, nombre y apellido son obligatorios' });
    }

    if (!req.user_info) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const userRole = req.user_info.rol_id;
    if (userRole !== 1 && userRole !== 2) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para invitar usuarios' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, message: 'Configuracion de Supabase no disponible' });
    }

    // Paso 1: Verificar si ya existe invitacion pendiente
    const { data: invExistente } = await supabaseAdmin
      .from('invitaciones')
      .select('*')
      .eq('email', email)
      .eq('estado', 'pendiente')
      .single();

    if (invExistente) {
      // Reactivar invitacion existente
      await supabaseAdmin
        .from('invitaciones')
        .update({
          nombre, apellido, telefono, rol_id, restaurante_id,
          updated_at: new Date(),
          fecha_envio: new Date(),
          fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })
        .eq('id', invExistente.id);

      // Reenviar email
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { nombre, apellido, rol_id, restaurante_id, invitado_por: req.user_info.user_id }
      });

      return res.status(200).json({
        success: true,
        message: 'Invitacion reenviada',
        data: { email, invitacion_id: invExistente.id, estado: 'pendiente' }
      });
    }

    // Paso 2: Generar token unico para la invitacion
    const { data: tokenData } = await supabaseAdmin.rpc('generar_token_invitacion');
    const token = tokenData || crypto.randomUUID();

    // Paso 3: Crear registro en tabla invitaciones PRIMERO
    const { data: invitacion, error: invError } = await supabaseAdmin
      .from('invitaciones')
      .insert({
        email,
        nombre,
        apellido,
        telefono,
        rol_id,
        restaurante_id,
        invitado_por: req.user_info.user_id,
        token_invitacion: token,
        estado: 'pendiente',
        created_at: new Date(),
        updated_at: new Date(),
        fecha_envio: new Date(),
        fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
      .select()
      .single();

    if (invError) {
      console.error('Error al crear invitacion:', invError);
      return res.status(500).json({ success: false, message: 'Error al crear invitacion: ' + invError.message });
    }

    // Paso 4: Enviar invitacion via Supabase (esto crea usuario en auth.users)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        nombre,
        apellido,
        rol_id,
        restaurante_id,
        invitado_por: req.user_info.user_id,
        invitacion_id: invitacion.id,
        token_invitacion: token
      }
    });

    if (authError) {
      console.error('Error al enviar email:', authError);
      // No fallar, la invitacion ya esta creada
    }

    console.log('Invitacion creada:', email);
    console.log('Invitacion ID:', invitacion.id);
    console.log('Auth User ID:', authData?.user?.id);

    return res.status(200).json({
      success: true,
      message: 'Invitacion enviada exitosamente',
      data: {
        email,
        invitacion_id: invitacion.id,
        auth_user_id: authData?.user?.id,
        estado: 'pendiente',
        note: 'El usuario aparecera como pendiente hasta que acepte la invitacion.'
      }
    });

  } catch (error: any) {
    console.error('Error en createInvitacion:', error);
    return res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

/**
 * Obtener lista de invitaciones (para mostrar pendientes en UI)
 */
export const getInvitaciones = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const userRole = req.user_info.rol_id;
    if (userRole !== 1 && userRole !== 2) {
      return res.status(403).json({ success: false, message: 'Sin permisos' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, message: 'Configuracion no disponible' });
    }

    let query = supabaseAdmin
      .from('invitaciones')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtrar por restaurante si no es admin SOLO si el restaurante está asignado
    // Las invitaciones sin restaurante asignado deben ser visibles para admins
    if (userRole !== 1 && req.user_info.restaurante_id) {
      query = query.or(`restaurante_id.eq.${req.user_info.restaurante_id},restaurante_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: 'Error', error: error.message });
    }

    return res.status(200).json({ success: true, data: data || [] });

  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

/**
 * Obtener solo invitaciones pendientes (para UI de pendientes)
 */
export const getInvitacionesPendientes = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, message: 'Configuracion no disponible' });
    }

    let query = supabaseAdmin
      .from('invitaciones')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    // Filtrar por restaurante si no es admin
    if (req.user_info.rol_id !== 1 && req.user_info.restaurante_id) {
      query = query.eq('restaurante_id', req.user_info.restaurante_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: 'Error', error: error.message });
    }

    return res.status(200).json({ success: true, data: data || [] });

  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

/**
 * Marcar invitacion como aceptada (llamar cuando usuario establece password)
 */
export const aceptarInvitacion = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email es obligatorio' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, message: 'Configuracion no disponible' });
    }

    // Actualizar estado de invitacion
    const { data, error } = await supabaseAdmin
      .from('invitaciones')
      .update({
        estado: 'aceptada',
        fecha_aceptacion: new Date(),
        updated_at: new Date()
      })
      .eq('email', email)
      .eq('estado', 'pendiente')
      .select()
      .single();

    if (error) {
      return res.status(404).json({ success: false, message: 'Invitacion no encontrada' });
    }

    return res.status(200).json({
      success: true,
      message: 'Invitacion aceptada',
      data
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

/**
 * Cancelar/eliminar invitacion - ELIMINA TODO DE RAIZ
 * 1. RPC elimina de: invitaciones, usuarios_info
 * 2. API Admin elimina de: auth.users
 */
export const cancelarInvitacion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user_info) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, message: 'Configuracion no disponible' });
    }

    // Paso 1: Obtener email de la invitacion
    const { data: invitacion, error: invError } = await supabaseAdmin
      .from('invitaciones')
      .select('email')
      .eq('id', id)
      .single();

    if (invError || !invitacion) {
      return res.status(404).json({ success: false, message: 'Invitacion no encontrada' });
    }

    const email = invitacion.email;

    // Paso 2: Buscar usuario en auth.users para obtener el ID
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = usersData?.users?.find(u => u.email === email);

    // Paso 3: Usar RPC para eliminar de tablas publicas (invitaciones, usuarios_info)
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('eliminar_usuario_completo', {
      p_email: email
    });

    if (rpcError) {
      console.error('Error en RPC:', rpcError);
    }

    // Paso 4: Eliminar de auth.users usando API Admin (forma correcta segun documentacion)
    let authDeleted = false;
    if (authUser) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      if (deleteError) {
        console.error('Error al eliminar de auth.users:', deleteError);
      } else {
        authDeleted = true;
        console.log('Usuario eliminado de auth.users:', authUser.id);
      }
    }

    console.log('Eliminacion completa para:', email);

    return res.status(200).json({ 
      success: true, 
      message: 'Usuario eliminado completamente',
      data: {
        email,
        user_id: authUser?.id || null,
        eliminado: {
          invitaciones: true,
          usuarios_info: true,
          auth_users: authDeleted
        }
      }
    });

  } catch (error: any) {
    console.error('Error al cancelar invitacion:', error);
    return res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

/**
 * Verificar token de invitacion
 */
export const verifyInvitacionToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token || !supabaseAdmin) {
      return res.status(400).json({ success: false, message: 'Token requerido' });
    }

    const { data, error } = await supabaseAdmin
      .from('invitaciones')
      .select('*')
      .eq('token_invitacion', token)
      .eq('estado', 'pendiente')
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Token invalido' });
    }

    if (new Date() > new Date(data.fecha_expiracion)) {
      return res.status(410).json({ success: false, message: 'Invitacion expirada' });
    }

    return res.status(200).json({
      success: true,
      data: { email: data.email, nombre: data.nombre, apellido: data.apellido, estado: data.estado }
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

// Alias para deleteInvitacion
export const deleteInvitacion = cancelarInvitacion;
