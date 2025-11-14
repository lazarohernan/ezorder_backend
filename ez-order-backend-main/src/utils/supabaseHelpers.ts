import { Request } from "express";
import { getSupabaseClientWithAuth, supabaseAdmin } from "../supabase/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Obtiene el token de autenticación del request
 */
export const getAuthToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
};

/**
 * Obtiene un cliente de Supabase con RLS habilitado usando el token del usuario
 * @param req - Request de Express con el token en el header
 * @returns Cliente de Supabase con RLS habilitado
 * @throws Error si no hay token de autenticación
 */
export const getClientWithRLS = async (req: Request): Promise<SupabaseClient> => {
  const token = getAuthToken(req);
  if (!token) {
    throw new Error("Token de autenticación requerido");
  }
  return await getSupabaseClientWithAuth(token);
};

/**
 * Obtiene el cliente admin SOLO cuando es absolutamente necesario
 * (por ejemplo, para obtener usuarios_info en el middleware)
 */
export const getAdminClient = (): SupabaseClient => {
  if (!supabaseAdmin) {
    throw new Error("supabaseAdmin no está configurado");
  }
  return supabaseAdmin;
};

