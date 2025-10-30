import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/stores/auth_store';

/**
 * Guard para verificar si el usuario tiene permisos de administrador
 * Permite acceso a:
 * - Super Admin (rol_id === 1)
 * - Admin/Propietario (rol_id === 2)
 * - Usuarios con rol_personalizado_id que tengan permisos administrativos
 * @param to - Ruta de destino
 * @param from - Ruta de origen
 * @param next - Función para continuar la navegación
 */
export const isAdminGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const authStore = useAuthStore();

  // Verificar si el usuario está autenticado
  if (!authStore.isAuthenticated) {
    console.warn('Usuario no autenticado intentando acceder a ruta administrativa');
    next({ name: 'login' });
    return;
  }

  // Verificar si el usuario tiene información cargada
  if (!authStore.userInfo) {
    console.warn('Información de usuario no disponible');
    next({ name: 'dashboard' });
    return;
  }

  // 1. Super Admin (rol_id=1) - Acceso total
  if (authStore.userInfo.rol_id === 1 || authStore.userInfo.es_super_admin) {
    next();
    return;
  }

  // 2. Admin/Propietario (rol_id=2) - Acceso total a SUS restaurantes
  if (authStore.userInfo.rol_id === 2) {
    next();
    return;
  }

  // 3. Usuarios con rol personalizado que tengan permisos administrativos
  if (authStore.userInfo.rol_personalizado_id) {
    next();
    return;
  }

  // Si no cumple ninguna condición, denegar acceso
  console.warn(
    `Usuario con rol_personalizado_id ${authStore.userInfo.rol_personalizado_id} y es_super_admin ${authStore.userInfo.es_super_admin} intentando acceder a ruta administrativa`,
  );
  // Redirigir al dashboard con mensaje de error
  next({
    name: 'dashboard',
    query: { error: 'access_denied', message: 'No tienes permisos para acceder a esta sección' },
  });
};

export default isAdminGuard;
