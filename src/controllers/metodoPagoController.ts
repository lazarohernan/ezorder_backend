import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

export const getMetodosPago = async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin no está configurado");
    }

    const { data, error } = await supabaseAdmin
      .from("metodos_de_pago")
      .select("*")
      .order("metodo", { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error al obtener métodos de pago:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los métodos de pago",
    });
  }
};

export const getMetodoPagoById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin no está configurado");
    }

    const { data, error } = await supabaseAdmin
      .from("metodos_de_pago")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Método de pago no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el método de pago",
    });
  }
};

export const createMetodoPago = async (req: Request, res: Response) => {
  const { metodo, descripcion } = req.body;

  if (!metodo) {
    res.status(400).json({
      success: false,
      message: "El campo 'metodo' es requerido",
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
    if (id_rol !== 1) {
      res.status(403).json({
        success: false,
        message: "Solo el Super Admin puede crear métodos de pago",
      });
      return;
    }

    const { data, error } = await supabase
      .from("metodos_de_pago")
      .insert([
        {
          metodo: metodo.trim(),
          descripcion: descripcion?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: "Método de pago creado exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear el método de pago",
    });
  }
};

export const updateMetodoPago = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { metodo, descripcion } = req.body;

  if (!metodo) {
    res.status(400).json({
      success: false,
      message: "El campo 'metodo' es requerido",
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
    if (id_rol !== 1) {
      res.status(403).json({
        success: false,
        message: "Solo el Super Admin puede actualizar métodos de pago",
      });
      return;
    }

    const { data, error } = await supabase
      .from("metodos_de_pago")
      .update({
        metodo: metodo.trim(),
        descripcion: descripcion?.trim() || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Método de pago no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
      message: "Método de pago actualizado exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar el método de pago",
    });
  }
};

export const deleteMetodoPago = async (req: Request, res: Response) => {
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
    if (id_rol !== 1) {
      res.status(403).json({
        success: false,
        message: "Solo el Super Admin puede eliminar métodos de pago",
      });
      return;
    }

    const { data: pedidosConMetodo, error: errorVerificacion } = await supabase
      .from("pedidos")
      .select("id")
      .eq("metodo_pago_id", id)
      .limit(1);

    if (errorVerificacion) throw errorVerificacion;

    if (pedidosConMetodo && pedidosConMetodo.length > 0) {
      res.status(400).json({
        success: false,
        message:
          "No se puede eliminar el método de pago porque está siendo usado en pedidos existentes",
      });
      return;
    }

    const { error } = await supabase
      .from("metodos_de_pago")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Método de pago no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Método de pago eliminado exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar el método de pago",
    });
  }
};
