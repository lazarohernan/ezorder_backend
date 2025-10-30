import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth_store';

/**
 * Composable para verificar permisos de usuario
 * Permite verificar si el usuario tiene acceso a ciertas funcionalidades
 * Sistema RBAC con permisos en español
 */
export function usePermissions() {
  const authStore = useAuthStore();

  /**
   * Lista de permisos del usuario actual
   */
  const userPermissions = computed(() => {
    return authStore.userInfo?.permisos || [];
  });

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param permission - Nombre del permiso a verificar (ej: 'usuarios.ver')
   * @returns true si el usuario tiene el permiso
   */
  const hasPermission = (permission: string) => {
    return computed(() => {
      if (!authStore.userInfo) {
        return false;
      }

      // 1. Super Admin (rol_id=1) - Acceso total al sistema completo
      if (authStore.userInfo.rol_id === 1 || authStore.userInfo.es_super_admin) {
        return true;
      }

      // 2. Admin/Propietario (rol_id=2) - Acceso total a SUS restaurantes sin restricciones
      // No verificamos es_propietario para compatibilidad con sesiones antiguas
      if (authStore.userInfo.rol_id === 2) {
        return true;
      }

      const permissions = userPermissions.value;
      
      // Verificar si tiene el permiso wildcard completo
      if (permissions.includes('*')) return true;

      // Verificar permiso exacto
      if (permissions.includes(permission)) return true;

      // Verificar permiso con wildcard (ej: 'usuarios.*' incluye 'usuarios.ver')
      const [category] = permission.split('.');
      if (permissions.includes(`${category}.*`)) return true;

      return false;
    });
  };

  /**
   * Verifica si el usuario tiene AL MENOS UNO de los permisos especificados
   * @param permissions - Array de permisos a verificar
   * @returns true si el usuario tiene al menos uno de los permisos
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission).value);
  };

  /**
   * Verifica si el usuario tiene TODOS los permisos especificados
   * @param permissions - Array de permisos a verificar
   * @returns true si el usuario tiene todos los permisos
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission).value);
  };

  /**
   * Verifica si el usuario es super administrador
   */
  const isSuperAdmin = computed(() => {
    return authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin === true;
  });

  /**
   * Verifica si el usuario es administrador de restaurante
   */
  const isRestaurantAdmin = computed(() => {
    return authStore.userInfo?.rol_id === 2 || !!authStore.userInfo?.rol_personalizado_id;
  });

  /**
   * Verifica si el usuario tiene permisos de una categoría completa
   * @param category - Categoría a verificar (ej: 'usuarios')
   * @returns true si el usuario tiene permisos de la categoría
   */
  const hasCategoryAccess = (category: string): boolean => {
    return hasPermission(`${category}.*`).value || hasPermission('*').value;
  };

  /**
   * Obtiene el nombre del rol del usuario
   */
  const roleName = computed(() => {
    return authStore.userInfo?.rol_nombre || 'Sin rol';
  });

  /**
   * ID del rol del usuario
   */
  const roleId = computed(() => {
    return authStore.userInfo?.rol_id || authStore.userInfo?.rol_personalizado_id;
  });

  /**
   * Verifica si el usuario puede gestionar usuarios
   */
  const canManageUsers = computed(() => {
    return hasPermission('usuarios.crear').value || hasPermission('usuarios.editar').value || hasPermission('usuarios.eliminar').value;
  });

  /**
   * Verifica si el usuario puede gestionar menú
   */
  const canManageMenu = computed(() => {
    return hasPermission('menu.crear').value || hasPermission('menu.editar').value || hasPermission('menu.eliminar').value;
  });

  /**
   * Verifica si el usuario puede gestionar pedidos
   */
  const canManageOrders = computed(() => {
    return hasPermission('pedidos.crear').value || hasPermission('pedidos.editar').value || hasPermission('pedidos.cambiar_estado').value;
  });

  /**
   * Verifica si el usuario puede gestionar inventario
   */
  const canManageInventory = computed(() => {
    return hasPermission('inventario.crear').value || hasPermission('inventario.editar').value || hasPermission('inventario.eliminar').value;
  });

  /**
   * Verifica si el usuario puede gestionar caja
   */
  const canManageCashRegister = computed(() => {
    return hasPermission('caja.abrir').value || hasPermission('caja.cerrar').value || hasPermission('caja.registrar_ingresos').value || hasPermission('caja.ver').value;
  });

  return {
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    isRestaurantAdmin,
    hasCategoryAccess,
    roleName,
    roleId,
    canManageUsers,
    canManageMenu,
    canManageOrders,
    canManageInventory,
    canManageCashRegister,
  };
}
