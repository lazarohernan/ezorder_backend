# 🚀 Guía de Despliegue en Vercel

Esta guía explica cómo preparar y desplegar los repositorios de EZ Order en Vercel.

## 📋 Requisitos Previos

1. Cuenta en [Vercel](https://vercel.com)
2. Repositorios en GitHub:
   - Frontend: `https://github.com/lazarohernan/ezorder_frontal.git`
   - Backend: `https://github.com/lazarohernan/ezorder_backend.git`
3. Proyecto Supabase configurado

## 🔧 Configuración del Frontend

### 1. Conectar Repositorio a Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en **"Add New..."** → **"Project"**
3. Selecciona el repositorio `ezorder_frontal`
4. Vercel detectará automáticamente que es un proyecto Vite

### 2. Configurar Variables de Entorno

En la configuración del proyecto, agrega estas variables:

```
VITE_API_URL=https://tu-backend.vercel.app
VITE_SUPABASE_URL=tu-url-supabase
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-supabase
```

### 3. Configuración Automática

El archivo `vercel.json` ya está configurado con:
- ✅ Build command: `npm run build`
- ✅ Output directory: `dist`
- ✅ Rewrites para SPA (Single Page Application)
- ✅ Headers de cache para assets

### 4. Desplegar

Vercel desplegará automáticamente cuando hagas push a la rama `main`.

## 🔧 Configuración del Backend

### 1. Conectar Repositorio a Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en **"Add New..."** → **"Project"**
3. Selecciona el repositorio `ezorder_backend`
4. Vercel detectará que es un proyecto Node.js

### 2. Configurar Variables de Entorno

En la configuración del proyecto, agrega estas variables:

```
SUPABASE_URL=tu-url-supabase
SUPABASE_SERVICE_ROLE_KEY=tu-clave-servicio-supabase
SUPABASE_ANON_KEY=tu-clave-anonima-supabase
FRONTEND_URL=https://tu-frontend.vercel.app
NODE_ENV=production
```

### 3. Configuración de Build

El archivo `vercel.json` está configurado con:
- ✅ Build command: `npm run build` (compila TypeScript)
- ✅ Entry point: `api/index.js` (Serverless Function)
- ✅ Routes: Todas las rutas `/api/*` apuntan a la función

### 4. Desplegar

Vercel desplegará automáticamente cuando hagas push a la rama `main`.

## 📝 Archivos de Configuración Creados

### Frontend (`ez-order-frontend-main/`)
- ✅ `vercel.json` - Configuración de Vercel
- ✅ `.vercelignore` - Archivos a ignorar en el despliegue
- ✅ `README.md` - Documentación del proyecto

### Backend (`ez-order-backend-main/`)
- ✅ `vercel.json` - Configuración de Vercel
- ✅ `api/index.js` - Entry point para Serverless Functions
- ✅ `.vercelignore` - Archivos a ignorar en el despliegue
- ✅ `README.md` - Documentación del proyecto

## 🔄 Flujo de Despliegue

1. **Push a GitHub**: Haz push de tus cambios a la rama `main`
2. **Build Automático**: Vercel detecta el push y ejecuta el build
3. **Deploy**: Vercel despliega automáticamente la nueva versión
4. **Preview**: Cada push genera una URL de preview única
5. **Production**: La rama `main` se despliega a producción

## ⚠️ Notas Importantes

### Frontend
- El frontend es una SPA (Single Page Application), por lo que todas las rutas se redirigen a `index.html`
- Los assets estáticos tienen cache de 1 año para mejor rendimiento
- Asegúrate de configurar `VITE_API_URL` con la URL del backend desplegado

### Backend
- El backend se despliega como Serverless Functions en Vercel
- Cada ruta `/api/*` se maneja como una función serverless
- El archivo `api/index.js` es el punto de entrada único
- Asegúrate de que `FRONTEND_URL` esté configurado correctamente para CORS

## 🐛 Solución de Problemas

### Error: "Build failed"
- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs de build en Vercel Dashboard
- Asegúrate de que `package.json` tenga el script `build` correcto

### Error: "Function timeout"
- Vercel tiene un límite de tiempo para funciones serverless
- Considera optimizar consultas a la base de datos
- Revisa si hay operaciones bloqueantes

### Error: "CORS"
- Verifica que `FRONTEND_URL` en el backend incluya la URL correcta del frontend
- Asegúrate de que las URLs no tengan trailing slash

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Vercel para Vue](https://vercel.com/docs/frameworks/vue)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Configuración de Variables de Entorno](https://vercel.com/docs/projects/environment-variables)

