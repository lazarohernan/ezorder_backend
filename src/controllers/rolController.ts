import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los roles
export const getRoles = async (req: Request, res: Response) => {
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("rol")
      .select("*")
      .order("rol", { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener roles",
    });
    return;
  }
};

// Obtener un rol por ID
export const getRolById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    console.log(`Usuario ${req.user?.id} solicitó el rol ${id}`);

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("rol")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Rol no encontrado",
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
      message: error.message || "Error al obtener rol",
    });
    return;
  }
};

// Crear un nuevo rol
export const createRol = async (req: Request, res: Response) => {
  const { rol } = req.body;

  // Verificar que el nombre del rol sea proporcionado
  if (!rol) {
    res.status(400).json({
      success: false,
      message: "El nombre del rol es obligatorio",
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

    // Solo Super Admin puede crear roles básicos
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      res.status(403).json({
        success: false,
        message: "Solo el Super Admin puede crear roles",
      });
      return;
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("rol")
      .insert([{ rol }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Rol creado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al crear rol:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear rol",
    });
    return;
  }
};

// Actualizar un rol
export const updateRol = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.body;

  // Verificar que se proporcione el campo para actualizar
  if (!rol) {
    res.status(400).json({
      success: false,
      message: "Se debe proporcionar el nombre del rol para actualizar",
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

    // Solo Super Admin puede actualizar roles básicos
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      res.status(403).json({
        success: false,
        message: "Solo el Super Admin puede actualizar roles",
      });
      return;
    }

    console.log(`Usuario ${req.user_info.id} está actualizando el rol ${id}`);

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("rol")
      .update({ rol })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Rol no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Rol actualizado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar rol",
    });
    return;
  }
};

// Eliminar un rol
export const deleteRol = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    // Solo Super Admin puede eliminar roles básicos
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      res.status(403).json({
        success: false,
        message: "Solo el Super Admin puede eliminar roles",
      });
      return;
    }

    console.log(`Usuario ${req.user_info.id} está eliminando el rol ${id}`);

    const { error } = await supabase.from("rol").delete().eq("id", id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Rol eliminado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar rol",
    });
    return;
  }
};
