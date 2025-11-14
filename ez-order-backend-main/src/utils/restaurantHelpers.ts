/**
 * Utilidades compartidas para verificación de permisos de restaurante
 */

// Helper para limpiar UUIDs (convierte strings vacíos a null)
export const cleanUUID = (value: any): string | null => {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

// Helper para verificar permisos de restaurante
export const checkRestaurantAccess = async (
  client: any,
  userId: string,
  restaurantId: string,
  userRole: number,
  userRestaurantId?: string
): Promise<boolean> => {
  if (userRole === 1) return true; // Super Admin
  
  if (userRole === 2) {
    // Admin: verificar en usuarios_restaurantes
    const { data: userRestaurants } = await client
      .from("usuarios_restaurantes")
      .select("restaurante_id")
      .eq("usuario_id", userId);
    
    const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
    return restaurantIds.includes(restaurantId);
  }
  
  // Usuario normal: verificar restaurante asignado
  return userRestaurantId === restaurantId;
};

// Helper para obtener restaurantes del usuario
export const getUserRestaurants = async (client: any, userId: string): Promise<string[]> => {
  const { data: userRestaurants } = await client
    .from("usuarios_restaurantes")
    .select("restaurante_id")
    .eq("usuario_id", userId);
  
  return userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
};

