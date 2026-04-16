import { supabaseAdmin } from "../supabase/supabase";

/**
 * Verifica si un rol personalizado tiene un permiso específico.
 * Soporta wildcards: "pedidos.*" cubre "pedidos.crear", "pedidos.ver", etc.
 */
export const userHasPermission = async (
  rolPersonalizadoId: number | null | undefined,
  permission: string,
): Promise<boolean> => {
  if (!supabaseAdmin || !rolPersonalizadoId) return false;

  const { data: userPermissions, error } = await supabaseAdmin
    .from("rol_permisos")
    .select("permisos!inner(nombre)")
    .eq("rol_id", rolPersonalizadoId);

  if (error) {
    console.error("Error al validar permiso del usuario:", error);
    return false;
  }

  const permissionNames = (userPermissions || []).map((rp: any) => rp.permisos.nombre);

  if (permissionNames.includes("*")) return true;
  if (permissionNames.includes(permission)) return true;

  const [category] = permission.split(".");
  if (permissionNames.includes(`${category}.*`)) return true;

  return false;
};

/**
 * Obtiene todos los restaurante_ids asignados a un usuario.
 */
export const userRestaurantIds = async (userId: string): Promise<string[]> => {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from("usuarios_restaurantes")
    .select("restaurante_id")
    .eq("usuario_id", userId);

  if (error) {
    console.error("Error al obtener restaurantes del usuario:", error);
    return [];
  }

  return data?.map((row: any) => row.restaurante_id) || [];
};

/**
 * Para usuarios con rol personalizado, verifica si tienen acceso a un restaurante
 * dado que tengan el permiso requerido (p.ej. "pedidos.crear").
 * Considera tanto el restaurante_id fijo como los restaurantes asignados en usuarios_restaurantes.
 */
export const userCanAccessRestaurant = async (
  userId: string,
  rolPersonalizadoId: number | null | undefined,
  restauranteIdFijo: string | null | undefined,
  targetRestauranteId: string,
  permission: string,
): Promise<boolean> => {
  const hasPermission = await userHasPermission(rolPersonalizadoId, permission);
  if (!hasPermission) return false;

  if (restauranteIdFijo === targetRestauranteId) return true;

  const assignedIds = await userRestaurantIds(userId);
  return assignedIds.includes(targetRestauranteId);
};
