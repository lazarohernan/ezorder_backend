import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

/**
 * FLUJO:
 * 1. Admin invita -> Se crea en auth.users (Supabase) + invitaciones (pendiente)
 * 2. UI muestra invitaciones pendientes desde tabla invitaciones
 * 3. Usuario acepta -> Establece password + invitacion cambia a "aceptada"
 * 4. Admin asigna rol y restaurante manualmente
 */

export const createInvitacion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { email, nombre, apellido, rol_id = 3, restaurante_id, telefono } = request.body as {
      email?: string;
      nombre?: string;
      apellido?: string;
      rol_id?: number;
      restaurante_id?: string;
      telefono?: string;
    };

    if (!email || !nombre || !apellido) {
      return reply.code(400).send({ success: false, message: 'Email, nombre y apellido son obligatorios' });
    }

    if (!request.user_info || !request.user) {
      return reply.code(403).send({ success: false, message: 'No autorizado' });
    }

    const userRole = request.user_info.rol_id;
    const hasCustomRole = request.user_info.rol_personalizado_id;

    // Permitir acceso a Super Admin (1), Admin (2), o usuarios con rol personalizado
    if (userRole !== 1 && userRole !== 2 && !hasCustomRole) {
      return reply.code(403).send({ success: false, message: 'No tienes permisos para invitar usuarios' });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({ success: false, message: 'Configuracion de Supabase no disponible' });
    }

    // Usar request.user.id (ID del usuario autenticado en auth.users)
    const invitadoPorId = request.user.id;

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
        data: { nombre, apellido, rol_id, restaurante_id, invitado_por: invitadoPorId }
      });

      return reply.code(200).send({
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
        invitado_por: invitadoPorId,
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
      return reply.code(500).send({ success: false, message: 'Error al crear invitacion: ' + invError.message });
    }

    // Paso 4: Enviar invitacion via Supabase (esto crea usuario en auth.users)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        nombre,
        apellido,
        rol_id,
        restaurante_id,
        invitado_por: invitadoPorId,
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

    return reply.code(200).send({
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
    throw error;
  }
};

/**
 * Obtener lista de invitaciones (para mostrar pendientes en UI)
 */
export const getInvitaciones = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({ success: false, message: 'No autorizado' });
    }

    const userRole = request.user_info.rol_id;
    const hasCustomRole = request.user_info.rol_personalizado_id;

    // Permitir acceso a Super Admin (1), Admin (2), o usuarios con rol personalizado
    if (userRole !== 1 && userRole !== 2 && !hasCustomRole) {
      return reply.code(403).send({ success: false, message: 'Sin permisos' });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({ success: false, message: 'Configuracion no disponible' });
    }

    let query = supabaseAdmin
      .from('invitaciones')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtrar por restaurante si no es admin SOLO si el restaurante está asignado
    // Las invitaciones sin restaurante asignado deben ser visibles para admins
    if (userRole !== 1 && request.user_info.restaurante_id) {
      query = query.or(`restaurante_id.eq.${request.user_info.restaurante_id},restaurante_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      return reply.code(500).send({ success: false, message: 'Error', error: error.message });
    }

    return reply.code(200).send({ success: true, data: data || [] });

  } catch (error: any) {
    throw error;
  }
};

/**
 * Obtener solo invitaciones pendientes (para UI de pendientes)
 */
export const getInvitacionesPendientes = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({ success: false, message: 'No autorizado' });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({ success: false, message: 'Configuracion no disponible' });
    }

    let query = supabaseAdmin
      .from('invitaciones')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    // Filtrar por restaurante si no es admin
    if (request.user_info.rol_id !== 1 && request.user_info.restaurante_id) {
      query = query.eq('restaurante_id', request.user_info.restaurante_id);
    }

    const { data, error } = await query;

    if (error) {
      return reply.code(500).send({ success: false, message: 'Error', error: error.message });
    }

    return reply.code(200).send({ success: true, data: data || [] });

  } catch (error: any) {
    throw error;
  }
};

/**
 * Marcar invitacion como aceptada (llamar cuando usuario establece password)
 */
export const aceptarInvitacion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { email } = request.body as { email?: string };

    if (!email) {
      return reply.code(400).send({ success: false, message: 'Email es obligatorio' });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({ success: false, message: 'Configuracion no disponible' });
    }

    // Usar RPC para aceptar invitación y crear usuarios_info + usuarios_restaurantes
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('aceptar_invitacion', {
      p_email: email,
      p_user_id: null
    });

    if (rpcError) {
      console.error('Error en RPC aceptar_invitacion:', rpcError);
      return reply.code(500).send({ success: false, message: 'Error al procesar invitación', error: rpcError.message });
    }

    const result = rpcResult as any;
    if (result && result.success === false) {
      return reply.code(404).send({ success: false, message: result.message || 'Invitacion no encontrada' });
    }

    return reply.code(200).send({
      success: true,
      message: 'Invitacion aceptada',
      data: result
    });

  } catch (error: any) {
    throw error;
  }
};

/**
 * Cancelar/eliminar invitacion - Elimina solo datos del usuario
 * 1. RPC elimina de: invitaciones, usuarios_info, usuarios_restaurantes
 * 2. API Admin elimina de: auth.users
 * NOTA: Datos transaccionales (notificaciones, gastos, caja, pedidos) se conservan
 */
export const cancelarInvitacion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };

    if (!request.user_info) {
      return reply.code(403).send({ success: false, message: 'No autorizado' });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({ success: false, message: 'Configuracion no disponible' });
    }

    // Paso 1: Obtener email de la invitacion
    const { data: invitacion, error: invError } = await supabaseAdmin
      .from('invitaciones')
      .select('email')
      .eq('id', id)
      .single();

    if (invError || !invitacion) {
      return reply.code(404).send({ success: false, message: 'Invitacion no encontrada' });
    }

    const email = invitacion.email;

    // Paso 2: Buscar usuario en auth.users para obtener el ID
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = usersData?.users?.find(u => u.email === email);

    // Paso 3: Usar RPC para eliminar de tablas publicas (invitaciones, usuarios_info y relaciones)
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('eliminar_invitacion_completa', {
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

    return reply.code(200).send({
      success: true,
      message: 'Invitación eliminada correctamente',
      data: {
        email,
        user_id: authUser?.id || null,
        eliminado: {
          invitaciones: true,
          usuarios_info: true,
          usuarios_restaurantes: true,
          auth_users: authDeleted,
          nota: 'Datos transaccionales conservados (notificaciones, gastos, caja, pedidos, etc.)'
        },
        rpc_result: rpcData
      }
    });

  } catch (error: any) {
    console.error('Error al cancelar invitacion:', error);
    throw error;
  }
};

/**
 * Verificar token de invitacion
 */
export const verifyInvitacionToken = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { token } = request.params as { token: string };

    if (!token || !supabaseAdmin) {
      return reply.code(400).send({ success: false, message: 'Token requerido' });
    }

    const { data, error } = await supabaseAdmin
      .from('invitaciones')
      .select('*')
      .eq('token_invitacion', token)
      .eq('estado', 'pendiente')
      .single();

    if (error || !data) {
      return reply.code(404).send({ success: false, message: 'Token invalido' });
    }

    if (new Date() > new Date(data.fecha_expiracion)) {
      return reply.code(410).send({ success: false, message: 'Invitacion expirada' });
    }

    return reply.code(200).send({
      success: true,
      data: { email: data.email, nombre: data.nombre, apellido: data.apellido, estado: data.estado }
    });

  } catch (error: any) {
    throw error;
  }
};

// Alias para deleteInvitacion
export const deleteInvitacion = cancelarInvitacion;

/**
 * Reenviar invitación con control de límites
 * - Mínimo 5 minutos entre reenvíos
 * - Máximo 5 reenvíos por invitación
 */
export const resendInvitacion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };

    if (!request.user_info) {
      return reply.code(403).send({ success: false, message: 'No autorizado' });
    }

    const userRole = request.user_info.rol_id;
    const hasCustomRole = request.user_info.rol_personalizado_id;

    // Permitir acceso a Super Admin (1), Admin (2), o usuarios con rol personalizado
    if (userRole !== 1 && userRole !== 2 && !hasCustomRole) {
      return reply.code(403).send({ success: false, message: 'No tienes permisos para reenviar invitaciones' });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({ success: false, message: 'Configuracion de Supabase no disponible' });
    }

    // Obtener la invitación
    const { data: invitacion, error: invError } = await supabaseAdmin
      .from('invitaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (invError || !invitacion) {
      return reply.code(404).send({ success: false, message: 'Invitación no encontrada' });
    }

    // Verificar que esté pendiente
    if (invitacion.estado !== 'pendiente') {
      return reply.code(400).send({
        success: false,
        message: `No se puede reenviar una invitación con estado "${invitacion.estado}"`
      });
    }

    // Verificar límite de reenvíos (máximo 5)
    const maxReenvios = 5;
    const reenviosActuales = invitacion.reenvios_count || 0;
    if (reenviosActuales >= maxReenvios) {
      return reply.code(429).send({
        success: false,
        message: `Se ha alcanzado el límite máximo de ${maxReenvios} reenvíos para esta invitación`,
        data: { reenvios_count: reenviosActuales, max_reenvios: maxReenvios }
      });
    }

    // Verificar tiempo mínimo entre reenvíos (5 minutos)
    const minMinutosEntreReenvios = 5;
    const fechaUltimoEnvio = new Date(invitacion.fecha_envio || invitacion.created_at);
    const ahora = new Date();
    const minutosPasados = (ahora.getTime() - fechaUltimoEnvio.getTime()) / (1000 * 60);

    if (minutosPasados < minMinutosEntreReenvios) {
      const minutosRestantes = Math.ceil(minMinutosEntreReenvios - minutosPasados);
      return reply.code(429).send({
        success: false,
        message: `Debes esperar ${minutosRestantes} minuto(s) antes de reenviar`,
        data: {
          minutos_restantes: minutosRestantes,
          proximo_reenvio_disponible: new Date(fechaUltimoEnvio.getTime() + minMinutosEntreReenvios * 60 * 1000).toISOString()
        }
      });
    }

    // Actualizar invitación
    const { error: updateError } = await supabaseAdmin
      .from('invitaciones')
      .update({
        fecha_envio: new Date(),
        fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        reenvios_count: reenviosActuales + 1,
        updated_at: new Date()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error al actualizar invitación:', updateError);
      return reply.code(500).send({ success: false, message: 'Error al actualizar invitación' });
    }

    // Reenviar email via Supabase
    const { error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(invitacion.email, {
      data: {
        nombre: invitacion.nombre,
        apellido: invitacion.apellido,
        rol_id: invitacion.rol_id,
        restaurante_id: invitacion.restaurante_id,
        invitado_por: invitacion.invitado_por,
        invitacion_id: invitacion.id,
        token_invitacion: invitacion.token_invitacion
      }
    });

    if (authError) {
      console.error('Error al reenviar email:', authError);
      // No fallar completamente, la invitación ya fue actualizada
    }

    console.log('Invitación reenviada:', invitacion.email, '- Reenvío #', reenviosActuales + 1);

    return reply.code(200).send({
      success: true,
      message: 'Invitación reenviada exitosamente',
      data: {
        email: invitacion.email,
        invitacion_id: invitacion.id,
        reenvios_count: reenviosActuales + 1,
        max_reenvios: maxReenvios,
        reenvios_restantes: maxReenvios - (reenviosActuales + 1),
        proximo_reenvio_disponible: new Date(Date.now() + minMinutosEntreReenvios * 60 * 1000).toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error en resendInvitacion:', error);
    throw error;
  }
};
