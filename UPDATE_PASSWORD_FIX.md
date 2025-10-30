# Solución: Error 400 "Auth session missing!" en update-password

## Problema Original

Al intentar establecer contraseña desde un enlace de invitación de Supabase, se recibía el error:
```
HTTP 400: "Auth session missing!"
```

Esto ocurría porque el endpoint `/auth/update-password` no estaba correctamente implementado para manejar tokens de invitación.

## Análisis del Problema

### 1. **Entendiendo el Flujo de Invitación**
- Supabase envía enlaces de invitación con tokens en el hash fragment: `#access_token=...&refresh_token=...&type=invite`
- Para actualizar contraseña después de invitación, se requiere una sesión activa en Supabase
- El método `updateUser()` requiere que el usuario esté autenticado

### 2. **Errores Iniciales**
- **Error 1:** Uso incorrecto de `supabase.auth.getUser(accessToken)` (método no existe)
- **Error 2:** Interceptor de Axios sobrescribiendo headers de autorización
- **Error 3:** Falta de `refresh_token` en `setSession()` (requiere ambos tokens)

## Soluciones Implementadas

### Frontend: AuthCallback.vue

#### 1. **Parseo Correcto del Hash Fragment**
```typescript
// Función para extraer tokens del hash (#)
const parseHashParams = (): Record<string, string> => {
  const hash = window.location.hash.substring(1);
  const params: Record<string, string> = {};

  if (!hash) return params;

  hash.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key && value) {
      params[key] = decodeURIComponent(value);
    }
  });

  return params;
};
```

#### 2. **Captura de Ambos Tokens**
```typescript
// Variables reactivas para ambos tokens
const accessToken = ref('');
const refreshToken = ref('');

// En cada caso de invitación:
case 'invite':
case 'signup':
  if (access_token) {
    accessToken.value = access_token;
    refreshToken.value = refresh_token || ''; // Capturar refresh_token
    inviteType.value = type;
    success.value = true;
    loading.value = false;
  }
  break;
```

#### 3. **Envío de Ambos Tokens al Backend**
```typescript
const response = await AuthService.updatePassword(
  password.value,
  accessToken.value,
  refreshToken.value // Ahora se incluye el refresh_token
);
```

### Frontend: auth_service.ts

#### **Actualización del Servicio**
```typescript
updatePassword: async (
  password: string,
  accessToken: string,
  refreshToken?: string
): Promise<AxiosResponse<AuthResponse>> => {
  return await apiClient.post<AuthResponse>(
    '/auth/update-password',
    {
      password,
      refresh_token: refreshToken // Enviar refresh_token en el body
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
};
```

### Frontend: axios.ts

#### **Corrección del Interceptor**
```typescript
// ANTES: Sobrescribía todos los headers Authorization
if (token) {
  config.headers['Authorization'] = `Bearer ${token}`;
}

// DESPUÉS: Solo agrega si no existe
if (!config.headers['Authorization']) {
  const token = AuthService.getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
}
```

### Backend: authController.ts

#### **Endpoint updatePassword Corregido**
```typescript
export const updatePassword = async (req: Request, res: Response) => {
  // 1. Extraer tokens
  const authHeader = req.headers.authorization;
  const { password, refresh_token } = req.body;

  // 2. Crear cliente Supabase
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 3. Establecer sesión con AMBOS tokens (CRÍTICO)
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refresh_token || '', // Ambos tokens requeridos
  });

  // 4. Verificar sesión
  if (sessionError || !sessionData.session || !sessionData.user) {
    return res.status(401).json({
      ok: false,
      message: "Token inválido o expirado",
      error: sessionError?.message,
    });
  }

  // 5. Actualizar contraseña con sesión activa
  const { data, error } = await supabaseClient.auth.updateUser({
    password: password,
  });

  // 6. Respuesta exitosa
  return res.status(200).json({
    ok: true,
    message: "Contraseña actualizada exitosamente",
    user: data.user,
  });
};
```

## Flujo Final Funcionando

```
1. Usuario recibe email → Click en enlace
2. URL: http://localhost:5173/auth/callback#access_token=...&refresh_token=...&type=invite
3. AuthCallback parsea hash → Extrae access_token + refresh_token ✅
4. Usuario ingresa contraseña → Envía ambos tokens al backend ✅
5. Backend usa setSession(access_token, refresh_token) → Sesión activa ✅
6. Backend llama updateUser(password) → Contraseña actualizada ✅
7. Frontend hace login automático → Dashboard ✅
```

## Archivos Modificados

1. **`/src/modules/auth/views/AuthCallback.vue`**
   - Parseo del hash fragment
   - Captura de refresh_token
   - Envío de ambos tokens

2. **`/src/services/auth_service.ts`**
   - Método updatePassword actualizado para aceptar refresh_token

3. **`/src/plugins/axios.ts`**
   - Interceptor corregido para no sobrescribir headers Authorization

4. **`/src/controllers/authController.ts`**
   - Endpoint updatePassword completamente reescrito
   - Uso correcto de setSession() con ambos tokens

## Logs de Debug Agregados

Se agregaron logs detallados en el backend para facilitar la depuración futura:

```
========================================
🔐 UPDATE PASSWORD REQUEST RECEIVED
========================================
📦 Body: {...}
📋 Authorization Header: Present
Access Token length: 810
Refresh Token received: YES
✅ Validaciones básicas pasadas
🔧 Creando cliente Supabase...
🔍 Estableciendo sesión con el token...
✅ Sesión establecida. Usuario: lazaro-hernan@hotmail.com
📝 Actualizando contraseña...
✅ Contraseña actualizada exitosamente
```

## Pruebas

### Prueba Exitosa
- ✅ Endpoint responde correctamente con tokens válidos
- ✅ Contraseña se actualiza en Supabase
- ✅ Usuario puede hacer login automático

### Casos de Error
- ❌ Sin tokens: `HTTP 401 - Token no proporcionado`
- ❌ Tokens inválidos: `HTTP 401 - Token inválido o expirado`
- ❌ Sin contraseña: `HTTP 400 - La contraseña es obligatoria`
- ❌ Contraseña corta: `HTTP 400 - La contraseña debe tener al menos 6 caracteres`

## Conclusión

La solución implementada sigue las mejores prácticas de Supabase para manejar autenticación con tokens de invitación. El problema principal era que `setSession()` requiere tanto el `access_token` como el `refresh_token` para establecer una sesión válida, algo que no estaba documentado claramente en versiones anteriores.

Ahora el flujo de invitación funciona completamente:
- Parseo correcto del hash fragment
- Envío seguro de ambos tokens
- Establecimiento de sesión en Supabase
- Actualización de contraseña
- Login automático del usuario
