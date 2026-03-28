# Fastify Native Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar la capa de compatibilidad Express→Fastify y migrar todos los controladores y middlewares del backend EZOrder a Fastify 5 nativo, manteniendo toda la lógica de negocio intacta.

**Architecture:** La migración es mecánica y aditiva: primero se crean los tipos y se extrae la utilidad multipart, luego se migran los middlewares (que afectan a todas las rutas), luego `registerRoutes.ts` (que orquesta todo), y finalmente los 24 controladores en paralelo por módulo. La eliminación del código muerto ocurre al final, una vez que el build TypeScript pasa.

**Tech Stack:** Fastify 5, `@fastify/multipart`, `@fastify/cors`, `@fastify/formbody`, Supabase JS v2, TypeScript 5.

---

## Archivos del Plan

| Acción | Archivo |
|--------|---------|
| Crear | `postman_collection.json` (raíz del backend) |
| Crear | `postman_environment.json` (raíz del backend) |
| Crear | `src/types/fastify.d.ts` |
| Crear | `src/utils/multipart.ts` |
| Modificar | `src/app.ts` |
| Modificar | `src/middlewares/auth.ts` |
| Modificar | `src/middlewares/permissions.ts` |
| Modificar | `src/http/registerRoutes.ts` |
| Modificar | `src/controllers/authController.ts` |
| Modificar | `src/controllers/usuarioController.ts` |
| Modificar | `src/controllers/rolController.ts` |
| Modificar | `src/controllers/rolesController.ts` |
| Modificar | `src/controllers/menuController.ts` |
| Modificar | `src/controllers/menuCategoriesController.ts` |
| Modificar | `src/controllers/descuentoController.ts` |
| Modificar | `src/controllers/metodoPagoController.ts` |
| Modificar | `src/controllers/pedidoController.ts` |
| Modificar | `src/controllers/pedidoItemController.ts` |
| Modificar | `src/controllers/cocinaController.ts` |
| Modificar | `src/controllers/cajaController.ts` |
| Modificar | `src/controllers/gastosController.ts` |
| Modificar | `src/controllers/reportesController.ts` |
| Modificar | `src/controllers/inventarioController.ts` |
| Modificar | `src/controllers/clienteController.ts` |
| Modificar | `src/controllers/restauranteController.ts` |
| Modificar | `src/controllers/notificacionesController.ts` |
| Modificar | `src/controllers/invitacionController.ts` |
| Modificar | `src/controllers/facturacionController.ts` |
| Modificar | `src/controllers/scanSessionController.ts` |
| Modificar | `src/controllers/unidadesMedidaController.ts` |
| Modificar | `src/controllers/healthController.ts` |
| Modificar | `src/controllers/uploadsController.ts` |
| Modificar | `package.json` |
| Eliminar | `src/http/compat.ts` |
| Eliminar | `src/routes/` (22 archivos) |
| Eliminar | `src/types/express.d.ts`, `src/types/express.ts`, `src/types/express/index.d.ts` |

---

## Task 1: Crear Colección Postman (Baseline)

**Files:**
- Create: `postman_collection.json`
- Create: `postman_environment.json`

- [ ] **Step 1: Levantar el servidor para verificar que funciona antes de migrar**

```bash
cd ezorder_backend-main
npm run dev
```

Esperar: `Server listening at http://0.0.0.0:3001`

- [ ] **Step 2: Crear el entorno Postman**

Crear `postman_environment.json` en la raíz de `ezorder_backend-main/`:

```json
{
  "id": "ezorder-local-env",
  "name": "EZOrder Local",
  "values": [
    { "key": "base_url", "value": "http://localhost:3001", "enabled": true },
    { "key": "access_token", "value": "", "enabled": true },
    { "key": "refresh_token", "value": "", "enabled": true },
    { "key": "restaurante_id", "value": "", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}
```

- [ ] **Step 3: Crear la colección Postman con los 17 flujos críticos**

Crear `postman_collection.json` en la raíz de `ezorder_backend-main/`:

```json
{
  "info": {
    "name": "EZOrder API - Flujos Críticos",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "01 Register",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth/register",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\"email\": \"test@ezorder.com\", \"password\": \"Test1234!\", \"nombre\": \"Test User\"}"
            }
          }
        },
        {
          "name": "02 Login",
          "event": [{
            "listen": "test",
            "script": {
              "exec": [
                "const res = pm.response.json();",
                "if (res.data?.session?.access_token) {",
                "  pm.environment.set('access_token', res.data.session.access_token);",
                "  pm.environment.set('refresh_token', res.data.session.refresh_token);",
                "}"
              ]
            }
          }],
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth/login",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\"email\": \"test@ezorder.com\", \"password\": \"Test1234!\"}"
            }
          }
        },
        {
          "name": "03 Check Session",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/auth/session",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "04 Refresh Token",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth/refresh",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\"refresh_token\": \"{{refresh_token}}\"}"
            }
          }
        },
        {
          "name": "05 Logout",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth/logout",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        }
      ]
    },
    {
      "name": "Módulos",
      "item": [
        {
          "name": "06 GET /api/usuarios/me",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/usuarios/me",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "07 GET /api/roles",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/roles",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "08 GET /api/menu",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/menu",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "09 GET /api/menu/categorias",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/menu/categorias",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "10 GET /api/pedidos",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/pedidos",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "11 GET /api/clientes",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/clientes",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "12 GET /api/inventario",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/inventario",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "13 GET /api/caja/restaurante/:id/actual",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/caja/restaurante/{{restaurante_id}}/actual",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "14 GET /api/gastos/restaurante/:id",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/gastos/restaurante/{{restaurante_id}}",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "15 GET /api/reportes/ventas",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/reportes/ventas",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "16 GET /api/facturacion/facturas",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/facturacion/facturas",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        },
        {
          "name": "17 GET /api/notificaciones",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/notificaciones",
            "header": [{ "key": "Authorization", "value": "Bearer {{access_token}}" }]
          }
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Importar en Postman y correr el baseline**

En Postman:
1. File → Import → seleccionar `postman_collection.json`
2. File → Import → seleccionar `postman_environment.json`
3. Seleccionar entorno "EZOrder Local"
4. Correr request `02 Login` primero (guarda el token automáticamente)
5. Correr los 17 requests y anotar los status codes obtenidos

Esperar: todos responden 200/201/400/401 (no 500 ni connection refused)

- [ ] **Step 5: Commit**

```bash
git add postman_collection.json postman_environment.json
git commit -m "chore: agregar colección Postman con flujos críticos para baseline de migración"
```

---

## Task 2: Crear `src/types/fastify.d.ts`

**Files:**
- Create: `src/types/fastify.d.ts`

- [ ] **Step 1: Crear el archivo de augmentación de tipos Fastify**

Crear `src/types/fastify.d.ts`:

```typescript
import type { User } from "@supabase/supabase-js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    user_info?: any;
    restaurante_filter?: string;
    files?: Record<string, any>;
  }
}
```

- [ ] **Step 2: Verificar que TypeScript reconoce los tipos**

```bash
cd ezorder_backend-main
npm run build 2>&1 | head -20
```

Esperar: puede haber errores de compilación en otros archivos (aún usan Express), pero NO debe haber errores relacionados con `FastifyRequest` custom properties.

- [ ] **Step 3: Commit**

```bash
git add src/types/fastify.d.ts
git commit -m "feat: agregar augmentación de tipos FastifyRequest para propiedades custom"
```

---

## Task 3: Extraer `parseMultipartRequest` a `src/utils/multipart.ts`

**Files:**
- Create: `src/utils/multipart.ts`
- Modify: `src/http/registerRoutes.ts` (cambiar import)

Este paso extrae la única función de `compat.ts` que será reutilizada fuera del compat layer.

- [ ] **Step 1: Crear `src/utils/multipart.ts` con la función extraída**

Crear `src/utils/multipart.ts`:

```typescript
import type { FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";

type UploadedFile = {
  name: string;
  data: Buffer;
  size: number;
  encoding: string;
  tempFilePath: string;
  truncated: boolean;
  mimetype: string;
  md5: string;
  mv: () => Promise<void>;
};

type UploadedFileMap = Record<string, UploadedFile | UploadedFile[]>;

const pushValue = <T>(current: T | T[] | undefined, value: T): T | T[] => {
  if (current === undefined) return value;
  if (Array.isArray(current)) { current.push(value); return current; }
  return [current, value];
};

const createUploadedFile = async (part: MultipartFile): Promise<UploadedFile> => {
  const buffer = await part.toBuffer();
  return {
    name: part.filename,
    data: buffer,
    size: buffer.length,
    encoding: part.encoding,
    tempFilePath: "",
    truncated: false,
    mimetype: part.mimetype,
    md5: "",
    mv: async () => { throw new Error("mv() no está soportado en Fastify"); },
  };
};

export const parseMultipartRequest = async (request: FastifyRequest) => {
  const body: Record<string, unknown> = {};
  const files: UploadedFileMap = {};

  if (!request.isMultipart()) {
    return { body, files: undefined };
  }

  try {
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === "file") {
        const uploadedFile = await createUploadedFile(part);
        files[part.fieldname] = pushValue(files[part.fieldname] as any, uploadedFile) as UploadedFile | UploadedFile[];
        continue;
      }
      body[part.fieldname] = pushValue(body[part.fieldname] as any, part.value);
    }
  } catch (error: any) {
    if (
      error?.code === "FST_REQ_FILE_TOO_LARGE" ||
      error?.code === "FST_FILES_LIMIT" ||
      error?.code === "FST_PARTS_LIMIT"
    ) {
      error.statusCode = 400;
      error.message = "El archivo excede el tamaño máximo permitido de 5MB";
    }
    throw error;
  }

  return {
    body,
    files: Object.keys(files).length > 0 ? files : undefined,
  };
};

export type { UploadedFile, UploadedFileMap };
```

- [ ] **Step 2: Actualizar el import en `registerRoutes.ts`**

En `src/http/registerRoutes.ts`, cambiar la línea:

```typescript
// Antes (línea ~152-156)
import {
  createCompatibilityContext,
  parseMultipartRequest,
  runExpressHandlers,
  type ExpressLikeHandler,
} from "./compat";
```

Por:

```typescript
import {
  createCompatibilityContext,
  runExpressHandlers,
  type ExpressLikeHandler,
} from "./compat";
import { parseMultipartRequest } from "../utils/multipart";
```

- [ ] **Step 3: Verificar que el servidor sigue funcionando**

```bash
npm run dev
```

Esperar: servidor levanta en puerto 3001 sin errores. Hacer un request rápido a `GET http://localhost:3001/api/health`.

- [ ] **Step 4: Commit**

```bash
git add src/utils/multipart.ts src/http/registerRoutes.ts
git commit -m "refactor: extraer parseMultipartRequest de compat.ts a utils/multipart.ts"
```

---

## Task 4: Migrar `src/app.ts`

**Files:**
- Modify: `src/app.ts`

- [ ] **Step 1: Reemplazar el contenido completo de `src/app.ts`**

El archivo actual usa `createCompatibilityContext` y `runExpressHandlers` para la ruta `/api/health`. Reemplazar con la versión nativa:

```typescript
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyFormbody from "@fastify/formbody";
import fastifyMultipart from "@fastify/multipart";
import checkDatabaseConnection from "./controllers/healthController";
import { corsOptions } from "./http/cors";
import { registerRoutes } from "./http/registerRoutes";

export const buildApp = async () => {
  const app = Fastify({
    logger: false,
    bodyLimit: 5 * 1024 * 1024,
  });

  await app.register(fastifyCors, corsOptions);
  await app.register(fastifyFormbody);
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });

  // Declarar propiedades custom del request (requerido por Fastify 5)
  app.decorateRequest("user", { getter: () => null });
  app.decorateRequest("user_info", { getter: () => null });
  app.decorateRequest("restaurante_filter", { getter: () => undefined });
  app.decorateRequest("files", { getter: () => null });

  if (process.env.NODE_ENV !== "production") {
    app.addHook("onRequest", async (request) => {
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const method = request.method.padEnd(6);
      const methodEmoji =
        {
          GET: "✓",
          POST: "+",
          PUT: "↻",
          DELETE: "✗",
          PATCH: "~",
        }[request.method] || "•";

      console.log(`  ${timestamp} ${methodEmoji} ${method} ${request.url.split("?")[0]}`);
    });
  }

  app.get("/", async () => ({
    success: true,
    message: "Connection successful",
    api: {
      name: "EZOrder API",
      version: "1.0.0",
      status: "online",
      environment: process.env.NODE_ENV || "production",
    },
    endpoints: {
      health: "/api/health",
      auth: "/api/auth/login",
      docs: "/api/health",
    },
    timestamp: new Date().toISOString(),
    deployment: "fastify",
  }));

  app.get("/api", async () => ({
    message: "API de EZOrder funcionando correctamente",
    status: "ok",
  }));

  // Ruta health — se migra a nativo una vez que healthController.ts esté migrado (Task 9)
  // Por ahora se mantiene con compat para evitar romper el servidor durante la migración
  const { createCompatibilityContext, runExpressHandlers } = await import("./http/compat");
  app.get("/api/health", async (request, reply) => {
    const context = createCompatibilityContext(request, reply);
    await runExpressHandlers([checkDatabaseConnection as any], context);
  });

  await registerRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    const errorWithStatus = error as {
      message?: string;
      status?: number;
      statusCode?: number;
    };
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    console.error(
      `  ${timestamp} ✗ ${request.method} ${request.url.split("?")[0]} → ${errorWithStatus.message || "Error"}`
    );

    reply.status(errorWithStatus.statusCode || errorWithStatus.status || 500).send({
      error: errorWithStatus.message || "Internal server error",
      status: errorWithStatus.statusCode || errorWithStatus.status || 500,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: "Not found",
      path: request.url.split("?")[0],
      method: request.method,
    });
  });

  return app;
};
```

> **Nota:** La ruta `/api/health` en `app.ts` se migra completamente en Task 9 cuando `healthController.ts` esté en Fastify nativo. Mientras tanto, la importación dinámica de compat mantiene el servidor funcional.

- [ ] **Step 2: Verificar que el servidor levanta**

```bash
npm run dev
```

Esperar: servidor levanta, `GET http://localhost:3001/api/health` responde 200.

- [ ] **Step 3: Commit**

```bash
git add src/app.ts
git commit -m "feat: agregar decorateRequest en app.ts para propiedades custom de Fastify"
```

---

## Task 5: Migrar `src/middlewares/auth.ts`

**Files:**
- Modify: `src/middlewares/auth.ts`

- [ ] **Step 1: Reemplazar el contenido completo de `src/middlewares/auth.ts`**

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

/**
 * Middleware para verificar que el usuario está autenticado.
 * Se espera que se envíe el token en el header Authorization: Bearer token
 */
export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({
        ok: false,
        message: "No se proporcionó un token de autenticación",
      });
    }

    const token = authHeader.split(" ")[1];

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return reply.code(401).send({
        ok: false,
        message: "Token inválido o expirado",
        error: error?.message,
      });
    }

    request.user = data.user;

    if (!supabaseAdmin) {
      request.user_info = null;
    } else {
      const { data: userInfoData, error: userInfoError } = await supabaseAdmin
        .from("usuarios_info")
        .select("*")
        .eq("id", data.user.id)
        .limit(1);

      if (userInfoError) {
        console.error("No se pudo obtener información adicional del usuario:", userInfoError);
        request.user_info = null;
      } else {
        request.user_info = userInfoData && userInfoData.length > 0 ? userInfoData[0] : null;
      }
    }
  } catch (error) {
    console.error("Error en middleware de autenticación:", error);
    return reply.code(500).send({
      ok: false,
      message: "Error en el servidor al verificar autenticación",
    });
  }
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npm run build 2>&1 | grep "auth.ts"
```

Esperar: sin errores en `auth.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/middlewares/auth.ts
git commit -m "feat: migrar requireAuth middleware de Express a Fastify nativo"
```

---

## Task 6: Migrar `src/middlewares/permissions.ts`

**Files:**
- Modify: `src/middlewares/permissions.ts`

- [ ] **Step 1: Reemplazar el contenido completo de `src/middlewares/permissions.ts`**

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import { supabaseAdmin } from "../supabase/supabase";

export const requirePermissions = (requiredPermissions: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user_info) {
        return reply.code(401).send({
          ok: false,
          message: "Usuario no autenticado",
        });
      }

      // Super Admin siempre tiene acceso
      if (request.user_info.rol_id === 1 || request.user_info.es_super_admin) {
        return;
      }

      // Admin siempre tiene acceso
      if (request.user_info.rol_id === 2) {
        return;
      }

      const rolPersonalizadoId = request.user_info.rol_personalizado_id;
      if (!rolPersonalizadoId) {
        return reply.code(403).send({
          ok: false,
          message:
            "No tienes permisos para realizar esta acción. Contacta al administrador para que te asigne un rol.",
        });
      }

      if (!supabaseAdmin) {
        return reply.code(500).send({
          ok: false,
          message: "Error de configuración del servidor",
        });
      }

      const { data: userPermissions, error } = await supabaseAdmin
        .from("rol_permisos")
        .select("permisos!inner(nombre)")
        .eq("rol_id", rolPersonalizadoId);

      if (error) {
        console.error("Error al obtener permisos:", error);
        return reply.code(500).send({
          ok: false,
          message: "Error al verificar permisos",
        });
      }

      const permissionNames = userPermissions.map((rp: any) => rp.permisos.nombre);

      const hasPermission = requiredPermissions.some((permission) => {
        if (permissionNames.includes("*")) return true;
        if (permissionNames.includes(permission)) return true;

        if (permission.includes("*")) {
          const prefix = permission.replace("*", "");
          return permissionNames.some((p: string) => p.startsWith(prefix));
        }

        const matchingWildcard = permissionNames.find((p: string) => p.endsWith(".*"));
        if (matchingWildcard) {
          const prefix = matchingWildcard.replace(".*", "");
          if (permission.startsWith(prefix + ".")) return true;
        }

        return false;
      });

      if (!hasPermission) {
        return reply.code(403).send({
          ok: false,
          message: "No tienes permisos para realizar esta acción",
        });
      }
    } catch (error) {
      console.error("Error en middleware de permisos:", error);
      throw error;
    }
  };
};

export const requireSuperAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(401).send({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    if (
      request.user_info.rol_id === 1 ||
      request.user_info.rol_id === 2 ||
      request.user_info.es_super_admin
    ) {
      return;
    }

    if (request.user_info.rol_personalizado_id) {
      if (!supabaseAdmin) {
        return reply.code(500).send({
          ok: false,
          message: "Error de configuración del servidor",
        });
      }

      const { data: roleData, error } = await supabaseAdmin
        .from("roles_personalizados")
        .select("es_super_admin")
        .eq("id", request.user_info.rol_personalizado_id)
        .single();

      if (error || !roleData?.es_super_admin) {
        return reply.code(403).send({
          ok: false,
          message: "Se requieren permisos de super administrador",
        });
      }

      return;
    }

    return reply.code(403).send({
      ok: false,
      message: "Se requieren permisos de administrador",
    });
  } catch (error) {
    console.error("Error en middleware de super admin:", error);
    throw error;
  }
};

export const restaurantScope = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(401).send({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    if (request.user_info.rol_id === 1 || request.user_info.es_super_admin) {
      return;
    }

    if (request.user_info.rol_id === 2) {
      return;
    }

    if (request.user_info.rol_personalizado_id && supabaseAdmin) {
      const { data: roleData } = await supabaseAdmin
        .from("roles_personalizados")
        .select("es_super_admin")
        .eq("id", request.user_info.rol_personalizado_id)
        .single();

      if (roleData?.es_super_admin) {
        return;
      }
    }

    const restauranteId = request.user_info.restaurante_id;
    if (!restauranteId) {
      return reply.code(403).send({
        ok: false,
        message: "No tienes un restaurante asignado",
      });
    }

    request.restaurante_filter = restauranteId;
  } catch (error) {
    console.error("Error en middleware de scope de restaurante:", error);
    throw error;
  }
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npm run build 2>&1 | grep "permissions.ts"
```

Esperar: sin errores en `permissions.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/middlewares/permissions.ts
git commit -m "feat: migrar requirePermissions, requireSuperAdmin y restaurantScope a Fastify nativo"
```

---

## Task 7: Migrar `src/http/registerRoutes.ts`

**Files:**
- Modify: `src/http/registerRoutes.ts`

Este es el archivo más crítico de la migración. Cambia la arquitectura de "todos los handlers van por compat" a "preHandler[] + handler nativo".

- [ ] **Step 1: Actualizar el tipo `RouteDefinition` y la función `registerRoute`**

Reemplazar las secciones de tipos e inline handlers al inicio del archivo (líneas 1-211 aprox). El bloque de rutas (`routes: RouteDefinition[]`) NO cambia su contenido lógico, solo cambia el tipo.

Reemplazar desde la línea 1 hasta el inicio de `export const registerRoutes`:

```typescript
import type { FastifyInstance, FastifyReply, FastifyRequest, HTTPMethods } from "fastify";
import {
  checkRefreshToken,
  checkSession,
  getUserInfo,
  login,
  logout,
  refreshToken,
  register,
  sendPasswordReset,
  updatePassword,
} from "../controllers/authController";
import { cajaController } from "../controllers/cajaController";
import {
  createCliente,
  deleteCliente,
  getClienteById,
  getClientes,
  getClientesByRestauranteId,
  updateCliente,
} from "../controllers/clienteController";
import { getPedidosCocina } from "../controllers/cocinaController";
import {
  createDescuento,
  deleteDescuento,
  getDescuentoById,
  getDescuentos,
  getDescuentosActivos,
  updateDescuento,
} from "../controllers/descuentoController";
import { facturacionController } from "../controllers/facturacionController";
import { gastosController } from "../controllers/gastosController";
import {
  crearInventario,
  crearMovimiento,
  crearReglaDesglose,
  actualizarInventario,
  eliminarAlerta,
  eliminarInventario,
  eliminarReglaDesglose,
  marcarAlertaLeida,
  marcarTodasAlertasLeidas,
  obtenerAlertas,
  obtenerDesglose,
  obtenerEstadisticas,
  obtenerInventario,
  obtenerInventarioPorId,
  obtenerMovimientos,
  obtenerProductosStockBajo,
  verificarStockDisponible,
} from "../controllers/inventarioController";
import {
  createInvitacion,
  deleteInvitacion,
  getInvitaciones,
  resendInvitacion,
} from "../controllers/invitacionController";
// ... (mantener todos los imports de controladores existentes)
import { requireAuth } from "../middlewares/auth";
import {
  requirePermissions,
  requireSuperAdmin,
} from "../middlewares/permissions";
import { parseMultipartRequest } from "../utils/multipart";

type PreHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
type Handler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

type RouteDefinition = {
  method: HTTPMethods;
  url: string;
  preHandler?: PreHandler[];
  handler: Handler;
};

const cajaLogger = async (request: FastifyRequest, _reply: FastifyReply) => {
  console.log(`[CAJA] ${request.method} ${request.url}`);
};

const gastosLogger = async (request: FastifyRequest, _reply: FastifyReply) => {
  console.log(`[GASTOS] ${request.method} ${request.url}`);
};

const multipartPreHandler = async (request: FastifyRequest, _reply: FastifyReply) => {
  const { body, files } = await parseMultipartRequest(request);
  request.body = { ...(request.body as object || {}), ...body } as any;
  if (files) request.files = files;
};

const registerRoute = (app: FastifyInstance, route: RouteDefinition) => {
  app.route({
    method: route.method,
    url: route.url,
    preHandler: route.preHandler,
    handler: route.handler,
  });
};
```

- [ ] **Step 2: Actualizar el array `routes` en `registerRoutes`**

El patrón de transformación es:

```typescript
// Antes
{ method: "GET", url: "/api/pedidos", handlers: [requireAuth, requirePermissions(["pedidos.ver"]), getPedidos] }

// Después
{ method: "GET", url: "/api/pedidos", preHandler: [requireAuth, requirePermissions(["pedidos.ver"])], handler: getPedidos }

// Rutas sin middleware (auth pública)
{ method: "POST", url: "/api/auth/login", handlers: [login] }
// →
{ method: "POST", url: "/api/auth/login", handler: login }

// Rutas con multipart
{ method: "POST", url: "/api/uploads", handlers: [requireAuth, multipartUploadMiddleware, uploadFile] }
// →
{ method: "POST", url: "/api/uploads", preHandler: [requireAuth, multipartPreHandler], handler: uploadFile }
```

Aplicar este patrón a TODAS las rutas del array (~147 rutas). Las rutas con `cajaTestRoute` o `gastosTestRoute` como handler deben ser **eliminadas** del array.

> **Nota sobre `rolController` vs `rolesController`:** Ambos archivos existen y sus funciones son importadas con alias en `registerRoutes.ts` para evitar colisiones de nombres. Al migrar estos controladores, NO eliminar los alias de importación.

- [ ] **Step 3: Eliminar imports de compat del registerRoutes**

Asegurarse de que `registerRoutes.ts` ya NO importa nada de `./compat`.

- [ ] **Step 4: Verificar TypeScript**

```bash
npm run build 2>&1 | grep -E "(registerRoutes|error TS)"
```

Esperar: sin errores de TypeScript en registerRoutes.ts.

- [ ] **Step 5: Verificar servidor y endpoints básicos**

```bash
npm run dev
```

Hacer: `POST http://localhost:3001/api/auth/login` con credenciales válidas.
Esperar: respuesta 200 con `access_token`.

- [ ] **Step 6: Commit**

```bash
git add src/http/registerRoutes.ts
git commit -m "feat: migrar registerRoutes.ts a Fastify nativo — preHandler[] + handler, eliminar compat"
```

---

## Task 8: Migrar Controladores — Grupo Auth/Usuarios (4 archivos)

**Files:**
- Modify: `src/controllers/authController.ts`
- Modify: `src/controllers/usuarioController.ts`
- Modify: `src/controllers/rolController.ts`
- Modify: `src/controllers/rolesController.ts`

**Patrón de migración para TODOS los controladores:**

```typescript
// ANTES — encabezado de cada archivo
import { Request, Response } from "express";
// ...
export const miHandler = async (req: Request, res: Response) => {
  const { campo } = req.body;          // body tipado como any en Express
  const { id } = req.params;
  res.status(200).json({ ok: true });
  res.status(401).json({ ok: false }); return;
};

// DESPUÉS
import type { FastifyRequest, FastifyReply } from "fastify";
// ...
export const miHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as { campo: string };   // cast explícito
  const params = request.params as { id: string };
  return reply.send({ ok: true });
  return reply.code(401).send({ ok: false });
};
```

**Reglas:**
1. `import { Request, Response } from "express"` → `import type { FastifyRequest, FastifyReply } from "fastify"`
2. `import "../types/express"` → eliminar esta línea
3. `async (req: Request, res: Response)` → `async (request: FastifyRequest, reply: FastifyReply)`
4. `req.body` → `request.body as { ... }` (cast al tipo esperado)
5. `req.params` → `request.params as { id: string }` (o el tipo adecuado)
6. `req.query` → `request.query as { ... }`
7. `req.headers` → `request.headers`
8. `req.user_info` → `request.user_info`
9. `req.files` → `request.files`
10. `req.restaurante_filter` → `request.restaurante_filter`
11. `res.json({ ... })` → `reply.send({ ... })`
12. `res.status(X).json({ ... }); return;` → `return reply.code(X).send({ ... });`
13. `res.status(X).json({ ... })` (sin return) → `return reply.code(X).send({ ... });`
14. `res.status(200).json(...)` → `reply.send(...)` (200 es el default)

- [ ] **Step 1: Migrar `authController.ts`** — aplicar las reglas anteriores a las ~918 líneas del archivo. Prestar atención especial a los `return res.status(X).json(...)` que deben convertirse en `return reply.code(X).send(...)`.

- [ ] **Step 2: Migrar `usuarioController.ts`** — aplicar las reglas.

- [ ] **Step 3: Migrar `rolController.ts`** — aplicar las reglas.

- [ ] **Step 4: Migrar `rolesController.ts`** — aplicar las reglas.

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run build 2>&1 | grep -E "(authController|usuarioController|rolController|rolesController)"
```

Esperar: sin errores en estos archivos.

- [ ] **Step 6: Verificar endpoints de auth**

Levantar `npm run dev`, correr en Postman:
- `02 Login` → esperar 200 con `access_token`
- `03 Check Session` → esperar 200
- `06 GET /api/usuarios/me` → esperar 200
- `07 GET /api/roles` → esperar 200

- [ ] **Step 7: Commit**

```bash
git add src/controllers/authController.ts src/controllers/usuarioController.ts src/controllers/rolController.ts src/controllers/rolesController.ts
git commit -m "feat: migrar controladores auth/usuarios/roles a Fastify nativo"
```

---

## Task 9: Migrar Controladores — Grupo Menu (4 archivos) + healthController

**Files:**
- Modify: `src/controllers/menuController.ts`
- Modify: `src/controllers/menuCategoriesController.ts`
- Modify: `src/controllers/descuentoController.ts`
- Modify: `src/controllers/metodoPagoController.ts`
- Modify: `src/controllers/healthController.ts`

- [ ] **Step 1: Migrar `menuController.ts`** — aplicar el patrón de migración.

- [ ] **Step 2: Migrar `menuCategoriesController.ts`** — aplicar el patrón de migración.

- [ ] **Step 3: Migrar `descuentoController.ts`** — aplicar el patrón de migración.

- [ ] **Step 4: Migrar `metodoPagoController.ts`** — aplicar el patrón de migración.

- [ ] **Step 5: Migrar `healthController.ts`**

`healthController.ts` es probablemente simple (solo verifica conexión a BD). Aplicar el patrón y luego actualizar `app.ts` para eliminar el import dinámico de compat:

Después de migrar el controlador, en `app.ts` cambiar:

```typescript
// Eliminar el import dinámico de compat
const { createCompatibilityContext, runExpressHandlers } = await import("./http/compat");
app.get("/api/health", async (request, reply) => {
  const context = createCompatibilityContext(request, reply);
  await runExpressHandlers([checkDatabaseConnection as any], context);
});

// Reemplazar con:
app.get("/api/health", checkDatabaseConnection);
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npm run build 2>&1 | grep -E "(menu|descuento|metodoPago|health)"
```

- [ ] **Step 7: Verificar endpoints**

Postman: `08 GET /api/menu`, `09 GET /api/menu/categorias` → esperar 200.
`GET http://localhost:3001/api/health` → esperar 200.

- [ ] **Step 8: Commit**

```bash
git add src/controllers/menuController.ts src/controllers/menuCategoriesController.ts src/controllers/descuentoController.ts src/controllers/metodoPagoController.ts src/controllers/healthController.ts src/app.ts
git commit -m "feat: migrar controladores menu/descuento/metodoPago/health a Fastify nativo"
```

---

## Task 10: Migrar Controladores — Grupo Pedidos (3 archivos)

**Files:**
- Modify: `src/controllers/pedidoController.ts`
- Modify: `src/controllers/pedidoItemController.ts`
- Modify: `src/controllers/cocinaController.ts`

- [ ] **Step 1: Migrar `pedidoController.ts`** — aplicar el patrón de migración.

- [ ] **Step 2: Migrar `pedidoItemController.ts`** — aplicar el patrón de migración.

- [ ] **Step 3: Migrar `cocinaController.ts`** — aplicar el patrón de migración.

- [ ] **Step 4: Verificar TypeScript**

```bash
npm run build 2>&1 | grep -E "(pedido|cocina)"
```

- [ ] **Step 5: Verificar endpoints**

Postman: `10 GET /api/pedidos` → esperar 200.

- [ ] **Step 6: Commit**

```bash
git add src/controllers/pedidoController.ts src/controllers/pedidoItemController.ts src/controllers/cocinaController.ts
git commit -m "feat: migrar controladores pedidos/cocina a Fastify nativo"
```

---

## Task 11: Migrar Controladores — Grupo Financiero (3 archivos)

**Files:**
- Modify: `src/controllers/cajaController.ts`
- Modify: `src/controllers/gastosController.ts`
- Modify: `src/controllers/reportesController.ts`

- [ ] **Step 1: Migrar `cajaController.ts`** — aplicar el patrón de migración. Es un object-style controller (`cajaController.getAllCajas`), asegurarse de mantener la estructura de objeto.

- [ ] **Step 2: Migrar `gastosController.ts`** — aplicar el patrón. También es object-style.

- [ ] **Step 3: Migrar `reportesController.ts`** — aplicar el patrón. Este archivo ya usa `PreviewRequestBody` como tipo, adaptar los demás handlers de la misma forma.

- [ ] **Step 4: Verificar TypeScript**

```bash
npm run build 2>&1 | grep -E "(caja|gastos|reportes)"
```

- [ ] **Step 5: Verificar endpoints**

Postman: `13 GET /api/caja/estado`, `14 GET /api/gastos`, `15 GET /api/reportes/ventas` → esperar 200.

- [ ] **Step 6: Commit**

```bash
git add src/controllers/cajaController.ts src/controllers/gastosController.ts src/controllers/reportesController.ts
git commit -m "feat: migrar controladores caja/gastos/reportes a Fastify nativo"
```

---

## Task 12: Migrar Controladores — Grupo Operaciones (5 archivos)

**Files:**
- Modify: `src/controllers/inventarioController.ts`
- Modify: `src/controllers/clienteController.ts`
- Modify: `src/controllers/restauranteController.ts`
- Modify: `src/controllers/notificacionesController.ts`
- Modify: `src/controllers/invitacionController.ts`

- [ ] **Step 1: Migrar `inventarioController.ts`** — aplicar el patrón de migración.

- [ ] **Step 2: Migrar `clienteController.ts`** — aplicar el patrón de migración.

- [ ] **Step 3: Migrar `restauranteController.ts`** — aplicar el patrón de migración.

- [ ] **Step 4: Migrar `notificacionesController.ts`** — aplicar el patrón de migración.

- [ ] **Step 5: Migrar `invitacionController.ts`** — aplicar el patrón de migración.

- [ ] **Step 6: Verificar TypeScript**

```bash
npm run build 2>&1 | grep -E "(inventario|cliente|restaurante|notificaciones|invitacion)"
```

- [ ] **Step 7: Verificar endpoints**

Postman: `11 GET /api/clientes`, `12 GET /api/inventario`, `17 GET /api/notificaciones` → esperar 200.

- [ ] **Step 8: Commit**

```bash
git add src/controllers/inventarioController.ts src/controllers/clienteController.ts src/controllers/restauranteController.ts src/controllers/notificacionesController.ts src/controllers/invitacionController.ts
git commit -m "feat: migrar controladores inventario/clientes/restaurante/notificaciones/invitaciones a Fastify nativo"
```

---

## Task 13: Migrar Controladores — Grupo Misc (4 archivos)

**Files:**
- Modify: `src/controllers/facturacionController.ts`
- Modify: `src/controllers/scanSessionController.ts`
- Modify: `src/controllers/unidadesMedidaController.ts`
- Modify: `src/controllers/uploadsController.ts`

- [ ] **Step 1: Migrar `facturacionController.ts`** — aplicar el patrón. Es object-style.

- [ ] **Step 2: Migrar `scanSessionController.ts`** — aplicar el patrón.

- [ ] **Step 3: Migrar `unidadesMedidaController.ts`** — aplicar el patrón.

- [ ] **Step 4: Migrar `uploadsController.ts`** — requiere pasos extra:

Reemplazar el import de `UploadedFile`:
```typescript
// Eliminar:
import { UploadedFile } from "express-fileupload";

// El tipo ya está disponible desde src/utils/multipart.ts:
import type { UploadedFile } from "../utils/multipart";
```

Luego aplicar el patrón estándar de migración. Los `req.files.file as UploadedFile` se convierten en `(request.files as any)?.file as UploadedFile`.

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run build 2>&1 | grep -E "(facturacion|scanSession|unidadesMedida|uploads)"
```

- [ ] **Step 6: Verificar endpoints**

Postman: `16 GET /api/facturacion/facturas` → esperar 200.

- [ ] **Step 7: Commit**

```bash
git add src/controllers/facturacionController.ts src/controllers/scanSessionController.ts src/controllers/unidadesMedidaController.ts src/controllers/uploadsController.ts
git commit -m "feat: migrar controladores facturación/scan/unidades/uploads a Fastify nativo"
```

---

## Task 14: Build Completo y Limpieza

**Files:**
- Delete: `src/http/compat.ts`
- Delete: `src/routes/` (directorio completo)
- Delete: `src/types/express.d.ts`
- Delete: `src/types/express.ts`
- Delete: `src/types/express/` (directorio)
- Modify: `package.json`

- [ ] **Step 1: Verificar que el build pasa con todos los controladores migrados**

```bash
cd ezorder_backend-main
npm run build
```

Esperar: `0 errors`. Si hay errores, corregirlos antes de continuar.

- [ ] **Step 2: Eliminar `src/http/compat.ts`**

```bash
rm src/http/compat.ts
```

- [ ] **Step 3: Verificar que nada importa compat.ts (incluyendo imports dinámicos)**

```bash
grep -r "compat" src/
```

Esperar: sin resultados. Si hay referencias remanentes (incluyendo `await import("./http/compat")`), corregirlas antes de eliminar el archivo.

- [ ] **Step 4: Eliminar el directorio `src/routes/`**

```bash
rm -rf src/routes/
```

- [ ] **Step 5: Eliminar archivos de tipos Express**

```bash
rm -f src/types/express.d.ts src/types/express.ts
rm -rf src/types/express/
```

- [ ] **Step 6: Verificar que nada importa tipos Express**

```bash
grep -r "from.*express" src/
```

Esperar: sin resultados (salvo posibles imports de Supabase que no son Express).

- [ ] **Step 7: Limpiar dependencias en `package.json`**

En `package.json`, eliminar de `devDependencies`:
- `"@types/express": "^5.0.1"`
- `"@types/express-fileupload": "^1.5.1"`

Verificar también si `express-fileupload` existe en `dependencies` (no solo devDependencies) y eliminarlo si aparece, ya que `compat.ts` era el único archivo que lo importaba y ahora está eliminado.

```bash
npm uninstall express-fileupload @types/express @types/express-fileupload 2>/dev/null || true
```

- [ ] **Step 8: Build final**

```bash
npm run build
```

Esperar: `0 errors`, build exitoso en `dist/`.

- [ ] **Step 9: Commit de limpieza**

```bash
git add -A
git commit -m "chore: eliminar compat.ts, rutas Express muertas y tipos Express — migración completada"
```

---

## Task 15: Verificación Final con Postman

- [ ] **Step 1: Levantar el servidor en modo dev**

```bash
npm run dev
```

Esperar: servidor levanta sin errores en puerto 3001.

- [ ] **Step 2: Ejecutar la colección Postman completa**

En Postman:
1. Seleccionar entorno "EZOrder Local"
2. Correr `02 Login` primero para obtener `access_token`
3. Correr todos los 17 requests de la colección

Verificar para cada request:
- El HTTP status code es el mismo que en el baseline
- La estructura del response (campos `ok`, `data`, `message`) es la misma
- No hay errores 500 inesperados

- [ ] **Step 3: Probar el endpoint de health directamente**

```bash
curl http://localhost:3001/api/health
```

Esperar: `{"ok": true, ...}` o similar.

- [ ] **Step 4: Confirmar que TypeScript compila en modo producción**

```bash
npm run build && echo "BUILD OK"
```

Esperar: `BUILD OK`.

- [ ] **Step 5: Decisión sobre `postman_collection.json`**

Decidir si mantener o eliminar la colección Postman. Recomendación: mantener como documentación de la API.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "chore: verificación final completada — migración Express→Fastify nativo exitosa"
```

---

## Referencia Rápida: Patrón de Migración por Controlador

Para cada uno de los 24 controladores, aplicar mecánicamente:

| Buscar | Reemplazar |
|--------|-----------|
| `import { Request, Response } from "express"` | `import type { FastifyRequest, FastifyReply } from "fastify"` |
| `import { Request, Response, NextFunction } from "express"` | `import type { FastifyRequest, FastifyReply } from "fastify"` |
| `import "../types/express"` | *(eliminar línea)* |
| `(req: Request, res: Response)` | `(request: FastifyRequest, reply: FastifyReply)` |
| `req.body` | `(request.body as any)` ó cast al tipo específico |
| `req.params` | `(request.params as any)` ó cast al tipo específico |
| `req.query` | `(request.query as any)` ó cast al tipo específico |
| `req.headers` | `request.headers` |
| `req.user_info` | `request.user_info` |
| `req.user` | `request.user` |
| `req.files` | `request.files` |
| `req.restaurante_filter` | `request.restaurante_filter` |
| `res.json({` | `reply.send({` |
| `res.status(X).json({` | `reply.code(X).send({` |
| `return res.status(X).json({` | `return reply.code(X).send({` |
| `res.status(X).json({...}); return;` | `return reply.code(X).send({...});` |
