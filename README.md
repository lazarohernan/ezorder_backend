# EZ Order Backend API

Backend API de la aplicación EZ Order construido con Express, TypeScript y Supabase.

## 🚀 Despliegue en Vercel

Este proyecto está configurado para desplegarse como Serverless Functions en Vercel.

### Configuración Requerida

1. **Variables de Entorno**: Configura las siguientes variables en Vercel:
   - `SUPABASE_URL`: URL de tu proyecto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase
   - `SUPABASE_ANON_KEY`: Clave anónima de Supabase
   - `FRONTEND_URL`: URL del frontend (para CORS)
   - `JWT_SECRET`: Secreto para JWT (si aplica)
   - `NODE_ENV`: `production`

2. **Build Command**: Configura en **Project Settings → Build & Development Settings**:
   - Build Command: `npm run vercel-build`
   - Install Command: `npm install`
   - Output Directory: (dejar vacío)

3. **Entry Point**: `api/index.js` (configurado en `vercel.json`)

### Instalación Local

```bash
npm install
npm run dev
```

### Build para Producción

```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
src/
├── controllers/     # Controladores de rutas
├── middlewares/    # Middlewares (auth, permissions)
├── routes/         # Definición de rutas
├── services/       # Servicios de negocio
├── supabase/       # Configuración de Supabase
└── utils/          # Utilidades

api/
└── index.js        # Entry point para Vercel Serverless Functions
```

## 🔧 Tecnologías

- Express.js
- TypeScript
- Supabase
- CORS
- Express File Upload

## 📝 Notas Importantes

- El proyecto se compila a JavaScript en el directorio `dist/`
- El archivo `api/index.js` es el punto de entrada para Vercel Serverless Functions
- Asegúrate de que todas las variables de entorno estén configuradas en Vercel antes del despliegue

