import { Request, Response, NextFunction } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

/**
 * Middleware para verificar que el usuario está autenticado
 * Se espera que se envíe el token en el header Authorization: Bearer token
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Obtener el token del header 'Authorization'
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        ok: false,
        message: "No se proporcionó un token de autenticación",
      });
      return;
    }

    // Extraer el token
    const token = authHeader.split(" ")[1];

    // Verificar la sesión con Supabase usando cliente regular
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        ok: false,
        message: "Token inválido o expirado",
        error: error?.message,
      });
      return;
    }

    // Añadir el usuario al objeto request para uso posterior
    req.user = data.user;

    // Obtener más datos del usuario de la tabla usuarios_info
    // Usar siempre el cliente admin para bypassear RLS y obtener la información completa
    const client = supabaseAdmin || supabase;
    const { data: userInfoData, error: userInfoError } = await client
      .from("usuarios_info")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (userInfoError) {
      console.error("No se pudo obtener información del usuario:", userInfoError.message);
      req.user_info = null;
    } else {
      req.user_info = userInfoData;
    }

    // Continuar con la siguiente función en la cadena de middleware
    next();
  } catch (error) {
    console.error("Error en middleware de autenticación:", error);
    res.status(500).json({
      ok: false,
      message: "Error en el servidor al verificar autenticación",
    });
    return;
  }
};
