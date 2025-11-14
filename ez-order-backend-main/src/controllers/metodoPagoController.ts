import { Request, Response } from "express";
import { getClientWithRLS, getAdminClient } from "../utils/supabaseHelpers";

// Helper para verificar si es Super Admin
const isSuperAdmin = (userInfo: any): boolean => {
  return userInfo?.rol_id === 1;
};

export const getMetodosPago = async (req: Request, res: Response) => {
  try {
    const client = await getClientWithRLS(req);
    const { data, error } = await client
      .from("metodos_de_pago")
      .select("*")
      .order("metodo", { ascending: true });

    if (error) throw error;

    res.status(200).json({ success: true, data });
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
    const client = await getClientWithRLS(req);
    const { data, error } = await client
      .from("metodos_de_pago")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Método de pago no encontrado",
        });
      }
      throw error;
    }

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el método de pago",
    });
  }
};

export const createMetodoPago = async (req: Request, res: Response) => {
  const { metodo, descripcion } = req.body;

  if (!metodo?.trim()) {
    return res.status(400).json({
      success: false,
      message: "El campo 'metodo' es requerido",
    });
  }

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!isSuperAdmin(req.user_info)) {
      return res.status(403).json({
        success: false,
        message: "Solo el Super Admin puede crear métodos de pago",
      });
    }

    const client = await getClientWithRLS(req);
    const { data, error } = await client
      .from("metodos_de_pago")
      .insert([{
        metodo: metodo.trim(),
        descripcion: descripcion?.trim() || null,
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Método de pago creado exitosamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al crear método de pago:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear el método de pago",
    });
  }
};

export const updateMetodoPago = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { metodo, descripcion } = req.body;

  if (!metodo?.trim()) {
    return res.status(400).json({
      success: false,
      message: "El campo 'metodo' es requerido",
    });
  }

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!isSuperAdmin(req.user_info)) {
      return res.status(403).json({
        success: false,
        message: "Solo el Super Admin puede actualizar métodos de pago",
      });
    }

    const client = await getClientWithRLS(req);
    const { data, error } = await client
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
        return res.status(404).json({
          success: false,
          message: "Método de pago no encontrado",
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Método de pago actualizado exitosamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al actualizar método de pago:", error);
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
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!isSuperAdmin(req.user_info)) {
      return res.status(403).json({
        success: false,
        message: "Solo el Super Admin puede eliminar métodos de pago",
      });
    }

    // Verificar si hay pedidos usando este método (usar admin para bypassear RLS)
    const adminClient = getAdminClient();
    const { data: pedidosConMetodo } = await adminClient
      .from("pedidos")
      .select("id")
      .eq("metodo_pago_id", id)
      .limit(1);

    if (pedidosConMetodo && pedidosConMetodo.length > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar el método de pago porque está siendo usado en pedidos existentes",
      });
    }

    const { error } = await adminClient
      .from("metodos_de_pago")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Método de pago no encontrado",
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Método de pago eliminado exitosamente",
    });
  } catch (error: any) {
    console.error("Error al eliminar método de pago:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar el método de pago",
    });
  }
};
