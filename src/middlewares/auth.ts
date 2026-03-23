import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

/**
 * Middleware para verificar que el usuario está autenticado.
 * Se espera que se envíe el token en el header Authorization: Bearer token
 */
export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({
        ok: false,
        message: "No se proporcionó un token de autenticación",
      });
    }

    const token = authHeader.split(" ")[1];

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return reply.code(401).send({
        ok: false,
        message: "Token inválido o expirado",
        error: error?.message,
      });
    }

    request.user = data.user;

    if (!supabaseAdmin) {
      request.user_info = null;
    } else {
      const { data: userInfoData, error: userInfoError } = await supabaseAdmin
        .from("usuarios_info")
        .select("*")
        .eq("id", data.user.id)
        .limit(1);

      if (userInfoError) {
        console.error("No se pudo obtener información adicional del usuario:", userInfoError);
        request.user_info = null;
      } else {
        request.user_info = userInfoData && userInfoData.length > 0 ? userInfoData[0] : null;
      }
    }
  } catch (error) {
    console.error("Error en middleware de autenticación:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al verificar autenticación",
    });
  }
};
