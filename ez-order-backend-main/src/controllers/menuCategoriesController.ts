import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

export const getMenuCategories = async (_req: Request, res: Response) => {
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu_categorias")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al obtener categorías del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener categorías del menú",
    });
    return;
  }
};

export const createMenuCategory = async (req: Request, res: Response) => {
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    res.status(400).json({
      success: false,
      message: "El nombre de la categoría es obligatorio",
    });
    return;
  }

  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu_categorias")
      .insert([{ nombre, descripcion }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Categoría creada correctamente",
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al crear categoría del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear categoría del menú",
    });
    return;
  }
};

export const updateMenuCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  if (!nombre && descripcion === undefined) {
    res.status(400).json({
      success: false,
      message: "Debes proporcionar al menos un campo para actualizar",
    });
    return;
  }

  const updateFields: Record<string, unknown> = {};
  if (nombre !== undefined) updateFields.nombre = nombre;
  if (descripcion !== undefined) updateFields.descripcion = descripcion;

  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu_categorias")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Categoría no encontrada",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Categoría actualizada correctamente",
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al actualizar categoría del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar categoría del menú",
    });
    return;
  }
};

export const deleteMenuCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Verificar si hay productos asociados a esta categoría
    const { data: menuItems, error: checkError } = await supabase
      .from("menu")
      .select("id")
      .eq("categoria_id", id)
      .limit(1);

    if (checkError) throw checkError;

    if (menuItems && menuItems.length > 0) {
      res.status(400).json({
        success: false,
        message: "No se puede eliminar esta categoría porque tiene productos asociados. Primero reasigna los productos a otra categoría.",
        hasAssociatedItems: true,
      });
      return;
    }

    // Si no hay productos asociados, proceder con la eliminación
    const { error } = await supabase.from("menu_categorias").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Categoría no encontrada",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Categoría eliminada correctamente",
    });
    return;
  } catch (error: any) {
    console.error("Error al eliminar categoría del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar categoría del menú",
    });
    return;
  }
};
