# Spec: Migración Completa a Fastify Nativo

**Fecha:** 2026-03-22
**Proyecto:** EZOrder Backend (`ezorder_backend-main`)
**Objetivo:** Eliminar la capa de compatibilidad Express→Fastify y migrar todos los controladores y middlewares a Fastify 5 nativo, manteniendo toda la lógica de negocio intacta.

---

## Contexto

El backend fue migrado de Express 5 a Fastify 5, pero la migración quedó incompleta. Actualmente existe una capa de compatibilidad (`src/http/compat.ts`) que simula la API de Express (Request/Response/NextFunction) sobre Fastify, permitiendo que los 27 controladores y 2 middlewares originales funcionen sin cambios. Esto genera deuda técnica: código muerto, tipos incorrectos, y pérdida de los beneficios de Fastify.

---

## Alcance

### Archivos a crear
- `src/types/fastify.d.ts` — Augmentación de tipos Fastify con propiedades custom del request

### Archivos a modificar
- `src/app.ts` — Agregar decoradores de request + migrar ruta `/api/health` hardcodeada
- `src/http/registerRoutes.ts` — Separar `preHandler[]` de `handler` por ruta; reescribir `multipartUploadMiddleware`
- `src/middlewares/auth.ts` — Convertir `requireAuth` a preHandler Fastify
- `src/middlewares/permissions.ts` — Convertir `requirePermissions`, `requireSuperAdmin` y `restaurantScope` a preHandler Fastify
- 25 controladores en `src/controllers/` (incluye `healthController.ts`) — Reemplazar tipos y métodos Express por Fastify
- `src/controllers/uploadsController.ts` — Reemplazar `UploadedFile` de `express-fileupload` por tipo local
- `package.json` — Eliminar `@types/express`, `@types/express-fileupload` de devDependencies

### Archivos a eliminar
- `src/http/compat.ts` — Capa de compatibilidad (ya no necesaria)
- `src/routes/*.ts` — 22 archivos de rutas Express sin usar (código muerto)
- `src/types/express.d.ts` — Augmentación de tipos Express (reemplazada por fastify.d.ts)

### Fuera de alcance
- Lógica de negocio (stores, services, supabase) — no se toca
- Estructura de rutas y permisos — no cambia
- Contratos de API (payloads de request/response) — no cambian

---

## Fase 1 — Colección Postman (Baseline)

Crear `postman_collection.json` en la raíz del backend con flujos críticos antes de cualquier cambio de código. Esta colección establece el comportamiento esperado y sirve para verificar la migración.

### Entorno Postman
```json
{
  "base_url": "http://localhost:3001",
  "access_token": "",
  "refresh_token": "",
  "restaurante_id": ""
}
```

### Flujos incluidos

**Auth (5 requests):**
1. `POST /api/auth/register` — Registro con email/password
2. `POST /api/auth/login` — Login → guarda `access_token` y `refresh_token` automáticamente
3. `GET /api/auth/session` — Verificar sesión activa (Bearer token)
4. `POST /api/auth/refresh` — Renovar token
5. `POST /api/auth/logout` — Cerrar sesión

**Un endpoint representativo por módulo (todos con Bearer token):**
6. `GET /api/usuarios/me` — Perfil del usuario autenticado
7. `GET /api/roles` — Listar roles
8. `GET /api/menu` — Listar items de menú
9. `GET /api/menu/categorias` — Categorías del menú
10. `GET /api/pedidos` — Listar pedidos
11. `GET /api/clientes` — Listar clientes
12. `GET /api/inventario` — Listar inventario
13. `GET /api/caja/estado` — Estado actual de caja
14. `GET /api/gastos` — Listar gastos
15. `GET /api/reportes/ventas` — Reporte de ventas
16. `GET /api/facturacion/facturas` — Listar facturas
17. `GET /api/notificaciones` — Listar notificaciones

---

## Fase 2 — Migración a Fastify Nativo

### 2.1 Tipos: `src/types/fastify.d.ts` (nuevo)

Reemplaza el augment de `Express.Request` por augment de `FastifyRequest`:

```typescript
import { User } from "@supabase/supabase-js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    user_info?: any;
    restaurante_filter?: string;
    files?: Record<string, any>;
  }
}
```

### 2.2 Decoradores en `src/app.ts`

Fastify requiere declarar explícitamente las propiedades custom antes de asignarlas en hooks. Fastify 5 rechaza `null` como valor por defecto para propiedades de tipo objeto — se debe usar la forma getter:

```typescript
app.decorateRequest("user", { getter: () => null });
app.decorateRequest("user_info", { getter: () => null });
app.decorateRequest("restaurante_filter", { getter: () => undefined });
app.decorateRequest("files", { getter: () => null });
```

Además, la ruta `/api/health` está hardcodeada en `app.ts` usando `createCompatibilityContext` y `runExpressHandlers` directamente. Debe migrarse a Fastify nativo en este mismo archivo:

```typescript
// Antes
app.get("/api/health", async (request, reply) => {
  const ctx = createCompatibilityContext(request, reply);
  await runExpressHandlers([checkDatabaseConnection], ctx);
});

// Después
app.get("/api/health", checkDatabaseConnection);
```

### 2.3 Middlewares → Fastify preHandler

El patrón de conversión es consistente para las tres funciones exportadas por `auth.ts` y `permissions.ts` (`requireAuth`, `requirePermissions`, `requireSuperAdmin`, `restaurantScope`):

```typescript
// Antes (Express)
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!token) {
    res.status(401).json({ ok: false, message: "No autorizado" });
    return;
  }
  req.user_info = userData;
  next();
};

// Después (Fastify)
export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!token) {
    return reply.code(401).send({ ok: false, message: "No autorizado" });
  }
  request.user_info = userData;
  // sin next() — Fastify continúa automáticamente si no se envía reply
};
```

**Importante:** usar siempre `return reply.code(...).send(...)` en una sola expresión para evitar que la ejecución continúe después del early return.

`requirePermissions` y `requireSuperAdmin` siguen siendo factories que retornan un preHandler. `restaurantScope` se convierte a preHandler sin argumentos (mismo patrón que `requireAuth`):

```typescript
export const requirePermissions = (permisos: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => { ... };
};

export const restaurantScope = async (request: FastifyRequest, reply: FastifyReply) => {
  // asigna request.restaurante_filter según request.user_info
};
```

Los bloques `catch` que antes llamaban `res.status(500).json(...)` pueden simplificarse a `throw error` ya que Fastify propaga automáticamente los errores al `setErrorHandler` global definido en `app.ts`.

### 2.4 Controladores (27 archivos)

Sustitución mecánica del mismo patrón en todos los archivos:

| Antes (Express) | Después (Fastify) |
|---|---|
| `import { Request, Response } from "express"` | `import { FastifyRequest, FastifyReply } from "fastify"` |
| `async (req: Request, res: Response)` | `async (request: FastifyRequest, reply: FastifyReply)` |
| `res.json({ ... })` | `reply.send({ ... })` |
| `res.status(201).json({ ... })` | `reply.code(201).send({ ... })` |
| `res.status(401).json({ ... }); return;` | `reply.code(401).send({ ... }); return;` |
| `req.body` | `request.body` |
| `req.params` | `request.params` |
| `req.query` | `request.query` |
| `req.headers` | `request.headers` |
| `req.user_info` | `request.user_info` |
| `req.files` | `request.files` |
| `req.restaurante_filter` | `request.restaurante_filter` |

**Tipado de `request.body`, `request.params` y `request.query`:** Fastify 5 los tipea como `unknown` por defecto. Para evitar errores TypeScript, cada controlador debe hacer un cast explícito al tipo esperado:

```typescript
// Al inicio de cada handler donde se use req.body
const body = request.body as { email: string; password: string };
const params = request.params as { id: string };
const query = request.query as { page?: string; limit?: string };
```

**`uploadsController.ts`:** Este controlador importa `UploadedFile` de `express-fileupload`. Al eliminar esa dependencia, se reemplaza por un tipo local equivalente:

```typescript
// Antes
import { UploadedFile } from "express-fileupload";

// Después
type UploadedFile = { name: string; data: Buffer; mimetype: string; size: number; mv: (path: string) => Promise<void> };
```

### 2.5 `registerRoutes.ts`

Separar los handlers de cada ruta en `preHandler[]` + `handler`:

```typescript
// Antes
{
  method: "GET",
  url: "/api/pedidos",
  handlers: [requireAuth, requirePermissions(["pedidos.ver"]), getPedidos]
}

// Después
{
  method: "GET",
  url: "/api/pedidos",
  preHandler: [requireAuth, requirePermissions(["pedidos.ver"])],
  handler: getPedidos,
}
```

El tipo `RouteDefinition` se actualiza para reflejar la nueva estructura. La función `registerRoute` se simplifica eliminando la invocación de `runExpressHandlers`.

**Handlers inline (`cajaLogger`, `gastosLogger`, `cajaTestRoute`, `gastosTestRoute`):** Estas cuatro funciones inline en `registerRoutes.ts` usan tipos Express (`req`, `res`, `next`). `cajaTestRoute` y `gastosTestRoute` son scaffolding de debug y deben **eliminarse**. `cajaLogger` y `gastosLogger` deben reescribirse como preHandlers Fastify nativos:

```typescript
// Antes
const cajaLogger: ExpressLikeHandler = (req, res, next) => {
  console.log(`[Caja] ${req.method} ${req.originalUrl}`);
  next();
};

// Después
const cajaLogger = async (request: FastifyRequest) => {
  console.log(`[Caja] ${request.method} ${request.url}`);
  // sin next() ni reply — solo logging
};
```

**`multipartUploadMiddleware`:** Este inline handler en `registerRoutes.ts` llama a `parseMultipartRequest` de `compat.ts`. Antes de eliminar `compat.ts`, extraer `parseMultipartRequest` a `src/utils/multipart.ts` y actualizar el inline handler a Fastify nativo:

```typescript
// preHandler para rutas con uploads
const multipartPreHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { body, files } = await parseMultipartRequest(request);
  request.body = body;
  request.files = files;
};
```

---

## Fase 3 — Limpieza

Una vez verificada la migración:

1. Eliminar `src/http/compat.ts` (ya no necesaria — `parseMultipartRequest` fue extraída)
2. Eliminar directorio `src/routes/` completo (22 archivos muertos)
3. Eliminar todos los archivos de tipos Express (tres archivos):
   - `src/types/express.d.ts`
   - `src/types/express.ts`
   - `src/types/express/index.d.ts`
4. Remover de `package.json` devDependencies:
   - `@types/express`
   - `@types/express-fileupload`
5. Correr `npm run build` para verificar que TypeScript compila sin errores

---

## Fase 4 — Verificación Final

1. Levantar el servidor: `npm run dev`
2. Ejecutar la colección Postman completa
3. Verificar que todos los endpoints responden igual que en el baseline
4. Decisión: conservar o eliminar `postman_collection.json`

---

## Orden de Implementación

1. Crear colección Postman + correr baseline
2. Crear `src/types/fastify.d.ts`
3. Extraer `parseMultipartRequest` de `compat.ts` → `src/utils/multipart.ts`
4. Agregar decoradores en `src/app.ts` + migrar ruta `/api/health`
5. Migrar `src/middlewares/auth.ts`
6. Migrar `src/middlewares/permissions.ts` (incluye `restaurantScope`)
7. Migrar `src/http/registerRoutes.ts` (separar preHandler/handler + `multipartPreHandler`)
8. Migrar 25 controladores (en paralelo, por módulo), incluyendo cast de `body`/`params`/`query`; `healthController.ts` incluido en este paso
9. Migrar `src/controllers/uploadsController.ts` (reemplazar `UploadedFile` de express-fileupload)
10. Limpiar archivos muertos y dependencias
11. Build TypeScript + verificación Postman

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Propiedad custom en request no disponible en TypeScript | Declarar en `fastify.d.ts` + `decorateRequest` en app.ts |
| `reply.send()` no detiene la ejecución como `res.json()` | Asegurar `return reply.send(...)` en todos los early returns |
| Multipart/files handling | Verificar que `@fastify/multipart` sigue configurado en app.ts |
| TypeScript errors post-migración | Correr `npm run build` después de cada módulo |
