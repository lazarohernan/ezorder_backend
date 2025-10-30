# Análisis de Roles y Permisos - EZ Order

## Estado Actual

### Roles Definidos en Base de Datos
```sql
1. superadmin
2. restaurant_admin
3. empleado_restaurante
4. cocina_restaurante
```

### Usuarios Actuales
- **2 Superadmins**: hlazaroe@gmail.com, edgardozuniga1@me.com
- **2 Restaurant Admins**: lazaro-hernan@hotmail.com, admin@admin.com
- **3 Usuarios sin rol asignado**: test@ezorder.com, asdf@asdf.com, demo@ezorder.com

---

## Problemas Identificados

### 1. **Falta de Middleware de Autorización en Backend**
❌ **Problema**: Solo existe `requireAuth` que verifica autenticación, pero NO hay middleware para verificar roles/permisos.

**Ubicación**: `/src/middlewares/auth.ts`
- Solo verifica que el usuario esté autenticado
- No valida permisos basados en roles
- Todas las rutas protegidas tienen el mismo nivel de acceso

**Impacto**: Cualquier usuario autenticado puede acceder a cualquier endpoint protegido.

### 2. **Validación de Roles Solo en Frontend**
❌ **Problema**: La validación de roles solo existe en el frontend (`isAdminGuard`).

**Ubicación**: `/src/guards/is_admin_guard.ts`
- Solo verifica `rol_id === 1` (superadmin)
- Fácilmente bypasseable con herramientas como Postman/curl
- No hay validación granular por recurso

**Rutas protegidas solo en frontend**:
- `/admin/restaurants` - requiresAdmin
- `/admin/users` - requiresAdmin  
- `/admin/inventory` - requiresAdmin
- `/admin/gastos` - requiresAdmin

### 3. **Falta de Definición de Permisos por Rol**
❌ **Problema**: No hay una tabla o sistema que defina qué puede hacer cada rol.

**Roles sin permisos definidos**:
- `empleado_restaurante` - ¿Qué puede hacer?
- `cocina_restaurante` - ¿Solo ver pedidos?
- `restaurant_admin` - ¿Puede gestionar todo su restaurante?

### 4. **No Hay Filtrado por Restaurante**
❌ **Problema**: Los usuarios no están limitados a ver/editar solo datos de su restaurante.

**Ejemplo**: Un `restaurant_admin` del Restaurante A podría ver/editar datos del Restaurante B si hace la petición directa al backend.

### 5. **Inconsistencia en Store de Auth**
⚠️ **Problema Menor**: El `auth_store.ts` tiene un getter `userRole` que lee de `user_metadata.role`, pero los roles están en `usuarios_info.rol_id`.

```typescript
// Línea 30 - auth_store.ts
const userRole = computed(() => user.value?.user_metadata?.role || 'guest');
```

Esto no coincide con la estructura real de la BD.

---

## Recomendaciones de Mejora

### 🔴 CRÍTICO - Implementar Middleware de Autorización en Backend

#### 1. Crear Middleware de Roles
```typescript
// src/middlewares/roles.ts
export const requireRole = (allowedRoles: number[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user_info || !req.user_info.rol_id) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para acceder a este recurso"
      });
    }

    if (!allowedRoles.includes(req.user_info.rol_id)) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos suficientes"
      });
    }

    next();
  };
};

export const requireSuperAdmin = requireRole([1]);
export const requireAdmin = requireRole([1, 2]);
export const requireStaff = requireRole([1, 2, 3]);
```

#### 2. Aplicar en Rutas Sensibles
```typescript
// Ejemplo: src/routes/usuarios.ts
router.get("/", requireAuth, requireAdmin, getUsuarios);
router.post("/", requireAuth, requireSuperAdmin, createUsuario);
router.delete("/:id", requireAuth, requireSuperAdmin, deleteUsuario);
```

### 🟠 IMPORTANTE - Implementar Filtrado por Restaurante

#### 1. Middleware de Scope de Restaurante
```typescript
// src/middlewares/restaurant-scope.ts
export const requireRestaurantScope = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  // Superadmin puede ver todo
  if (req.user_info?.rol_id === 1) {
    return next();
  }

  // Otros roles solo ven su restaurante
  const restauranteId = req.user_info?.restaurante_id;
  if (!restauranteId) {
    return res.status(403).json({
      ok: false,
      message: "No tienes restaurante asignado"
    });
  }

  // Agregar filtro automático en queries
  req.restaurante_filter = restauranteId;
  next();
};
```

#### 2. Aplicar en Controladores
```typescript
// Ejemplo en menuController
export const getMenus = async (req: Request, res: Response) => {
  let query = supabase.from('menu').select('*');
  
  // Filtrar por restaurante si no es superadmin
  if (req.restaurante_filter) {
    query = query.eq('restaurante_id', req.restaurante_filter);
  }
  
  const { data, error } = await query;
  // ...
};
```

### 🟡 RECOMENDADO - Definir Matriz de Permisos

#### Crear Tabla de Permisos (Opcional pero Recomendado)
```sql
CREATE TABLE permisos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rol_permisos (
  rol_id SMALLINT REFERENCES rol(id),
  permiso_id INT REFERENCES permisos(id),
  PRIMARY KEY (rol_id, permiso_id)
);
```

#### Permisos Sugeridos
```sql
INSERT INTO permisos (nombre, descripcion) VALUES
  ('usuarios.crear', 'Crear nuevos usuarios'),
  ('usuarios.editar', 'Editar usuarios existentes'),
  ('usuarios.eliminar', 'Eliminar usuarios'),
  ('usuarios.ver', 'Ver lista de usuarios'),
  ('menu.crear', 'Crear items del menú'),
  ('menu.editar', 'Editar items del menú'),
  ('menu.eliminar', 'Eliminar items del menú'),
  ('pedidos.crear', 'Crear pedidos'),
  ('pedidos.ver', 'Ver pedidos'),
  ('pedidos.actualizar', 'Actualizar estado de pedidos'),
  ('inventario.gestionar', 'Gestionar inventario'),
  ('gastos.gestionar', 'Gestionar gastos'),
  ('caja.gestionar', 'Gestionar caja'),
  ('restaurantes.gestionar', 'Gestionar restaurantes');
```

### 🟢 OPCIONAL - Mejoras Adicionales

#### 1. Actualizar Auth Store
```typescript
// Corregir userRole en auth_store.ts
const userRole = computed(() => {
  if (!userInfo.value?.rol_id) return 'guest';
  
  const roleMap: Record<number, string> = {
    1: 'superadmin',
    2: 'restaurant_admin',
    3: 'empleado_restaurante',
    4: 'cocina_restaurante'
  };
  
  return roleMap[userInfo.value.rol_id] || 'guest';
});
```

#### 2. Crear Guards Específicos en Frontend
```typescript
// src/guards/role-guards.ts
export const requireRestaurantAdmin = (to, from, next) => {
  const authStore = useAuthStore();
  const allowedRoles = [1, 2]; // superadmin, restaurant_admin
  
  if (!allowedRoles.includes(authStore.userInfo?.rol_id)) {
    next({ name: 'dashboard', query: { error: 'access_denied' }});
    return;
  }
  next();
};
```

#### 3. Componente de Permisos
```vue
<!-- src/components/PermissionGate.vue -->
<template>
  <slot v-if="hasPermission" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth_store';

const props = defineProps<{
  roles: number[];
}>();

const authStore = useAuthStore();

const hasPermission = computed(() => {
  return props.roles.includes(authStore.userInfo?.rol_id || 0);
});
</script>
```

---

## Plan de Implementación Sugerido

### Fase 1 - Seguridad Crítica (1-2 días)
1. ✅ Crear middleware `requireRole` en backend
2. ✅ Aplicar en rutas sensibles (usuarios, restaurantes, inventario)
3. ✅ Implementar filtrado por restaurante en controladores

### Fase 2 - Mejoras de Autorización (2-3 días)
1. ✅ Crear tabla de permisos (opcional)
2. ✅ Definir permisos por rol
3. ✅ Actualizar guards en frontend
4. ✅ Corregir auth_store

### Fase 3 - UX y Refinamiento (1-2 días)
1. ✅ Crear componente PermissionGate
2. ✅ Ocultar opciones de menú según rol
3. ✅ Mensajes de error personalizados
4. ✅ Testing de permisos

---

## Resumen de Riesgos Actuales

| Riesgo | Severidad | Descripción |
|--------|-----------|-------------|
| Sin autorización en backend | 🔴 CRÍTICO | Cualquier usuario autenticado puede acceder a cualquier endpoint |
| Sin filtrado por restaurante | 🔴 CRÍTICO | Usuarios pueden ver/editar datos de otros restaurantes |
| Validación solo en frontend | 🟠 ALTO | Fácilmente bypasseable |
| Roles sin permisos definidos | 🟡 MEDIO | No está claro qué puede hacer cada rol |
| Usuarios sin rol asignado | 🟡 MEDIO | 3 usuarios sin rol definido |

---

## Conclusión

**La aplicación tiene una estructura de roles básica pero CARECE de implementación de autorización en el backend**, lo que representa un riesgo de seguridad significativo. 

**Prioridad inmediata**: Implementar middleware de roles y filtrado por restaurante en el backend antes de pasar a producción.
