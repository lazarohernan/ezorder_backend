import type { App as VueApp } from 'vue';

// Instancia global del toast
let toastInstance: any = null;
// Instancia global de la app Vue
let appInstance: VueApp | null = null;

/**
 * Establece la instancia de la app Vue
 */
export function setAppInstance(app: VueApp) {
  appInstance = app;
}

/**
 * Establece la instancia del toast
 */
export function setToastInstance(toast: any) {
  toastInstance = toast;
}

/**
 * Obtiene la instancia del toast
 */
export function getToast() {
  if (typeof window === 'undefined') {
    return null;
  }

  // Intentar obtener desde la instancia de la app primero
  if (appInstance?.config?.globalProperties?.$toast) {
    return appInstance.config.globalProperties.$toast;
  }

  // Usar la instancia almacenada como último recurso
  return toastInstance;
}

/**
 * Muestra un toast de advertencia para errores de permisos
 */
export function showPermissionError(message?: string) {
  // Si el mensaje ya contiene información sobre permisos, usarlo directamente
  // Si no, usar el mensaje genérico
  const toastMessage = message && message.trim() !== ''
    ? message
    : 'No tienes permisos para realizar esta acción. Contacta a tu administrador si necesitas acceso.';

  // Intentar obtener el toast primero
  const toast = getToast();
  
  if (toast) {
    try {
      toast.warning(toastMessage, {
        timeout: 5000,
      });
      return;
    } catch (error) {
      // Si falla, usar evento personalizado como fallback
    }
  }
  
  // Si no está disponible, usar evento personalizado como fallback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: {
        type: 'warning',
        message: toastMessage,
        options: {
          timeout: 5000,
        }
      }
    }));
  }
}
