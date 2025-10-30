# 🎯 Sistema Multi-Tenant Implementado

## ✅ Cambios Realizados en la Base de Datos

### **Nueva Estructura de Jerarquía**

```
1. Super Admin (rol_id=1) - Tú (Dueño del SaaS)
   ├─→ Acceso TOTAL a TODO el sistema
   ├─→ Puede ver TODOS los restaurantes
   └─→ Puede gestionar TODO sin restricciones

2. Admin/Owner (rol_id=2) - Cliente del SaaS (Dueño de Restaurante)
   ├─→ Puede tener MÚLTIPLES restaurantes
   ├─→ Acceso COMPLETO a SUS restaurantes
   ├─→ NO necesita permisos específicos dentro de sus restaurantes
   └─→ Puede crear/gestionar usuarios y asignarles permisos

3. Usuarios/Empleados (rol_id=3, 4, roles personalizados)
   ├─→ Solo acceso a SU restaurante asignado
   └─→ Solo los permisos que el Admin les otorgó
```

---

## 📋 Tablas Nuevas/Modificadas

### **1. Tabla `restaurantes` - MODIFICADA**

**Nueva Columna:**
```sql
owner_id uuid REFERENCES auth.users(id)
```
- Identifica al dueño principal del restaurante
- Un Admin puede ser owner de múltiples restaurantes

### **2. Tabla `usuario_restaurantes` - NUEVA**

```sql
CREATE TABLE usuario_restaurantes (
  usuario_id uuid,           -- ID del usuario
  restaurante_id uuid,       -- ID del restaurante
  es_owner boolean,          -- TRUE si es el dueño principal
  created_at timestamptz,
  PRIMARY KEY (usuario_id, restaurante_id)
);
```

**Permite:**
- Relación muchos-a-muchos
- Un Admin puede tener múltiples restaurantes
- Un restaurante puede tener múltiples Admins (co-owners)

---

## 🔐 Nuevas Políticas RLS

### **Patrón Implementado:**

Todas las tablas siguen este patrón:

```sql
-- SELECT (Ver datos)
1. Super Admin → Ve TODO
2. Admin → Ve solo datos de SUS restaurantes
3. Usuarios → Ven solo datos de SU restaurante + permiso específico

-- INSERT/UPDATE/DELETE (Modificar datos)
1. Super Admin → Puede TODO
2. Admin → Puede TODO en SUS restaurantes (sin restricción de permisos)
3. Usuarios → Solo con permisos específicos
```

### **Funciones Helper Creadas:**

```sql
-- Verifica si el usuario es owner de un restaurante
is_restaurant_owner(restaurante_id uuid) → boolean

-- Obtiene array de restaurantes del usuario
user_restaurantes() → uuid[]
```

---

## 🎨 Auth Hook Actualizado

### **Nuevos Claims en el JWT:**

```json
{
  // Claims originales de Supabase
  "aud": "authenticated",
  "exp": 1234567890,
  "sub": "user-id",
  "email": "admin@example.com",
  
  // Custom claims NUEVOS
  "rol_id": 2,
  "rol_nombre": "Administrador",
  "user_permissions": ["*"],
  "is_super_admin": false,
  "is_owner": true,              // ← NUEVO
  "restaurantes": [              // ← NUEVO: Array de UUIDs
    "uuid-restaurante-1",
    "uuid-restaurante-2",
    "uuid-restaurante-3"
  ],
  "rol_personalizado_id": null
}
```

**Interpretación:**
- `is_owner: true` → El usuario es dueño de al menos un restaurante
- `restaurantes: []` → Lista de restaurantes a los que tiene acceso
- `user_permissions: ["*"]` → Para rol_id=2, siempre tiene todos los permisos

---

## 🚀 Cómo Usar en el Sistema

### **1. Crear un Nuevo Admin (Owner)**

```sql
-- 1. Crear usuario en Auth (via UI o API)
-- 2. Agregar a usuarios_info
INSERT INTO usuarios_info (id, rol_id, nombre_usuario)
VALUES ('user-uuid', 2, 'Juan Pérez');

-- 3. Crear el restaurante
INSERT INTO restaurantes (id, nombre_restaurante, owner_id)
VALUES ('rest-uuid', 'Restaurante Juan', 'user-uuid');

-- 4. Vincular usuario con restaurante
INSERT INTO usuario_restaurantes (usuario_id, restaurante_id, es_owner)
VALUES ('user-uuid', 'rest-uuid', true);
```

### **2. Agregar Más Restaurantes a un Admin**

```sql
-- 1. Crear nuevo restaurante
INSERT INTO restaurantes (id, nombre_restaurante, owner_id)
VALUES ('rest-uuid-2', 'Segundo Restaurante', 'user-uuid');

-- 2. Vincular con el mismo usuario
INSERT INTO usuario_restaurantes (usuario_id, restaurante_id, es_owner)
VALUES ('user-uuid', 'rest-uuid-2', true);
```

### **3. Crear Usuario/Empleado para un Restaurante**

```sql
-- 1. Crear usuario (via invitación del Admin)
INSERT INTO usuarios_info (id, rol_id, restaurante_id, nombre_usuario)
VALUES ('empleado-uuid', 3, 'rest-uuid', 'María López');

-- El empleado SOLO ve/accede a 'rest-uuid'
-- Sus permisos están definidos en el JWT según su rol_id=3 (Mesero)
```

---

## 📱 Cambios Necesarios en el Frontend

### **1. Actualizar Interface `Auth.ts`**

```typescript
export interface UsuariosInfo {
  id: string;
  nombre_usuario: string;
  rol_id: number;
  restaurante_id?: string;
  rol_personalizado_id?: number;
  permisos?: string[];
  es_super_admin?: boolean;
  is_owner?: boolean;              // ← NUEVO
  restaurantes?: string[];         // ← NUEVO: Array de UUIDs
  // ... otros campos
}
```

### **2. Actualizar `usePermissions.ts`**

```typescript
const hasPermission = (permission: string): boolean => {
  if (!authStore.userInfo) return false;

  // 1. Super Admin - acceso total
  if (authStore.userInfo.rol_id === 1) {
    return true;
  }

  // 2. Admin/Owner - acceso total a SUS restaurantes (sin restricciones)
  if (authStore.userInfo.rol_id === 2 && authStore.userInfo.is_owner) {
    return true;
  }

  // 3. Usuarios normales - verificar permisos específicos
  const permissions = authStore.userInfo.permisos || [];
  
  // Si tiene wildcard
  if (permissions.includes('*')) return true;
  
  // Verificar permiso específico
  if (permissions.includes(permission)) return true;
  
  // Verificar por categoría (ej: menu.*)
  const [category] = permission.split('.');
  if (permissions.includes(`${category}.*`)) return true;
  
  return false;
};
```

### **3. Componente de Selección de Restaurante (Para Admins)**

Si un Admin tiene múltiples restaurantes, crear un selector:

```vue
<template>
  <select v-if="isAdmin && multipleRestaurants" v-model="selectedRestaurant">
    <option v-for="id in restaurantes" :key="id" :value="id">
      {{ getRestaurantName(id) }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth_store';

const authStore = useAuthStore();

const isAdmin = computed(() => authStore.userInfo?.rol_id === 2);
const restaurantes = computed(() => authStore.userInfo?.restaurantes || []);
const multipleRestaurants = computed(() => restaurantes.value.length > 1);
</script>
```

---

## 🔄 Flujo de Trabajo

### **Para Super Admin (Tú):**
1. Accedes al sistema
2. Ves TODOS los restaurantes de TODOS los clientes
3. Puedes crear nuevos Admins/Owners
4. Puedes gestionar TODO sin restricciones

### **Para Admin/Owner (Cliente):**
1. Se registra o es invitado al sistema
2. Crea su(s) restaurante(s)
3. Ve solo SUS restaurantes
4. Acceso completo sin restricciones de permisos a sus restaurantes
5. Puede:
   - Crear usuarios/empleados
   - Asignarles roles (Mesero, Cocinero, personalizado)
   - Gestionar menú, pedidos, inventario, etc.

### **Para Usuario/Empleado:**
1. Es invitado por su Admin
2. Ve solo SU restaurante
3. Solo puede hacer lo que sus permisos le permiten
4. No puede ver otros restaurantes

---

## ✅ Beneficios del Nuevo Sistema

1. **Escalabilidad**: Un Admin puede crecer y tener múltiples restaurantes
2. **Aislamiento**: Cada Admin solo ve SUS datos
3. **Flexibilidad**: Sistema de permisos granulares para empleados
4. **Simplicidad para Admins**: No necesitan configurar permisos para ellos mismos
5. **Control Total**: Tú (Super Admin) tienes visibilidad total del sistema

---

## 🚨 Acciones Pendientes

### **Frontend:**

1. ✅ Actualizar interfaces TypeScript
2. ✅ Actualizar `usePermissions` composable
3. ⚠️ Agregar selector de restaurante para Admins con múltiples restaurantes
4. ⚠️ Actualizar filtros de búsqueda para respetar `restaurantes` array
5. ⚠️ Actualizar formularios de creación para asignar `restaurante_id` correcto

### **Backend:**

1. ⚠️ Actualizar middleware de permisos para verificar `is_owner`
2. ⚠️ Actualizar endpoints para filtrar por `restaurantes` array
3. ⚠️ Agregar endpoint para que Admin gestione sus restaurantes
4. ⚠️ Actualizar lógica de invitación de usuarios

### **Testing:**

1. ⚠️ Probar como Super Admin
2. ⚠️ Probar como Admin con 1 restaurante
3. ⚠️ Probar como Admin con múltiples restaurantes
4. ⚠️ Probar como Usuario/Empleado
5. ⚠️ Verificar aislamiento de datos entre clientes

---

## 📝 Notas Importantes

- **MIGRACIÓN AUTOMÁTICA**: Los usuarios existentes fueron migrados automáticamente
- **ROL_ID=2**: Los Admins actuales ahora son Owners de sus restaurantes
- **CIERRA SESIÓN**: Todos los usuarios deben cerrar sesión y volver a entrar para obtener el nuevo JWT con los claims actualizados
- **COMPATIBILIDAD**: El sistema sigue funcionando con la lógica anterior, pero ahora es más robusto

---

## 🎯 Próximo Paso

**Cerrar sesión y volver a iniciar sesión** para que el nuevo Auth Hook genere el JWT con los nuevos claims (`is_owner` y `restaurantes`).
