import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los restaurantes
export const getRestaurantes = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    // Verificar si es Super Admin (rol_id=1)
    const esSuperAdmin = req.user_info?.rol_id === 1 || req.user_info?.es_super_admin;
    
    // Verificar si es Admin/Propietario (rol_id=2)
    const esAdmin = req.user_info?.rol_id === 2;

    let data: any;
    let error: any;

    // Si el usuario es Super Admin, obtener todos los restaurantes
    if (esSuperAdmin) {
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from("restaurantes")
        .select("*")
        .order("nombre_restaurante", { ascending: true });
      data = adminData;
      error = adminError;
    } 
    // Si es Admin/Propietario, obtener solo los restaurantes donde es propietario
    else if (esAdmin) {
      const { data: userRestaurants, error: userError } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select(`
          restaurante_id,
          restaurantes (
            id,
            nombre_restaurante,
            direccion_restaurante,
            logo_restaurante,
            propietario_id,
            created_at
          )
        `)
        .eq("usuario_id", req.user_info.id)
        .eq("es_propietario", true);

      if (userError) {
        error = userError;
        data = null;
      } else {
        // Extraer solo los datos de restaurantes
        data = userRestaurants?.map((ur: any) => ur.restaurantes) || [];
      }
    } 
    // Usuarios normales solo ven su restaurante asignado
    else {
      const restaurante_id = req.user_info?.restaurante_id;
      
      if (!restaurante_id) {
        res.status(403).json({
          success: false,
          message: "El usuario no tiene un restaurante asignado",
        });
        return;
      }

      const { data: userRestaurant, error: userError } = await supabaseAdmin
        .from("restaurantes")
        .select("*")
        .eq("id", restaurante_id)
        .order("nombre_restaurante", { ascending: true });
      data = userRestaurant;
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
      message: error.message || "Error al obtener restaurantes",
    });
    return;
  }
};

// Obtener un restaurante por ID
export const getRestauranteById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    console.log(`Usuario ${req.user?.id} solicitó el restaurante ${id}`);

    const { data, error } = await supabaseAdmin
      .from("restaurantes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Restaurante no encontrado",
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
      message: error.message || "Error al obtener restaurante",
    });
    return;
  }
};

// Crear un nuevo restaurante
export const createRestaurante = async (req: Request, res: Response) => {
  const { nombre_restaurante, direccion_restaurante, logo_restaurante } =
    req.body;

  // Verificar que el nombre del restaurante sea proporcionado
  if (!nombre_restaurante || nombre_restaurante.trim() === '') {
    res.status(400).json({
      success: false,
      message: "El nombre del restaurante es obligatorio",
    });
    return;
  }

  try {
    if (!req.user_info) {
      res.status(401).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    console.log(`Usuario ${req.user_info.id} (rol_id: ${req.user_info.rol_id}) está creando un restaurante`);

    // Insertar el restaurante con los datos limpios
    const restauranteData: any = {
      nombre_restaurante: nombre_restaurante.trim(),
    };

    // Solo agregar campos opcionales si tienen valor
    if (direccion_restaurante && direccion_restaurante.trim() !== '') {
      restauranteData.direccion_restaurante = direccion_restaurante.trim();
    }

    if (logo_restaurante && logo_restaurante.trim() !== '') {
      restauranteData.logo_restaurante = logo_restaurante.trim();
    }

    // Si el usuario es Admin/Propietario (rol_id=2), asignar como propietario
    if (req.user_info.rol_id === 2) {
      restauranteData.propietario_id = req.user_info.id;
      console.log(`Asignando propietario_id: ${req.user_info.id}`);
    }

    const { data, error } = await supabaseAdmin
      .from("restaurantes")
      .insert([restauranteData])
      .select()
      .single();

    if (error) {
      console.error("Error de Supabase al crear restaurante:", error);
      throw error;
    }

    console.log("Restaurante creado exitosamente:", data);

    // Si el usuario es Admin/Propietario (rol_id=2), crear relación en usuarios_restaurantes
    if (req.user_info.rol_id === 2 && data.id) {
      const { error: relacionError } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .insert([
          {
            usuario_id: req.user_info.id,
            restaurante_id: data.id,
            es_propietario: true,
          },
        ]);

      if (relacionError) {
        console.error("Error al crear relación usuario-restaurante:", relacionError);
        // No lanzamos error aquí, solo lo registramos, porque el restaurante ya se creó
      } else {
        console.log("Relación usuario-restaurante creada exitosamente");
      }
    }

    res.status(201).json({
      success: true,
      message: "Restaurante creado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al crear restaurante:", error);
    
    // Manejar errores específicos de Supabase
    if (error.code === '23505') { // Violación de unique constraint
      res.status(400).json({
        success: false,
        message: "Ya existe un restaurante con este nombre",
      });
      return;
    }

    if (error.code === 'PGRST116') { // No encontrado
      res.status(404).json({
        success: false,
        message: "Recurso no encontrado",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || "Error al crear restaurante",
    });
    return;
  }
};

// Actualizar un restaurante
export const updateRestaurante = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre_restaurante, direccion_restaurante, logo_restaurante } =
    req.body;

  // Verificar que se proporcione al menos un campo para actualizar
  if (
    !nombre_restaurante &&
    direccion_restaurante === undefined &&
    logo_restaurante === undefined
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

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    // Primero obtener el restaurante para verificar permisos
    const { data: restauranteExistente, error: errorBuscar } = await supabaseAdmin
      .from("restaurantes")
      .select("id, propietario_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !restauranteExistente) {
      res.status(404).json({
        success: false,
        message: "Restaurante no encontrado",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
        return;
      }
    } else {
      // Usuarios normales no pueden actualizar restaurantes
      res.status(403).json({
        success: false,
        message: "No tienes permisos para actualizar restaurantes",
      });
      return;
    }

    console.log(
      `Usuario ${req.user_info.id} está actualizando el restaurante ${id}`
    );

    // Crear objeto con solo los campos proporcionados
    const updateFields: any = {};
    if (nombre_restaurante)
      updateFields.nombre_restaurante = nombre_restaurante;
    if (direccion_restaurante !== undefined)
      updateFields.direccion_restaurante = direccion_restaurante;
    if (logo_restaurante !== undefined)
      updateFields.logo_restaurante = logo_restaurante;

    const { data, error } = await supabaseAdmin
      .from("restaurantes")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Restaurante no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Restaurante actualizado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar restaurante",
    });
    return;
  }
};

// Eliminar un restaurante
export const deleteRestaurante = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
        return;
      }
    } else {
      // Usuarios normales no pueden eliminar restaurantes
      res.status(403).json({
        success: false,
        message: "No tienes permisos para eliminar restaurantes",
      });
      return;
    }

    console.log(`Usuario ${req.user_info.id} está eliminando el restaurante ${id}`);

    const { error } = await supabaseAdmin.from("restaurantes").delete().eq("id", id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Restaurante eliminado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar restaurante",
    });
    return;
  }
};
