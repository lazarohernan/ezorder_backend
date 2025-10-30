import type { App, DirectiveBinding } from 'vue';
import { useAuthStore } from '@/stores/auth_store';

/**
 * Plugin de permisos para Vue 3
 * Proporciona directivas para controlar el acceso a elementos del UI según permisos
 */

/**
 * Verifica si el usuario tiene el permiso especificado
 * Sistema RBAC con permisos en español
 */
function hasPermission(permission: string, authStore: ReturnType<typeof useAuthStore>): boolean {
  if (!authStore.userInfo) return false;

  // 1. Super Admin - acceso total
  if (authStore.userInfo.rol_id === 1 || authStore.userInfo.es_super_admin) {
    return true;
  }

  // 2. Admin/Propietario - acceso total a SUS restaurantes sin restricciones
  // No verificamos es_propietario para compatibilidad con sesiones antiguas
  if (authStore.userInfo.rol_id === 2) {
    return true;
  }

  const permissions = authStore.userInfo.permisos || [];

  // Verificar si tiene el permiso wildcard completo
  if (permissions.includes('*')) return true;

  // Verificar permiso exacto
  if (permissions.includes(permission)) return true;

  // Verificar permiso con wildcard de categoría (ej: 'usuarios.*' incluye 'usuarios.ver')
  const [category] = permission.split('.');
  if (permissions.includes(`${category}.*`)) return true;

  return false;
}

/**
 * Directiva v-permission
 * Oculta el elemento si el usuario no tiene el permiso especificado
 * 
 * Uso:
 * - v-permission="'usuarios.ver'" - Requiere un permiso
 * - v-permission="['usuarios.ver', 'usuarios.crear']" - Requiere AL MENOS UNO
 */
export default {
  install(app: App) {
    app.directive('permission', {
      mounted(el: HTMLElement, binding: DirectiveBinding) {
        const authStore = useAuthStore();
        const permissions = Array.isArray(binding.value) ? binding.value : [binding.value];
        
        // Verificar si tiene al menos uno de los permisos
        const hasAccess = permissions.some(permission => hasPermission(permission, authStore));
        
        if (!hasAccess) {
          // Ocultar el elemento
          el.style.display = 'none';
          // Marcar el elemento para identificarlo
          el.setAttribute('data-permission-hidden', 'true');
        }
      },
      
      updated(el: HTMLElement, binding: DirectiveBinding) {
        const authStore = useAuthStore();
        const permissions = Array.isArray(binding.value) ? binding.value : [binding.value];
        
        const hasAccess = permissions.some(permission => hasPermission(permission, authStore));
        
        if (!hasAccess) {
          el.style.display = 'none';
          el.setAttribute('data-permission-hidden', 'true');
        } else {
          // Mostrar el elemento si tiene permiso
          if (el.getAttribute('data-permission-hidden') === 'true') {
            el.style.display = '';
            el.removeAttribute('data-permission-hidden');
          }
        }
      },
    });

    /**
     * Directiva v-permission-disable
     * Deshabilita el elemento si el usuario no tiene el permiso especificado
     * 
     * Uso:
     * - v-permission-disable="'usuarios.editar'"
     */
    app.directive('permission-disable', {
      mounted(el: HTMLElement, binding: DirectiveBinding) {
        const authStore = useAuthStore();
        const permissions = Array.isArray(binding.value) ? binding.value : [binding.value];
        
        const hasAccess = permissions.some(permission => hasPermission(permission, authStore));
        
        if (!hasAccess) {
          el.setAttribute('disabled', 'true');
          el.classList.add('opacity-50', 'cursor-not-allowed');
          el.setAttribute('title', 'No tienes permisos para realizar esta acción');
        }
      },
      
      updated(el: HTMLElement, binding: DirectiveBinding) {
        const authStore = useAuthStore();
        const permissions = Array.isArray(binding.value) ? binding.value : [binding.value];
        
        const hasAccess = permissions.some(permission => hasPermission(permission, authStore));
        
        if (!hasAccess) {
          el.setAttribute('disabled', 'true');
          el.classList.add('opacity-50', 'cursor-not-allowed');
          el.setAttribute('title', 'No tienes permisos para realizar esta acción');
        } else {
          el.removeAttribute('disabled');
          el.classList.remove('opacity-50', 'cursor-not-allowed');
          el.removeAttribute('title');
        }
      },
    });

    /**
     * Directiva v-super-admin
     * Oculta el elemento si el usuario NO es super administrador
     */
    app.directive('super-admin', {
      mounted(el: HTMLElement) {
        const authStore = useAuthStore();
        const isSuperAdmin = authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin;
        
        if (!isSuperAdmin) {
          el.style.display = 'none';
          el.setAttribute('data-super-admin-hidden', 'true');
        }
      },
      
      updated(el: HTMLElement) {
        const authStore = useAuthStore();
        const isSuperAdmin = authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin;
        
        if (!isSuperAdmin) {
          el.style.display = 'none';
          el.setAttribute('data-super-admin-hidden', 'true');
        } else {
          if (el.getAttribute('data-super-admin-hidden') === 'true') {
            el.style.display = '';
            el.removeAttribute('data-super-admin-hidden');
          }
        }
      },
    });
  },
};
