import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los menús
export const getMenus = async (req: Request, res: Response) => {
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener menús",
    });
    return;
  }
};

// Obtener menús por ID de restaurante
export const getMenusByRestauranteId = async (req: Request, res: Response) => {
  const { restaurante_id } = req.params;

  try {
    console.log(
      `Usuario ${req.user?.id} solicitó los menús del restaurante ${restaurante_id}`
    );

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("restaurante_id", restaurante_id)
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener menús del restaurante",
    });
    return;
  }
};

// Obtener un menú por ID
export const getMenuById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    console.log(`Usuario ${req.user?.id} solicitó el menú ${id}`);

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Menú no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener menú",
    });
    return;
  }
};

// Crear un nuevo menú
export const createMenu = async (req: Request, res: Response) => {
  const {
    restaurante_id,
    num_menu,
    nombre,
    descripcion,
    otra_info,
    precio,
    imagen,
    porcentaje_impuesto,
    es_para_cocina,
    activo,
    es_exento,
    es_exonerado,
  } = req.body;

  // Verificar campos obligatorios
  if (!restaurante_id || !nombre) {
    res.status(400).json({
      success: false,
      message: "El restaurante_id y nombre son obligatorios",
    });
    return;
  }

  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .insert([
        {
          restaurante_id,
          num_menu,
          nombre,
          descripcion,
          otra_info,
          precio,
          imagen,
          porcentaje_impuesto,
          es_para_cocina,
          activo,
          es_exento,
          es_exonerado,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Menú creado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al crear menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear menú",
    });
    return;
  }
};

// Actualizar un menú
export const updateMenu = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    restaurante_id,
    num_menu,
    nombre,
    descripcion,
    otra_info,
    precio,
    imagen,
    porcentaje_impuesto,
    es_para_cocina,
    activo,
    es_exento,
    es_exonerado,
  } = req.body;

  // Verificar que se proporcione al menos un campo para actualizar
  if (
    !restaurante_id &&
    !num_menu &&
    !nombre &&
    !descripcion &&
    otra_info === undefined &&
    precio === undefined &&
    !imagen &&
    porcentaje_impuesto === undefined &&
    es_para_cocina === undefined &&
    activo === undefined
  ) {
    res.status(400).json({
      success: false,
      message: "Se debe proporcionar al menos un campo para actualizar",
    });
    return;
  }

  try {
    // Crear objeto con solo los campos proporcionados
    const updateFields: any = {};
    if (restaurante_id) updateFields.restaurante_id = restaurante_id;
    if (num_menu !== undefined) updateFields.num_menu = num_menu;
    if (nombre) updateFields.nombre = nombre;
    if (descripcion !== undefined) updateFields.descripcion = descripcion;
    if (otra_info !== undefined) updateFields.otra_info = otra_info;
    if (precio !== undefined) updateFields.precio = precio;
    if (imagen !== undefined) updateFields.imagen = imagen;
    if (porcentaje_impuesto !== undefined)
      updateFields.porcentaje_impuesto = porcentaje_impuesto;
    if (es_para_cocina !== undefined)
      updateFields.es_para_cocina = es_para_cocina;
    if (activo !== undefined) updateFields.activo = activo;
    if (es_exento !== undefined) updateFields.es_exento = es_exento;
    if (es_exonerado !== undefined) updateFields.es_exonerado = es_exonerado;

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Menú no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Menú actualizado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar menú",
    });
    return;
  }
};

// Eliminar un menú
export const deleteMenu = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const client = supabaseAdmin || supabase;
    //const { error } = await client.from("menu").delete().eq("id", id);

    // Cambiar el estado activo a false
    const { error } = await client
      .from("menu")
      .update({ activo: false })
      .eq("id", id);

    if (error) {
      if (error.code === "23503") {
        res.status(400).json({
          success: false,
          message:
            "No se puede eliminar este menú porque tiene registros relacionados",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Menú eliminado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar menú",
    });
    return;
  }
};
