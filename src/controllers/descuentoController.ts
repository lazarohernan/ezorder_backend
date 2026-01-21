import { Request, Response } from 'express';
import { supabase as client } from '../supabase/supabase';

// Obtener todos los descuentos
export const getDescuentos = async (req: Request, res: Response) => {
  try {
    const { data, error } = await client
      .from('descuentos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('Error al obtener descuentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener descuentos',
      error: error.message
    });
  }
};

// Obtener descuento por ID
export const getDescuentoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await client
      .from('descuentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Descuento no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error: any) {
    console.error('Error al obtener descuento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener descuento',
      error: error.message
    });
  }
};

// Obtener solo descuentos activos
export const getDescuentosActivos = async (req: Request, res: Response) => {
  try {
    const { data, error } = await client
      .from('descuentos')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('Error al obtener descuentos activos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener descuentos activos',
      error: error.message
    });
  }
};

// Crear nuevo descuento
export const createDescuento = async (req: Request, res: Response) => {
  try {
    const { nombre, porcentaje, activo = true } = req.body;

    // Validaciones
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre del descuento es requerido'
      });
    }

    if (porcentaje === undefined || porcentaje === null || porcentaje <= 0 || porcentaje > 100) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje debe ser un número entre 1 y 100'
      });
    }

    const { data, error } = await client
      .from('descuentos')
      .insert({
        nombre: nombre.trim(),
        porcentaje: Number(porcentaje),
        activo: Boolean(activo)
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: data,
      message: 'Descuento creado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al crear descuento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear descuento',
      error: error.message
    });
  }
};

// Actualizar descuento existente
export const updateDescuento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, porcentaje, activo } = req.body;

    // Validaciones
    if (nombre !== undefined && nombre.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre del descuento no puede estar vacío'
      });
    }

    if (porcentaje !== undefined && (porcentaje <= 0 || porcentaje > 100)) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje debe ser un número entre 1 y 100'
      });
    }

    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre.trim();
    if (porcentaje !== undefined) updateData.porcentaje = Number(porcentaje);
    if (activo !== undefined) updateData.activo = Boolean(activo);

    const { data, error } = await client
      .from('descuentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Descuento no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: data,
      message: 'Descuento actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al actualizar descuento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar descuento',
      error: error.message
    });
  }
};

// Eliminar descuento
export const deleteDescuento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await client
      .from('descuentos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Descuento eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar descuento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar descuento',
      error: error.message
    });
  }
};
