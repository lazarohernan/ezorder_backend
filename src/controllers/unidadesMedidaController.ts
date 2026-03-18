import { Request, Response } from 'express';
import { supabaseAdmin } from '../supabase/supabase';


export const obtenerUnidadesMedida = async (req: Request, res: Response) => {
  if (!req.user_info) return res.status(403).json({ ok: false, message: 'No autorizado' });

  try {
    const client = supabaseAdmin!;
    const restauranteId = req.user_info.restaurante_id;

    let query = client.from('unidades_medida').select('*').order('nombre');

    if (restauranteId) {
      query = query.eq('restaurante_id', restauranteId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ ok: true, data: data || [] });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: 'Error al obtener unidades de medida', error: error.message });
  }
};

export const crearUnidadMedida = async (req: Request, res: Response) => {
  if (!req.user_info) return res.status(403).json({ ok: false, message: 'No autorizado' });

  const { nombre, restaurante_id } = req.body;

  if (!nombre || !restaurante_id) {
    return res.status(400).json({ ok: false, message: 'nombre y restaurante_id son requeridos' });
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
        return res.status(409).json({ ok: false, message: 'Esta unidad de medida ya existe para este restaurante' });
      }
      throw error;
    }

    res.status(201).json({ ok: true, data, message: 'Unidad de medida creada' });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: 'Error al crear unidad de medida', error: error.message });
  }
};

export const actualizarUnidadMedida = async (req: Request, res: Response) => {
  if (!req.user_info) return res.status(403).json({ ok: false, message: 'No autorizado' });

  const { id } = req.params;
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ ok: false, message: 'nombre es requerido' });
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
        return res.status(409).json({ ok: false, message: 'Esta unidad de medida ya existe para este restaurante' });
      }
      throw error;
    }

    res.json({ ok: true, data, message: 'Unidad de medida actualizada' });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: 'Error al actualizar unidad de medida', error: error.message });
  }
};

export const eliminarUnidadMedida = async (req: Request, res: Response) => {
  if (!req.user_info) return res.status(403).json({ ok: false, message: 'No autorizado' });

  const { id } = req.params;

  try {
    const client = supabaseAdmin!;
    const { error } = await client.from('unidades_medida').delete().eq('id', id);
    if (error) throw error;

    res.json({ ok: true, message: 'Unidad de medida eliminada' });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: 'Error al eliminar unidad de medida', error: error.message });
  }
};
