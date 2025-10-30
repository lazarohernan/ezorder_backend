import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los pedidos
export const getPedidos = async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    // Usar supabaseAdmin para bypass de RLS en operaciones del backend
    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        `
        *,
        clientes(*),
        restaurantes(id, nombre_restaurante)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los pedidos",
    });
  }
};

// Obtener un pedido por ID
export const getPedidoById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        `
        *,
        clientes(*),
        restaurantes(id, nombre_restaurante)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Pedido no encontrado",
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
      message: error.message || "Error al obtener el pedido",
    });
  }
};

// Obtener pedidos por restaurante
export const getPedidosByRestauranteId = async (
  req: Request,
  res: Response
) => {
  const { restaurante_id } = req.params;

  console.log("restaurante_id", restaurante_id);

  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    // Usar supabaseAdmin para bypass de RLS en operaciones del backend
    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        `
        *,
        clientes(*),
        restaurantes(id, nombre_restaurante)
      `
      )
      .eq("restaurante_id", restaurante_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error al obtener pedidos por restaurante:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los pedidos del restaurante",
    });
  }
};

// Crear un nuevo pedido
export const createPedido = async (req: Request, res: Response) => {
  const {
    restaurante_id,
    cliente_id,
    usuario_id,
    mesa,
    tipo_pedido = "local",
    estado_pedido = "pendiente",
    notas,
    total = 0,
    subtotal = 0,
    impuesto = 0,
    descuento = 0,
    metodo_pago_id,
    pagado = false,
    fecha_entrega,
    direccion_entrega,
    importe_gravado,
    importe_exento,
    importe_exonerado,
  } = req.body;

  if (!metodo_pago_id) {
    res.status(400).json({
      success: false,
      message: "El método de pago es requerido",
    });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("pedidos")
      .insert([
        {
          restaurante_id,
          cliente_id: cliente_id || null,
          usuario_id: usuario_id || null,
          mesa,
          tipo_pedido,
          estado_pedido,
          notas,
          total,
          subtotal,
          impuesto,
          descuento,
          metodo_pago_id,
          pagado,
          fecha_entrega,
          direccion_entrega,
          importe_gravado,
          importe_exento,
          importe_exonerado,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: "Pedido creado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear el pedido",
    });
    return;
  }
};

// Actualizar un pedido
export const updatePedido = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabase
      .from("pedidos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Pedido no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
      message: "Pedido actualizado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar el pedido",
    });
    return;
  }
};

// Eliminar un pedido
export const deletePedido = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from("pedidos").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Pedido no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Pedido eliminado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar el pedido",
    });
    return;
  }
};
