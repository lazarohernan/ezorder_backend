import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../supabase/supabase';


export const obtenerUnidadesMedida = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user_info) return reply.code(403).send({ ok: false, message: 'No autorizado' });

  try {
    const client = supabaseAdmin!;
    const restauranteId = request.user_info.restaurante_id;

    let query = client.from('unidades_medida').select('*').order('nombre');

    if (restauranteId) {
      query = query.eq('restaurante_id', restauranteId);
    }

    const { data, error } = await query;
    if (error) throw error;

    reply.send({ ok: true, data: data || [] });
  } catch (error: any) {
    throw error;
  }
};

export const crearUnidadMedida = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user_info) return reply.code(403).send({ ok: false, message: 'No autorizado' });

  const { nombre, restaurante_id } = request.body as { nombre?: string; restaurante_id?: string };

  if (!nombre || !restaurante_id) {
    return reply.code(400).send({ ok: false, message: 'nombre y restaurante_id son requeridos' });
  }

  try {
    const client = supabaseAdmin!;
    const nombreUpper = nombre.trim().toUpperCase();

    const { data, error } = await client
      .from('unidades_medida')
      .insert({ nombre: nombreUpper, restaurante_id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return reply.code(409).send({ ok: false, message: 'Esta unidad de medida ya existe para este restaurante' });
      }
      throw error;
    }

    return reply.code(201).send({ ok: true, data, message: 'Unidad de medida creada' });
  } catch (error: any) {
    throw error;
  }
};

export const actualizarUnidadMedida = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user_info) return reply.code(403).send({ ok: false, message: 'No autorizado' });

  const { id } = request.params as { id: string };
  const { nombre } = request.body as { nombre?: string };

  if (!nombre) {
    return reply.code(400).send({ ok: false, message: 'nombre es requerido' });
  }

  try {
    const client = supabaseAdmin!;
    const nombreUpper = nombre.trim().toUpperCase();

    const { data, error } = await client
      .from('unidades_medida')
      .update({ nombre: nombreUpper })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return reply.code(409).send({ ok: false, message: 'Esta unidad de medida ya existe para este restaurante' });
      }
      throw error;
    }

    reply.send({ ok: true, data, message: 'Unidad de medida actualizada' });
  } catch (error: any) {
    throw error;
  }
};

export const eliminarUnidadMedida = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user_info) return reply.code(403).send({ ok: false, message: 'No autorizado' });

  const { id } = request.params as { id: string };

  try {
    const client = supabaseAdmin!;
    const { error } = await client.from('unidades_medida').delete().eq('id', id);
    if (error) throw error;

    reply.send({ ok: true, message: 'Unidad de medida eliminada' });
  } catch (error: any) {
    throw error;
  }
};
