# 🔐 Configuración del Auth Hook - RBAC

## ✅ Estado de Implementación

### **Ya Implementado en la Base de Datos:**
1. ✅ Función `custom_access_token_hook()` - Inyecta permisos en JWT
2. ✅ Función `authorize()` optimizada - Lee permisos del JWT
3. ✅ Permisos otorgados a `supabase_auth_admin`

---

## 📋 Configuración Requerida en Supabase Dashboard

### **Paso 1: Activar el Auth Hook**

1. Ve al Dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto: **ezorder_v2**
3. Ve a **Authentication** → **Hooks (Beta)**
4. En la sección **Custom Access Token Hook**:
   - Habilita el hook
   - Selecciona la función: `public.custom_access_token_hook`
   - Haz clic en **Save**

### **Paso 2: Verificar que funciona**

Después de activar el hook, cada vez que un usuario inicie sesión, su JWT contendrá:

```json
{
  "user_permissions": ["usuarios.ver", "menu.crear", "..."],
  "is_super_admin": false,
  "rol_nombre": "Administrador",
  "rol_id": 2,
  "rol_personalizado_id": null
}
```

---

## 🔄 Flujo del Sistema RBAC

### **1. Login del Usuario**
```
Usuario → Login → Supabase Auth
                      ↓
            custom_access_token_hook()
                      ↓
            Lee permisos de BD
                      ↓
            Inyecta en JWT
                      ↓
            JWT con permisos → Cliente
```

### **2. Verificación de Permisos**

#### **A. En el Backend (Express Middleware)**
```typescript
// middleware verifica permisos en req.user_info
requirePermissions(['usuarios.ver'])
```

#### **B. En la Base de Datos (RLS)**
```sql
-- Políticas RLS usan authorize()
CREATE POLICY "policy_name" ON table
  FOR SELECT USING (authorize('table.ver'));
  
-- authorize() lee directamente del JWT
-- ¡Sin queries adicionales a la BD!
```

#### **C. En el Frontend (Vue Composable)**
```vue
<template>
  <!-- Directiva v-permission usa permisos del store -->
  <button v-permission="'usuarios.crear'">Crear</button>
</template>
```

---

## ⚡ Beneficios de Usar Auth Hook

### **Antes (Sin Auth Hook)**
- ❌ Cada verificación hacía 2-3 queries a la BD
- ❌ Lento en políticas RLS
- ❌ Carga alta en la base de datos

### **Después (Con Auth Hook)**
- ✅ Permisos en el JWT (1 sola vez al login)
- ✅ `authorize()` lee del JWT (sin queries)
- ✅ RLS super rápido
- ✅ Escalable para miles de usuarios

---

## 🧪 Testing del Auth Hook

### **Probar en el Backend**

1. Hacer login:
```bash
curl -X POST https://tu-proyecto.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

2. Decodificar el JWT en: https://jwt.io

3. Verificar que contenga:
```json
{
  "user_permissions": [...],
  "is_super_admin": false,
  "rol_nombre": "..."
}
```

### **Probar en el Frontend**

```typescript
import { useAuthStore } from '@/stores/auth_store';
import { jwtDecode } from 'jwt-decode';

const authStore = useAuthStore();
const token = localStorage.getItem('access_token');
const decoded = jwtDecode(token);

console.log('Permisos:', decoded.user_permissions);
console.log('Super Admin:', decoded.is_super_admin);
console.log('Rol:', decoded.rol_nombre);
```

---

## 🔧 Troubleshooting

### **Problema: El JWT no tiene los custom claims**

**Solución:**
1. Verifica que el Auth Hook esté activado en el Dashboard
2. Verifica que la función tenga los permisos correctos:
```sql
SELECT * FROM pg_proc WHERE proname = 'custom_access_token_hook';
```
3. Cierra sesión y vuelve a iniciar sesión

### **Problema: authorize() retorna false incorrectamente**

**Solución:**
1. Verifica el JWT con jwt.io
2. Verifica que `user_permissions` esté en el JWT
3. Revisa los logs de PostgreSQL:
```sql
-- Ver logs de la función
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%authorize%' 
ORDER BY calls DESC;
```

### **Problema: Necesito actualizar permisos sin logout**

**Solución:**
```typescript
// Forzar refresh del token
const { data } = await supabase.auth.refreshSession();
// El nuevo token tendrá los permisos actualizados
```

---

## 📝 Mantenimiento

### **Cuando agregues nuevos permisos:**
1. ✅ Agregar permiso a tabla `permisos`
2. ✅ Asignar a roles en `rol_permisos`
3. ✅ Usuario necesita **logout/login** para obtener nuevos permisos
4. ✅ O usar `refreshSession()`

### **Cuando cambies roles de usuario:**
1. ✅ Actualizar `usuarios_info.rol_personalizado_id`
2. ✅ Usuario necesita **logout/login**
3. ✅ O forzar `refreshSession()`

---

## 🎯 Checklist de Implementación

- [ ] Función `custom_access_token_hook` creada ✅
- [ ] Función `authorize` optimizada ✅
- [ ] Permisos otorgados a `supabase_auth_admin` ✅
- [ ] Auth Hook activado en Dashboard ⚠️ **PENDIENTE**
- [ ] Políticas RLS usan `authorize()` ✅
- [ ] Middleware backend verifica permisos ✅
- [ ] Frontend usa composable `usePermissions` ✅
- [ ] Directivas Vue implementadas ✅

---

## 📚 Referencias

- [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

**🚨 ACCIÓN REQUERIDA:**
Debes ir al Dashboard de Supabase y activar el Auth Hook manualmente.
Sin esto, los permisos NO se inyectarán en el JWT.
