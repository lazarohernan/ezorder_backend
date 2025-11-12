import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los clientes
export const getClientes = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    // Obtener el rol del usuario
    const id_rol = req.user_info?.rol_id ?? 3;

    let data: any;
    let error: any;

    // USAR supabaseAdmin para bypassear RLS - el backend controla los permisos
    const client = supabaseAdmin || supabase;

    // Si el usuario es Super Admin (rol_id=1), obtener todos los clientes
    if (id_rol === 1) {
      const { data: adminData, error: adminError } = await client
        .from("clientes")
        .select("*, restaurantes(nombre_restaurante)")
        .order("nombre_cliente", { ascending: true });
      data = adminData;
      error = adminError;
    } 
    // Si es Admin/Propietario (rol_id=2), obtener clientes de TODOS sus restaurantes
    else if (id_rol === 2) {
      // Obtener los IDs de todos los restaurantes del Admin
      const { data: userRestaurants, error: restaurantsError } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      if (restaurantsError) {
        error = restaurantsError;
        data = null;
      } else {
        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
        
        if (restaurantIds.length === 0) {
          data = [];
          error = null;
        } else {
          // Obtener clientes de todos los restaurantes del Admin
          const { data: clientesData, error: clientesError } = await client
            .from("clientes")
            .select("*, restaurantes(nombre_restaurante)")
            .in("restaurante_id", restaurantIds)
            .order("nombre_cliente", { ascending: true });
          data = clientesData;
          error = clientesError;
        }
      }
    } 
    // Usuarios normales solo ven clientes de su restaurante asignado
    else {
      const restaurante_id = req.user_info?.restaurante_id;

      if (!restaurante_id) {
        res.status(403).json({
          success: false,
          message: "El usuario no tiene un restaurante asignado",
        });
        return;
      }

      const { data: userClientes, error: userError } = await client
        .from("clientes")
        .select("*, restaurantes(nombre_restaurante)")
        .eq("restaurante_id", restaurante_id)
        .order("nombre_cliente", { ascending: true });
      data = userClientes;
      error = userError;
    }

    if (error) {
      console.log("error:", error);
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
      message: error.message || "Error al obtener clientes",
    });
    return;
  }
};

// Obtener todos los clientes por restaurante
export const getClientesByRestauranteId = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    const { restaurante_id } = req.params;
    const id_rol = req.user_info?.rol_id ?? 3;

    // Verificar permisos según rol
    if (id_rol === 1) {
      // Super Admin puede ver todos los clientes
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const adminClient = supabaseAdmin || supabase;
      const { data: userRestaurants, error: restaurantsError } = await adminClient
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      if (restaurantsError) {
        res.status(500).json({
          success: false,
          message: "Error al verificar permisos",
        });
        return;
      }

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden ver su restaurante
      if (req.user_info.restaurante_id !== restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
        return;
      }
    }

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("clientes")
      .select("*, restaurantes(nombre_restaurante)")
      .eq("restaurante_id", restaurante_id)
      .order("nombre_cliente", { ascending: true });

    if (error) {
      console.log("error:", error);
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
      message: error.message || "Error al obtener clientes",
    });
    return;
  }
};

// Obtener un cliente por ID
export const getClienteById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    console.log(`Usuario ${req.user?.id} solicitó el cliente ${id}`);

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("clientes")
      .select("*, restaurantes(nombre_restaurante)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Cliente no encontrado",
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
      message: error.message || "Error al obtener cliente",
    });
    return;
  }
};

// Crear un nuevo cliente
export const createCliente = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    const {
      restaurante_id,
      nombre_cliente,
      rtn_cliente,
      tel_cliente,
      correo_cliente,
    } = req.body;

    // Verificar que los campos obligatorios sean proporcionados
    if (!nombre_cliente || !restaurante_id) {
      res.status(400).json({
        success: false,
        message: "El nombre del cliente y el id del restaurante son obligatorios",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;

    if (id_rol === 1) {
      // Super Admin puede crear clientes en cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const adminClient = supabaseAdmin || supabase;
      const { data: userRestaurants, error: restaurantsError } = await adminClient
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      if (restaurantsError) {
        res.status(500).json({
          success: false,
          message: "Error al verificar permisos",
        });
        return;
      }

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden crear clientes en su restaurante
      if (req.user_info.restaurante_id !== restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No puedes crear clientes para este restaurante",
        });
        return;
      }
    }

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("clientes")
      .insert([
        {
          restaurante_id,
          nombre_cliente,
          rtn_cliente,
          tel_cliente,
          correo_cliente,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Cliente creado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al crear cliente:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear cliente",
    });
    return;
  }
};

// Actualizar un cliente
export const updateCliente = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    restaurante_id,
    nombre_cliente,
    rtn_cliente,
    tel_cliente,
    correo_cliente,
  } = req.body;

  // Verificar que se proporcione al menos un campo para actualizar
  if (
    !nombre_cliente &&
    restaurante_id === undefined &&
    rtn_cliente === undefined &&
    tel_cliente === undefined &&
    correo_cliente === undefined
  ) {
    res.status(400).json({
      success: false,
      message: "Se debe proporcionar al menos un campo para actualizar",
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

    console.log(`Usuario ${req.user_info.id} está actualizando el cliente ${id}`);

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;

    // Primero obtener el cliente para verificar permisos
    const { data: clienteExistente, error: errorBuscar } = await client
      .from("clientes")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !clienteExistente) {
      res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier cliente
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del cliente
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(clienteExistente.restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este cliente",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden actualizar clientes de su restaurante
      if (req.user_info.restaurante_id !== clienteExistente.restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este cliente",
        });
        return;
      }
    }

    // Prevenir cambio de restaurante_id si se intenta modificar
    if (restaurante_id && restaurante_id !== clienteExistente.restaurante_id) {
      res.status(403).json({
        success: false,
        message: "No puedes cambiar el restaurante de un cliente",
      });
      return;
    }

    // Crear objeto con solo los campos proporcionados
    const updateFields: any = {};
    if (nombre_cliente) updateFields.nombre_cliente = nombre_cliente;
    if (rtn_cliente !== undefined) updateFields.rtn_cliente = rtn_cliente;
    if (tel_cliente !== undefined) updateFields.tel_cliente = tel_cliente;
    if (correo_cliente !== undefined)
      updateFields.correo_cliente = correo_cliente;

    const { data, error } = await client
      .from("clientes")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Cliente no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Cliente actualizado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar cliente",
    });
    return;
  }
};

// Eliminar un cliente
export const deleteCliente = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    console.log(`Usuario ${req.user_info.id} está eliminando el cliente ${id}`);

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;

    // Primero obtener el cliente para verificar permisos
    const { data: clienteExistente, error: errorBuscar } = await client
      .from("clientes")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !clienteExistente) {
      res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier cliente
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del cliente
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(clienteExistente.restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este cliente",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden eliminar clientes de su restaurante
      if (req.user_info.restaurante_id !== clienteExistente.restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este cliente",
        });
        return;
      }
    }

    const { error } = await client.from("clientes").delete().eq("id", id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Cliente eliminado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar cliente",
    });
    return;
  }
};
