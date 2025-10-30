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
          meta: { requiresAuth: true },
        },
        {
          path: 'menu/categories',
          name: 'menu-categories',
          component: () => import('@/modules/admin/views/MenuCategoriesView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'clients',
          name: 'clients',
          component: () => import('@/modules/admin/views/ClientesView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/modules/admin/views/PedidosView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'orders/new',
          name: 'new-order',
          component: () => import('@/modules/admin/views/NewPedidoView.vue'),
          meta: { requiresAuth: true },
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
          meta: { requiresAuth: true },
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
    // Solo redirigir al dashboard si no estamos yendo al login
    if (to.name !== 'login') {
      next({ name: 'dashboard' });
      return;
    }
  }

  // Allow navigation in all other cases
  next();
});

export default router;
