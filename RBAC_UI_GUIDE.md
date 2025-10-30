# Sistema de Permisos RBAC - Guía de Implementación en UI

## Overview

El sistema de permisos RBAC (Role-Based Access Control) está completamente implementado y funciona con permisos en español. Este documento explica cómo utilizar el sistema en los componentes de Vue.

## Permisos Disponibles (en español)

### Módulo de Usuarios
- `usuarios.ver` - Ver lista de usuarios y detalles
- `usuarios.crear` - Crear nuevos usuarios
- `usuarios.editar` - Editar usuarios existentes
- `usuarios.eliminar` - Eliminar usuarios

### Módulo de Menú
- `menu.ver` - Ver lista de menús y detalles
- `menu.crear` - Crear nuevos menús
- `menu.editar` - Editar menús existentes
- `menu.eliminar` - Eliminar menús
- `menu.categorias.ver` - Ver categorías de menú
- `menu.categorias.crear` - Crear categorías de menú
- `menu.categorias.editar` - Editar categorías de menú
- `menu.categorias.eliminar` - Eliminar categorías de menú

### Módulo de Pedidos
- `pedidos.ver` - Ver lista de pedidos y detalles
- `pedidos.crear` - Crear nuevos pedidos
- `pedidos.editar` - Editar pedidos existentes
- `pedidos.cambiar_estado` - Cambiar estado de pedidos
- `pedidos.eliminar` - Eliminar pedidos

### Módulo de Clientes
- `clientes.ver` - Ver lista de clientes y detalles
- `clientes.crear` - Crear nuevos clientes
- `clientes.editar` - Editar clientes existentes
- `clientes.eliminar` - Eliminar clientes

### Módulo de Restaurantes
- `restaurantes.ver` - Ver lista de restaurantes y detalles
- `restaurantes.crear` - Crear nuevos restaurantes
- `restaurantes.editar` - Editar restaurantes existentes
- `restaurantes.eliminar` - Eliminar restaurantes

### Módulo de Inventario
- `inventario.ver` - Ver inventory y detalles
- `inventario.crear` - Crear nuevos items de inventory
- `inventario.editar` - Editar items de inventory
- `inventario.eliminar` - Eliminar items de inventory

### Módulo de Gastos
- `gastos.ver` - Ver lista de gastos y detalles
- `gastos.crear` - Crear nuevos gastos
- `gastos.editar` - Editar gastos existentes
- `gastos.eliminar` - Eliminar gastos

### Módulo de Caja
- `caja.ver` - Ver estado de caja
- `caja.abrir` - Abrir caja
- `caja.cerrar` - Cerrar caja
- `caja.registrar_ingresos` - Registrar ingresos en caja

### Módulo de Roles
- `roles.ver` - Ver lista de roles y detalles
- `roles.crear` - Crear nuevos roles
- `roles.editar` - Editar roles existentes
- `roles.eliminar` - Eliminar roles

### Módulo de Dashboard
- `dashboard.ver` - Ver dashboard principal

## Lógica de Acceso Automático

### Super Admin (rol_id=1)
- Tiene acceso a TODOS los permisos automáticamente
- No necesita permisos explícitos en la base de datos

### Admin de Restaurante (rol_id=2)
- Tiene acceso TOTAL a todos los módulos PERO solo dentro de su restaurante
- La función `authorize()` y las políticas RLS se encargan de filtrar por restaurante
- No necesita permisos explícitos para operaciones básicas dentro de su restaurante

### Otros Roles
- Necesitan permisos explícitos asignados en la base de datos
- Solo pueden acceder a los módulos y operaciones específicas para las que tienen permisos
- El acceso siempre está limitado a su restaurante

## Cómo Usar en Componentes Vue

### 1. Directiva `v-permission`
Oculta elementos si el usuario no tiene el permiso especificado.

```vue
<template>
  <!-- Botón que solo se muestra si tiene permiso para crear usuarios -->
  <button 
    @click="createUser"
    v-permission="'usuarios.crear'"
    class="btn btn-primary"
  >
    Nuevo Usuario
  </button>

  <!-- Sección que requiere permiso para ver menú -->
  <div v-permission="'menu.ver'">
    <h1>Gestión de Menú</h1>
    <!-- Contenido del menú -->
  </div>

  <!-- Múltiples permisos (se muestra si tiene AL MENOS UNO) -->
  <button 
    v-permission="['usuarios.editar', 'usuarios.crear']"
    @click="openUserModal"
  >
    Gestionar Usuarios
  </button>
</template>
```

### 2. Directiva `v-permission-disable`
Deshabilita elementos si el usuario no tiene el permiso especificado.

```vue
<template>
  <!-- Botón deshabilitado si no tiene permiso -->
  <button 
    @click="editUser(user)"
    v-permission-disable="'usuarios.editar'"
    class="btn btn-secondary"
  >
    Editar Usuario
  </button>
</template>
```

### 3. Directiva `v-super-admin`
Oculta elementos si el usuario NO es super administrador.

```vue
<template>
  <!-- Solo visible para super admins -->
  <div v-super-admin>
    <h1>Panel de Super Administración</h1>
    <!-- Funciones exclusivas del super admin -->
  </div>
</template>
```

### 4. Composable `usePermissions`
Para verificaciones programáticas en el script del componente.

```vue
<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions';

const { 
  hasPermission, 
  isSuperAdmin, 
  isRestaurantAdmin,
  canManageUsers,
  canManageMenu 
} = usePermissions();

// Verificar permisos específicos
const canEditThisUser = hasPermission('usuarios.editar');
const canViewDashboard = hasPermission('dashboard.ver');

// Verificaciones de rol
const isSuper = isSuperAdmin.value;
const isAdmin = isRestaurantAdmin.value;

// Verificaciones de módulo
const canManageUsersModule = canManageUsers.value;
const canManageMenuModule = canManageMenu.value;

// Ejemplo de uso en una función
const handleDeleteUser = (userId: string) => {
  if (!hasPermission('usuarios.eliminar')) {
    showToast('No tienes permisos para eliminar usuarios', 'error');
    return;
  }
  // Lógica de eliminación
};
</script>
```

## Implementación en Navigation (SideBar)

El sistema de navegación ya está implementado para filtrar elementos del menú basado en permisos:

```typescript
// En SideBar.vue, los elementos del menú incluyen permisos
const allMenuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/admin/dashboard',
    icon: Home,
    permission: 'dashboard.ver', // Permiso requerido
  },
  {
    name: 'Menú',
    path: '/admin/menu',
    icon: BookOpen,
    permission: 'menu.ver',
    submenu: [
      {
        name: 'Opciones del Menú',
        path: '/admin/menu',
        permission: 'menu.ver',
      },
      {
        name: 'Categorías',
        path: '/admin/menu/categories',
        permission: 'menu.categorias.ver',
      },
    ],
  },
  // ...
];
```

## Ejemplos de Implementación Completa

### Componente de Tabla con Acciones
```vue
<template>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in items" :key="item.id">
        <td>{{ item.name }}</td>
        <td>
          <div class="flex gap-2">
            <!-- Ver detalles -->
            <button 
              @click="viewItem(item)"
              v-permission="'usuarios.ver'"
              title="Ver detalles"
            >
              <EyeIcon />
            </button>
            
            <!-- Editar -->
            <button 
              @click="editItem(item)"
              v-permission="'usuarios.editar'"
              title="Editar"
            >
              <EditIcon />
            </button>
            
            <!-- Eliminar -->
            <button 
              @click="deleteItem(item)"
              v-permission="'usuarios.eliminar'"
              title="Eliminar"
            >
              <TrashIcon />
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

### Componente con Header Dinámico
```vue
<template>
  <div class="page-header">
    <div>
      <h1>Gestión de Usuarios</h1>
      <p>Administra todos los usuarios del sistema</p>
    </div>
    
    <!-- Botón de crear - solo si tiene permiso -->
    <div class="actions">
      <button 
        @click="openCreateModal"
        v-permission="'usuarios.crear'"
        class="btn btn-primary"
      >
        <PlusIcon />
        Nuevo Usuario
      </button>
    </div>
  </div>
</template>
```

## Consideraciones Importantes

1. **Permisos en Español**: Todos los permisos usan nombres en español (ej: `usuarios.ver`, no `users.view`)

2. **Admin Role**: Los usuarios con `rol_id=2` (Admin) tienen acceso automático a todo dentro de su restaurante

3. **Super Admin**: Los usuarios con `rol_id=1` tienen acceso absoluto a todo el sistema

4. **RLS Policies**: Las políticas de Row Level Security en la base de datos refuerzan los permisos a nivel de datos

5. **JWT Claims**: Los permisos se inyectan en el JWT durante el login para acceso rápido desde el frontend

6. **Fallback**: Si un usuario no tiene permisos definidos, el sistema deniega el acceso por defecto

## Testing de Permisos

Para probar el sistema:

1. Crea diferentes usuarios con distintos roles
2. Asigna permisos específicos a roles personalizados
3. Verifica que los elementos de UI se muestren/oculten correctamente
4. Comprueba que las acciones estén deshabilitadas cuando corresponda
5. Verifica que la navegación filtre los elementos del menú apropiadamente

El sistema está diseñado para ser "defensa en profundidad" - funciona tanto en UI como en backend y base de datos.
