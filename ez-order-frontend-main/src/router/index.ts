import { createRouter, createWebHistory } from 'vue-router';
import { watch } from 'vue';
import HomeView from '../views/HomeView.vue';
import LoginView from '../modules/auth/views/LoginView.vue';
import RegisterView from '@/modules/auth/views/RegisterView.vue';
import ForgotPassword from '@/modules/auth/views/ForgotPassword.vue';
import AuthCallback from '@/modules/auth/views/AuthCallback.vue';
import AdminLayout from '@/modules/admin/layout/AdminLayout.vue';
import { useAuthStore } from '@/stores/auth_store';
import { isAdminGuard } from '@/guards/is_admin_guard';
import { usePermissions } from '@/composables/usePermissions';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/auth',
      children: [
        {
          path: 'login',
          name: 'login',
          component: LoginView,
          meta: { requiresGuest: true },
        },
        {
          path: 'register',
          name: 'register',
          component: RegisterView,
          meta: { requiresGuest: true },
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: ForgotPassword,
          meta: { requiresGuest: true },
        },
        {
          path: 'callback',
          name: 'auth-callback',
          component: AuthCallback,
        },
      ],
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminLayout,
      redirect: '/admin/dashboard',
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/modules/admin/views/DashboardView.vue'),
          meta: { requiresAuth: true, permission: 'dashboard.ver' },
        },
        {
          path: 'waiting-permissions',
          name: 'waiting-permissions',
          component: () => import('@/modules/admin/views/WaitingPermissionsView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'restaurants',
          name: 'restaurants',
          component: () => import('@/modules/admin/views/RestaurantesView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          beforeEnter: isAdminGuard,
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/modules/admin/views/UsuariosView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          beforeEnter: isAdminGuard,
        },
        {
          path: 'menu',
          name: 'menu',
          component: () => import('@/modules/admin/views/MenuView.vue'),
          meta: { requiresAuth: true, permission: 'menu.ver' },
        },
        {
          path: 'menu/categories',
          name: 'menu-categories',
          component: () => import('@/modules/admin/views/MenuCategoriesView.vue'),
          meta: { requiresAuth: true, permission: 'categorias.ver' },
        },
        {
          path: 'clients',
          name: 'clients',
          component: () => import('@/modules/admin/views/ClientesView.vue'),
          meta: { requiresAuth: true, permission: 'clientes.ver' },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/modules/admin/views/PedidosView.vue'),
          meta: { requiresAuth: true, permission: 'pedidos.ver' },
        },
        {
          path: 'orders/new',
          name: 'new-order',
          component: () => import('@/modules/admin/views/NewPedidoView.vue'),
          meta: { requiresAuth: true, permission: 'pedidos.crear' },
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: () => import('@/modules/admin/views/InventarioView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          beforeEnter: isAdminGuard,
        },
        {
          path: 'gastos',
          name: 'gastos',
          component: () => import('@/modules/admin/views/GastosView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          beforeEnter: isAdminGuard,
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/modules/admin/views/RolesView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          beforeEnter: isAdminGuard,
        },
        {
          path: 'caja',
          name: 'caja',
          component: () => import('@/modules/admin/views/CajaView.vue'),
          meta: { requiresAuth: true, permission: 'caja.ver' },
        },
      ],
    },
  ],
});

// Navigation guard to handle auth routes
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Wait for auth store to initialize
  if (!authStore.isInitialized) {
    await new Promise((resolve) => {
      const unwatch = watch(
        () => authStore.isInitialized,
        (initialized: boolean) => {
          if (initialized) {
            unwatch();
            resolve(true);
          }
        },
      );
    });
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login if user is not authenticated
    next({ name: 'login' });
    return;
  }

  // Check if route requires guest access
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // Redirigir a waiting-permissions si no tiene permisos, o al dashboard si los tiene
    const { userPermissions, hasRestaurant } = usePermissions();
    const isSuperAdmin = authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin;
    const isAdmin = authStore.userInfo?.rol_id === 2;
    const hasPermissions = userPermissions.value.length > 0 && hasRestaurant.value;
    
    if (to.name !== 'login') {
      if (!isSuperAdmin && !isAdmin && !hasPermissions) {
        next({ name: 'waiting-permissions' });
      } else {
        next({ name: 'dashboard' });
      }
      return;
    }
  }

  // Verificar si el usuario intenta acceder al admin layout sin permisos
  // Redirigir a la vista de espera si no tiene permisos
  if (to.path.startsWith('/admin') && authStore.isAuthenticated && to.name === 'admin') {
    const { userPermissions, hasRestaurant } = usePermissions();
    const isSuperAdmin = authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin;
    const isAdmin = authStore.userInfo?.rol_id === 2;
    const hasPermissions = userPermissions.value.length > 0;
    
    // Si no es Super Admin/Admin y no tiene permisos o restaurante, redirigir a la vista de espera
    if (!isSuperAdmin && !isAdmin && (!hasPermissions || !hasRestaurant.value)) {
      next({ name: 'waiting-permissions' });
      return;
    }
  }

  // Verificar si el usuario está en waiting-permissions pero ya tiene permisos
  if (to.name === 'waiting-permissions' && authStore.isAuthenticated) {
    const { userPermissions, hasRestaurant } = usePermissions();
    const isSuperAdmin = authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin;
    const isAdmin = authStore.userInfo?.rol_id === 2;
    const hasPermissions = userPermissions.value.length > 0 && hasRestaurant.value;
    
    // Si tiene permisos o es admin, redirigir al dashboard
    if (isSuperAdmin || isAdmin || hasPermissions) {
      next({ name: 'dashboard' });
      return;
    }
  }

  // Check if route requires specific permission (incluye dashboard)
  if (to.meta.permission && authStore.isAuthenticated) {
    const { hasPermission, hasRestaurant } = usePermissions();
    const permission = to.meta.permission as string;
    
    // Verificar primero si es Super Admin o Admin - siempre tienen acceso
    const isSuperAdmin = authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin;
    const isAdmin = authStore.userInfo?.rol_id === 2;
    
    // Super Admin y Admin siempre tienen acceso, no verificar permisos
    if (isSuperAdmin || isAdmin) {
      next();
      return;
    }
    
    // Para otros usuarios, verificar primero que tenga restaurante asignado
    if (!hasRestaurant.value) {
      // Usuario no tiene restaurante asignado, redirigir a la vista de espera
      next({ 
        name: 'waiting-permissions',
        query: { error: 'no_restaurant', message: 'Debes tener un restaurante asignado para acceder a esta sección' }
      });
      return;
    }
    
    // Verificar si tiene el permiso requerido
    if (!hasPermission(permission).value) {
      // Usuario no tiene el permiso requerido, redirigir a la vista de espera
      next({ 
        name: 'waiting-permissions',
        query: { error: 'access_denied', message: 'No tienes permisos para acceder a esta sección' }
      });
      return;
    }
  }

  // Allow navigation in all other cases
  next();
});

export default router;
