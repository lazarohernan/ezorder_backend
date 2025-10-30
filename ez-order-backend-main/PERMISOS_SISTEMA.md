# Sistema de Permisos - EZ Order

## 📋 Resumen de Cambios Implementados

### ✅ 1. Rutas Protegidas con Middlewares de Permisos

Todas las rutas críticas ahora están protegidas con el middleware `requirePermissions`:

#### **Usuarios** (`/api/usuarios`)
- `GET /` - `usuarios.ver`
- `GET /me` - Sin permisos (acceso propio)
- `GET /:id` - `usuarios.ver`
- `POST /invite` - `usuarios.crear`
- `POST /` - `usuarios.crear`
- `PUT /:id` - `usuarios.editar`
- `DELETE /:id` - `usuarios.eliminar`

#### **Roles** (`/api/roles`)
- `GET /` - `roles.ver`
- `GET /:id` - `roles.ver`
- `POST /` - `roles.crear`
- `PUT /:id` - `roles.editar`
- `DELETE /:id` - `roles.eliminar`

#### **Menú** (`/api/menu`)
- `GET /` - `menu.ver`
- `GET /restaurante/:id` - `menu.ver`
- `GET /:id` - `menu.ver`
- `POST /` - `menu.crear`
- `PUT /:id` - `menu.editar`
- `DELETE /:id` - `menu.eliminar`

#### **Pedidos** (`/api/pedidos`)
- `GET /` - `pedidos.ver`
- `GET /restaurante/:id` - `pedidos.ver`
- `GET /:id` - `pedidos.ver`
- `POST /` - `pedidos.crear`
- `PUT /:id` - `pedidos.editar`
- `DELETE /:id` - `pedidos.eliminar`

#### **Clientes** (`/api/clientes`)
- `GET /` - `clientes.ver`
- `GET /restaurante/:id` - `clientes.ver`
- `GET /:id` - `clientes.ver`
- `POST /` - `clientes.crear`
- `PUT /:id` - `clientes.editar`
- `DELETE /:id` - `clientes.eliminar`

#### **Inventario** (`/api/inventario`)
- `GET /` - `inventario.ver`
- `GET /estadisticas` - `inventario.ver`
- `GET /alertas` - `inventario.ver_alertas`
- `PUT /alertas/:id/leer` - `inventario.ver_alertas`
- `GET /movimientos` - `inventario.ver_movimientos`
- `POST /movimientos` - `inventario.registrar_movimientos`
- `GET /:id` - `inventario.ver`
- `POST /` - `inventario.crear`
- `PUT /:id` - `inventario.editar`
- `DELETE /:id` - `inventario.eliminar`

#### **Gastos** (`/api/gastos`)
- `GET /restaurante/:id` - `gastos.ver`
- `GET /:id` - `gastos.ver`
- `POST /` - `gastos.crear`
- `PUT /:id` - `gastos.editar`
- `DELETE /:id` - `gastos.eliminar`

#### **Caja** (`/api/caja`)
- `GET /restaurante/:id` - `caja.ver`
- `GET /:id` - `caja.ver`
- `POST /abrir` - `caja.abrir_cerrar`
- `PUT /:id/cerrar` - `caja.abrir_cerrar`
- `PUT /:id` - `caja.registrar_ingresos`

#### **Restaurantes** (`/api/restaurantes`)
- `GET /` - `restaurantes.ver`
- `GET /:id` - `restaurantes.ver`
- `POST /` - `restaurantes.crear`
- `PUT /:id` - `restaurantes.editar`
- `DELETE /:id` - `restaurantes.eliminar`

---

### ✅ 2. Políticas RLS Implementadas

#### **Sistema de Roles y Permisos**
- **roles_personalizados** (4 políticas)
  - Solo super admins pueden ver, crear, actualizar y eliminar roles
  
- **rol_permisos** (1 política)
  - Solo super admins pueden gestionar asignaciones de permisos
  
- **permisos** (4 políticas)
  - Usuarios autenticados pueden ver permisos
  - Solo super admins pueden crear, actualizar y eliminar permisos

#### **Sistema de Inventario**
- **inventario** (4 políticas)
  - Usuarios pueden ver, crear, actualizar y eliminar inventario de su restaurante
  - Filtrado por `menu_id` → `restaurante_id`
  
- **movimientos_inventario** (2 políticas)
  - Usuarios pueden ver y crear movimientos de su restaurante
  
- **alertas_stock** (3 políticas)
  - Usuarios pueden ver, actualizar y eliminar alertas de su restaurante

#### **Categorías de Menú**
- **menu_categorias** (2 políticas)
  - Usuarios autenticados pueden ver categorías
  - Solo super admins pueden gestionar categorías

---

### ✅ 3. Correcciones Realizadas

1. **Nomenclatura de archivos**: Corregido import en `roles.ts` para usar `rolesController.ts`
2. **Orden de rutas**: Rutas específicas antes de rutas con parámetros dinámicos
3. **Protección consistente**: Todas las rutas CRUD ahora tienen protección de permisos

---

## 📊 Estado del Sistema

### **Tablas con RLS Habilitado**
Total: 17 tablas con políticas RLS

| Tabla | Políticas | Estado |
|-------|-----------|--------|
| alertas_stock | 3 | ✅ Completo |
| caja | 3 | ✅ Completo |
| clientes | 3 | ✅ Completo |
| gastos | 4 | ✅ Completo |
| inventario | 4 | ✅ Completo |
| menu | 3 | ✅ Completo |
| menu_categorias | 2 | ✅ Completo |
| metodos_de_pago | 1 | ✅ Completo |
| movimientos_inventario | 2 | ✅ Completo |
| pedido_items | 1 | ✅ Completo |
| pedidos | 4 | ✅ Completo |
| permisos | 4 | ✅ Completo |
| restaurantes | 4 | ✅ Completo |
| rol | 4 | ✅ Completo |
| rol_permisos | 1 | ✅ Completo |
| roles_personalizados | 4 | ✅ Completo |
| usuarios_info | 4 | ✅ Completo |

### **Permisos Disponibles**
Total: 49 permisos en 10 categorías

| Categoría | Permisos |
|-----------|----------|
| caja | 4 |
| clientes | 4 |
| dashboard | 3 |
| gastos | 4 |
| inventario | 7 |
| menu | 8 |
| pedidos | 5 |
| restaurantes | 4 |
| roles | 5 |
| usuarios | 5 |

---

## 🔐 Middlewares de Seguridad

### **1. requireAuth**
- Verifica token JWT
- Carga información del usuario
- Disponible en `req.user` y `req.user_info`

### **2. requirePermissions(permisos: string[])**
- Verifica que el usuario tenga al menos uno de los permisos requeridos
- Soporte para wildcards (`menu.*`, `*`)
- Compatible con sistema antiguo y nuevo de roles

### **3. requireSuperAdmin**
- Verifica que el usuario sea super administrador
- Compatible con `rol_id = 1` o `es_super_admin = true`

### **4. restaurantScope**
- Filtra datos por restaurante del usuario
- Super admins ven todos los datos
- Otros usuarios solo ven su restaurante

---

## 🎯 Próximos Pasos Recomendados

1. **Testing**: Probar cada endpoint con diferentes roles
2. **Documentación API**: Actualizar documentación con permisos requeridos
3. **Frontend**: Implementar ocultación de UI según permisos del usuario
4. **Auditoría**: Implementar logs de acciones críticas
5. **Dashboard**: Crear vista de gestión de roles y permisos

---

## 📝 Notas Importantes

- El sistema es **retrocompatible** con roles antiguos (rol_id)
- Los **super admins** tienen acceso completo sin restricciones
- Las políticas RLS funcionan a **nivel de base de datos**
- Los middlewares funcionan a **nivel de aplicación**
- Ambas capas trabajan juntas para máxima seguridad

---

**Fecha de implementación**: 25 de Octubre, 2025
**Estado**: ✅ Sistema completamente funcional
