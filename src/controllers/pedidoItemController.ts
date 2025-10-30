import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los ítems de pedido
export const getPedidoItems = async (req: Request, res: Response) => {
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("pedido_items")
      .select(
        `
        *,
        menu(id, nombre, descripcion, imagen),
        pedidos(
          id,
          estado,
          restaurante_id,
          restaurantes(nombre_restaurante)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los ítems de pedido",
    });
    return;
  }
};

// Obtener un ítem de pedido por ID
export const getPedidoItemById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("pedido_items")
      .select(
        `
        *,
        menu(id, nombre, descripcion, imagen),
        pedidos(
          id,
          estado,
          restaurante_id,
          restaurantes(nombre_restaurante)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Ítem de pedido no encontrado",
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
      message: error.message || "Error al obtener el ítem de pedido",
    });
    return;
  }
};

// Obtener ítems por pedido
export const getItemsByPedidoId = async (req: Request, res: Response) => {
  const { pedido_id } = req.params;

  console.log("Buscando items para pedido_id:", pedido_id);

  try {
    // Primero intentamos con el query simple sin relaciones para diagnosticar
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("pedido_items")
      .select("*")
      .eq("pedido_id", pedido_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error de Supabase:", error);
      throw error;
    }

    console.log("Items encontrados:", data?.length || 0);

    res.status(200).json({
      success: true,
      data: data || [],
    });
    return;
  } catch (error: any) {
    console.error("Error completo:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los ítems del pedido",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
    return;
  }
};

// Crear un nuevo ítem de pedido
export const createPedidoItem = async (req: Request, res: Response) => {
  const {
    pedido_id,
    menu_id,
    nombre_menu,
    cantidad = 1,
    precio_unitario,
    impuesto_unitario = 0,
    total_item,
    notas,
    enviado_a_cocina = false,
  } = req.body;

  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("pedido_items")
      .insert([
        {
          pedido_id,
          menu_id,
          nombre_menu,
          cantidad,
          precio_unitario,
          impuesto_unitario,
          total_item: total_item || precio_unitario * cantidad,
          notas,
          enviado_a_cocina,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: "Ítem de pedido creado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear el ítem de pedido",
    });
    return;
  }
};

// Actualizar un ítem de pedido
export const updatePedidoItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  // Si se actualiza la cantidad o el precio, recalcular el total
  if (updates.cantidad || updates.precio_unitario) {
    const cantidad = updates.cantidad || req.body.cantidad_actual;
    const precio = updates.precio_unitario || req.body.precio_actual;
    updates.total_item = cantidad * precio;
  }

  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("pedido_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
      message: "Ítem de pedido actualizado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar el ítem de pedido",
    });
    return;
  }
};

// Eliminar un ítem de pedido
export const deletePedidoItem = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from("pedido_items").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Ítem de pedido eliminado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar el ítem de pedido",
    });
    return;
  }
};

// Marcar ítem como enviado a cocina
export const marcarEnviadoACocina = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("pedido_items")
      .update({ enviado_a_cocina: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
      message: "Ítem marcado como enviado a cocina",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar el estado del ítem",
    });
    return;
  }
};

// Crear múltiples ítems de pedido en batch
export const createPedidoItemsBatch = async (req: Request, res: Response) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      success: false,
      message: "Se requiere un array de items no vacío",
    });
    return;
  }

  try {
    // Preparar los items para inserción, calculando totales si no se proporcionan
    const itemsToInsert = items.map((item: any) => {
      const {
        pedido_id,
        menu_id,
        nombre_menu,
        cantidad = 1,
        precio_unitario,
        impuesto_unitario = 0,
        total_item,
        notas,
        enviado_a_cocina = false,
      } = item;

      return {
        pedido_id,
        menu_id,
        nombre_menu,
        cantidad,
        precio_unitario,
        impuesto_unitario,
        total_item:
          total_item ||
          precio_unitario * cantidad + impuesto_unitario * cantidad,
        notas,
        enviado_a_cocina,
      };
    });

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("pedido_items")
      .insert(itemsToInsert)
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: `${data.length} ítems de pedido creados exitosamente`,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear los ítems de pedido",
    });
    return;
  }
};
